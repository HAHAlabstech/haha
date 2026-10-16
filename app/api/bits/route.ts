import { NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { PrismaClient, type Category } from "@prisma/client";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 64 * 1024;
const CATEGORIES = new Set<string>([
  "punchline",
  "subtext",
  "irl",
  "double_meaning",
]);

// Daily bit quota per comedian tier (plus user.bonus_quota).
const DAILY_QUOTA: Record<string, number> = {
  open_mic: 3,
  opener: 5,
  feature: 10,
  headliner: 20,
  legend: 50,
};

function getPrisma(): PrismaClient {
  const g = globalThis as unknown as { __hahaPrisma?: PrismaClient };
  g.__hahaPrisma ??= new PrismaClient();
  return g.__hahaPrisma;
}

function bad(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

/** lower/trim/strip-punctuation/collapse-whitespace normalization. */
function norm(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ");
}

function prismaCode(e: unknown): string | undefined {
  return typeof e === "object" && e !== null && "code" in e
    ? (e as { code?: unknown }).code === "P2002"
      ? "P2002"
      : undefined
    : undefined;
}

async function ensureUser(prisma: PrismaClient, wallet: string) {
  const found = await prisma.user.findUnique({
    where: { wallet },
    select: { id: true, comedian_tier: true, bonus_quota: true },
  });
  if (found) return found;
  for (let attempt = 0; attempt < 3; attempt++) {
    const handle =
      attempt === 0
        ? `anon_${wallet.slice(2, 10)}`
        : `anon_${wallet.slice(2, 8)}${randomBytes(2).toString("hex")}`;
    try {
      return await prisma.user.create({
        data: { wallet, handle },
        select: { id: true, comedian_tier: true, bonus_quota: true },
      });
    } catch (e) {
      if (prismaCode(e) !== "P2002" || attempt === 2) throw e;
    }
  }
  throw new Error("handle allocation failed");
}

async function ensureSeason(prisma: PrismaClient) {
  const active = await prisma.season.findFirst({
    where: { is_active: true },
    select: { id: true },
  });
  if (active) return active;
  const s1 = await prisma.season.findUnique({
    where: { name: "S1" },
    select: { id: true },
  });
  if (s1) return s1;
  try {
    return await prisma.season.create({
      data: {
        name: "S1",
        system_playbook: "HAHA S1 default playbook (stub).",
        is_active: true,
      },
      select: { id: true },
    });
  } catch (e) {
    if (prismaCode(e) === "P2002") {
      const retry = await prisma.season.findUnique({
        where: { name: "S1" },
        select: { id: true },
      });
      if (retry) return retry;
    }
    throw e;
  }
}

// POST /api/bits {wallet, category, stage, scenario<=600, question<=200}
// SIWE stub-check: requires a live SiweSession for the wallet.
// TODO(worker): prescreen + embedding belong in BullMQ (worker/jobs/prescreen.js).
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
  const wallet = (
    typeof b.wallet === "string" ? b.wallet : ""
  ).toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(wallet)) return bad("invalid wallet", 400);
  const category = typeof b.category === "string" ? b.category : "";
  if (!CATEGORIES.has(category)) return bad("invalid category", 400);
  const scenario = typeof b.scenario === "string" ? b.scenario : "";
  const question = typeof b.question === "string" ? b.question : "";
  if (!scenario || scenario.length > 600) {
    return bad("scenario must be 1-600 chars", 400);
  }
  if (!question || question.length > 200) {
    return bad("question must be 1-200 chars", 400);
  }
  const stage =
    typeof b.stage === "string" && b.stage.length > 0 ? b.stage : "open_mic";
  if (stage.length > 32) return bad("invalid stage", 400);

  try {
    const prisma = getPrisma();
    const session = await prisma.siweSession.findFirst({
      where: {
        wallet,
        revoked_at: null,
        expires_at: { gt: new Date() },
      },
      orderBy: { issued_at: "desc" },
      select: { id: true },
    });
    if (!session) return bad("siwe session required", 401);

    const user = await ensureUser(prisma, wallet);
    const dayAgo = new Date(Date.now() - 24 * 3600 * 1000);
    const used = await prisma.bit.count({
      where: { user_id: user.id, created_at: { gt: dayAgo } },
    });
    const quota = (DAILY_QUOTA[user.comedian_tier] ?? 3) + user.bonus_quota;
    if (used >= quota) return bad("daily quota exceeded", 429);

    const content_hash = createHash("sha256")
      .update(`${category}:${norm(scenario)}|${norm(question)}`)
      .digest("hex");
    const dupe = await prisma.bit.findUnique({
      where: { content_hash },
      select: { id: true },
    });
    if (dupe) return bad("duplicate bit", 409);

    const season = await ensureSeason(prisma);
    const bit = await prisma.bit.create({
      data: {
        user_id: user.id,
        category: category as Category,
        stage,
        scenario,
        question,
        status: "screening",
        season_id: season.id,
        content_hash,
      },
      select: { id: true },
    });
    return NextResponse.json(
      { bitId: bit.id },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return bad("bits unavailable", 503);
  }
}
