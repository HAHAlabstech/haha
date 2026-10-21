import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import type { ChainEnv } from "@/lib/haha-chains";

const g = globalThis as unknown as {
  __hahaPrisma?: PrismaClient;
  __hahaQueues?: Map<string, import("bullmq").Queue>;
};

export function getPrisma(): PrismaClient {
  if (!g.__hahaPrisma) g.__hahaPrisma = new PrismaClient();
  return g.__hahaPrisma;
}

export function bad(error: string, status = 400): NextResponse {
  return NextResponse.json(
    { error },
    { status, headers: { "cache-control": "no-store" } },
  );
}

export function jsonBig(data: unknown, status = 200): NextResponse {
  const body = JSON.stringify(data, (_k, v) =>
    typeof v === "bigint" ? v.toString() : v,
  );
  return new NextResponse(body, {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export function readChainEnv(): ChainEnv {
  const raw = process.env.CHAIN_ENV?.trim().toLowerCase();
  return raw === "mainnet" ? "mainnet" : "testnet";
}

function getSessionSecret(): string {
  const s = process.env.SESSION_SECRET?.trim();
  return s && s.length >= 16 ? s : "haha-dev-fallback-session-secret-32b";
}

export function signSessionToken(
  wallet: string,
  nonce: string,
  expiresAtMs: number,
): string {
  const w = wallet.toLowerCase();
  const payload = `${w}.${nonce}.${expiresAtMs}`;
  const mac = createHmac("sha256", getSessionSecret())
    .update(payload)
    .digest("hex");
  return `${payload}.${mac}`;
}

export function sessionCookieHeader(
  token: string,
  maxAgeSec = 24 * 3600,
): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `haha_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}${secure}`;
}

function extractRawToken(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  const headerToken = req.headers.get("x-haha-session")?.trim();
  if (headerToken) return headerToken;

  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === "haha_session" && rest.length > 0) {
      try {
        return decodeURIComponent(rest.join("="));
      } catch {
        return rest.join("=");
      }
    }
  }
  return null;
}

export function verifySignedSessionToken(
  token: string,
  expectedWallet?: string,
): { ok: boolean; wallet?: string; nonce?: string } {
  const parts = token.split(".");
  if (parts.length !== 4) return { ok: false };
  const [wallet, nonce, expStr, sigHex] = parts;
  if (!wallet || !nonce || !expStr || !sigHex) return { ok: false };
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp <= Date.now()) return { ok: false };

  const payload = `${wallet.toLowerCase()}.${nonce}.${expStr}`;
  const expectedMac = createHmac("sha256", getSessionSecret())
    .update(payload)
    .digest("hex");
  const a = Buffer.from(sigHex, "utf8");
  const b = Buffer.from(expectedMac, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false };
  if (expectedWallet && wallet.toLowerCase() !== expectedWallet.toLowerCase()) {
    return { ok: false };
  }
  return { ok: true, wallet: wallet.toLowerCase(), nonce };
}

export async function requireWalletSession(
  req: Request,
  prisma: PrismaClient,
  wallet: string,
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const w = wallet.toLowerCase();
  const rawToken = extractRawToken(req);
  if (!rawToken) {
    // A browser-supplied wallet address is NOT proof of ownership. A server
    // session row alone must never authorize a wallet-bound mutation: the
    // caller has to present the signed session token (cookie or header).
    return {
      ok: false,
      response: bad("active SIWE session required — sign in first", 401),
    };
  }
  const v = verifySignedSessionToken(rawToken, w);
  if (!v.ok) {
    return {
      ok: false,
      response: bad("invalid or expired session token", 401),
    };
  }
  // Keep the DB row check as a revocation gate, not as an authentication
  // substitute. The signed token already proves wallet ownership.
  const session = await prisma.siweSession.findFirst({
    where: {
      wallet: w,
      nonce: v.nonce,
      revoked_at: null,
      expires_at: { gt: new Date() },
    },
    select: { id: true },
  });
  if (!session) {
    return {
      ok: false,
      response: bad("session revoked or expired — sign in again", 401),
    };
  }
  return { ok: true };
}

export const TIER_WEIGHT: Record<string, number> = {
  walk_in: 1.0,
  regular: 1.15,
  front_row: 1.3,
  critic: 1.5,
};

export interface SybilSignals {
  id: string;
  device_hash?: string | null;
  ip_subnet?: string | null;
  funding_source?: string | null;
}

export function isColluding(a: SybilSignals, b: SybilSignals): boolean {
  if (a.id === b.id) return true;
  if (a.device_hash && b.device_hash && a.device_hash === b.device_hash) {
    return true;
  }
  if (a.ip_subnet && b.ip_subnet && a.ip_subnet === b.ip_subnet) {
    return true;
  }
  if (
    a.funding_source &&
    b.funding_source &&
    a.funding_source === b.funding_source
  ) {
    return true;
  }
  return false;
}

export function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

export async function enqueueJob(
  queueName: string,
  jobName: string,
  data: Record<string, unknown>,
): Promise<{ queued: boolean; jobId?: string; reason?: string }> {
  try {
    const { Queue } = await import("bullmq");
    if (!g.__hahaQueues) g.__hahaQueues = new Map();
    let q = g.__hahaQueues.get(queueName);
    if (!q) {
      const redisUrl = process.env.REDIS_URL?.trim() || "redis://localhost:6379";
      q = new Queue(queueName, {
        connection: {
          url: redisUrl,
          maxRetriesPerRequest: 1,
          connectTimeout: 1500,
          enableOfflineQueue: false,
        } as unknown as import("bullmq").ConnectionOptions,
      });
      g.__hahaQueues.set(queueName, q);
    }
    const job = await Promise.race([
      q.add(jobName, data, {
        attempts: 5,
        backoff: { type: "exponential", delay: 30_000 },
        removeOnComplete: 100,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("redis enqueue timeout")), 1800),
      ),
    ]);
    return { queued: true, jobId: job.id };
  } catch (e) {
    return {
      queued: false,
      reason: e instanceof Error ? e.message : "redis unavailable",
    };
  }
}
