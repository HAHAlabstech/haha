import { NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { verifyMessage } from "viem";
import {
  bad,
  getPrisma,
  sessionCookieHeader,
  signSessionToken,
} from "@/lib/server";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 64 * 1024;

/** Best-effort Turnstile check. Accepts everything when no secret is configured (pre-launch stub). */
async function checkTurnstile(
  token: unknown,
): Promise<{ ok: boolean; stub: boolean; error?: string }> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) return { ok: true, stub: true };
  if (typeof token !== "string" || token.length === 0) {
    return { ok: false, stub: false, error: "turnstile token required" };
  }
  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ secret, response: token }).toString(),
      },
    );
    const data = (await res.json()) as { success?: boolean };
    if (data.success !== true) {
      return { ok: false, stub: false, error: "turnstile verification failed" };
    }
    return { ok: true, stub: false };
  } catch {
    return { ok: false, stub: false, error: "turnstile check unavailable" };
  }
}

function uniqueHandle(wallet: string, attempt: number): string {
  if (attempt === 0) return `anon_${wallet.slice(2, 10)}`;
  return `anon_${wallet.slice(2, 8)}${randomBytes(2).toString("hex")}`;
}

function deriveIpSubnet(req: Request): string | null {
  const raw =
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null;
  if (!raw) return null;
  const ipv4 = raw.match(/^(\d+\.\d+\.\d+)\.\d+$/);
  if (ipv4?.[1]) return `${ipv4[1]}.0/24`;
  return createHash("sha256").update(raw).digest("hex").slice(0, 16);
}

// POST /api/auth/verify {message, signature, nonce, turnstileToken, deviceHash?}
// Verifies the SIWE signature via viem, checks Turnstile (stub-accepts when
// TURNSTILE_SECRET_KEY is unset), then upserts SiweSession + User and issues
// a signed HttpOnly haha_session cookie.
export async function POST(req: Request) {
  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return bad("Failed to read request body", 400);
  }
  if (raw.length > MAX_BODY_BYTES) return bad("Request too large", 413);

  let body: unknown;
  try {
    body = JSON.parse(raw) as unknown;
  } catch {
    return bad("Invalid JSON", 400);
  }
  const b = body as Record<string, unknown>;
  const message = typeof b.message === "string" ? b.message : "";
  const signature = typeof b.signature === "string" ? b.signature : "";
  const nonce = typeof b.nonce === "string" ? b.nonce : "";
  const deviceHash =
    typeof b.deviceHash === "string" && b.deviceHash.length <= 128
      ? b.deviceHash
      : null;
  if (!message || !signature || !nonce) {
    return bad("message, signature and nonce are required", 400);
  }
  if (!/^0x[0-9a-fA-F]+$/.test(signature)) {
    return bad("invalid signature encoding", 400);
  }

  const turnstile = await checkTurnstile(b.turnstileToken);
  if (!turnstile.ok) return bad(turnstile.error ?? "turnstile failed", 403);

  const addrMatch = message.match(/0x[0-9a-fA-F]{40}/);
  if (!addrMatch?.[0]) return bad("no wallet address in message", 400);
  if (!message.includes(nonce)) return bad("nonce mismatch", 400);
  const address = addrMatch[0] as `0x${string}`;

  let valid = false;
  try {
    valid = await verifyMessage({
      address,
      message,
      signature: signature as `0x${string}`,
    });
  } catch {
    return bad("signature verification error", 401);
  }
  if (!valid) return bad("invalid signature", 401);

  const wallet = address.toLowerCase();
  const expiresAt = new Date(Date.now() + 24 * 3600 * 1000);
  const ipSubnet = deriveIpSubnet(req);

  try {
    const prisma = getPrisma();
    await prisma.siweSession.upsert({
      where: { nonce },
      update: { wallet, expires_at: expiresAt, revoked_at: null },
      create: { wallet, nonce, expires_at: expiresAt },
    });

    let user = await prisma.user.findUnique({
      where: { wallet },
      select: { id: true, handle: true, human_verified_at: true },
    });
    if (!user) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          user = await prisma.user.create({
            data: {
              wallet,
              handle: uniqueHandle(wallet, attempt),
              human_verified_at: new Date(),
              ...(deviceHash ? { device_hash: deviceHash } : {}),
              ...(ipSubnet ? { ip_subnet: ipSubnet } : {}),
            },
            select: { id: true, handle: true, human_verified_at: true },
          });
          break;
        } catch (e) {
          const code =
            typeof e === "object" && e !== null && "code" in e
              ? (e as { code?: unknown }).code
              : undefined;
          if (code !== "P2002" || attempt === 2) throw e;
        }
      }
    } else if (!user.human_verified_at || deviceHash || ipSubnet) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          ...(user.human_verified_at ? {} : { human_verified_at: new Date() }),
          ...(deviceHash ? { device_hash: deviceHash } : {}),
          ...(ipSubnet ? { ip_subnet: ipSubnet } : {}),
        },
      });
    }

    const sessionToken = signSessionToken(wallet, nonce, expiresAt.getTime());
    const res = NextResponse.json(
      {
        wallet,
        handle: user?.handle ?? `anon_${wallet.slice(2, 10)}`,
        sessionToken,
        expiresAt: expiresAt.toISOString(),
        turnstile: turnstile.stub ? "stub-accepted" : "verified",
        ...(turnstile.stub
          ? { warning: "TURNSTILE_SECRET_KEY unset — stub accept" }
          : {}),
      },
      {
        headers: {
          "cache-control": "no-store",
          "set-cookie": sessionCookieHeader(sessionToken),
        },
      },
    );
    return res;
  } catch {
    return bad("auth unavailable", 503);
  }
}
