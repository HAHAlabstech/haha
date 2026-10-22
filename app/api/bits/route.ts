import { NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { type PrismaClient, type Category } from "@prisma/client";
import { shareCardUrlForBit } from "@/lib/share-card-state";
import { getChainForEnv } from "@/lib/haha-chains";
import {
  bad,
  enqueueJob,
  getPrisma,
  readChainEnv,
  requireWalletSession,
} from "@/lib/server";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 64 * 1024;
const CATEGORIES = new Set<string>([
  "punchline",
  "subtext",
  "irl",
  "double_meaning",
]);

// Canonical daily bit quota per comedian tier (plan §4.2, plus user.bonus_quota).
const DAILY_QUOTA: Record<string, number> = {
  open_mic: 5,
  opener: 8,
  feature: 12,
  headliner: 18,
  legend: 25,
};

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
    select: { id: true, name: true },
  });
  if (active) return active;
  const s1 = await prisma.season.findUnique({
    where: { name: "S1" },
    select: { id: true, name: true },
  });
  if (s1) return s1;
  try {
    return await prisma.season.create({
      data: {
        name: "S1",
        system_playbook: "HAHA S1 default playbook (stub).",
        is_active: true,
      },
      select: { id: true, name: true },
    });
  } catch (e) {
    if (prismaCode(e) === "P2002") {
      const retry = await prisma.season.findUnique({
        where: { name: "S1" },
        select: { id: true, name: true },
      });
      if (retry) return retry;
    }
    throw e;
  }
}

// GET /api/bits -> recent public non-holdout killed_it bits + daily counts.
export async function GET() {
  try {
    const prisma = getPrisma();
    const chainId = getChainForEnv(readChainEnv()).id;
    const dayAgo = new Date(Date.now() - 24 * 3600 * 1000);
    const [bitsToday, killedToday, spotlight] = await Promise.all([
      prisma.bit.count({ where: { chain_id: chainId, created_at: { gt: dayAgo } } }),
      prisma.bit.count({
        where: { chain_id: chainId, status: "killed_it", created_at: { gt: dayAgo } },
      }),
      prisma.bit.findMany({
        where: {
          chain_id: chainId,
          status: "killed_it",
          is_holdout: false,
          share_public: true,
        },
        orderBy: { created_at: "desc" },
        take: 6,
        select: {
          id: true,
          category: true,
          scenario: true,
          question: true,
          status: true,
          stage: true,
          created_at: true,
          season: { select: { name: true } },
          ai_answer: { select: { answer: true } },
          outcome: { select: { win_strength: true, juror_count: true } },
          share_card_r2_url: true,
        },
      }),
    ]);
    const spotlightOut = spotlight.map(({ share_card_r2_url, ...b }) => ({
      ...b,
      card_url: shareCardUrlForBit({
        status: b.status,
        hasOutcome: b.outcome != null,
        storedUrl: share_card_r2_url,
      }),
    }));
    return NextResponse.json(
      { bitsToday, killedToday, spotlight: spotlightOut },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return bad("bits unavailable", 503);
  }
}

// POST /api/bits {wallet, category, stage, scenario<=600, question<=200}
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
    b.stage === "pro"
      ? "pro"
      : typeof b.stage === "string" && b.stage.length > 0
        ? b.stage
        : "open_mic";
  if (stage.length > 32) return bad("invalid stage", 400);

  try {
    const prisma = getPrisma();
    const chainId = getChainForEnv(readChainEnv()).id;
    const auth = await requireWalletSession(req, prisma, wallet);
    if (!auth.ok) return auth.response;

    const user = await ensureUser(prisma, wallet);
    const dayAgo = new Date(Date.now() - 24 * 3600 * 1000);
    const used = await prisma.bit.count({
      where: { user_id: user.id, created_at: { gt: dayAgo } },
    });
    const quota = (DAILY_QUOTA[user.comedian_tier] ?? 5) + user.bonus_quota;
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
        chain_id: chainId,
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

    const job = await enqueueJob("bits", "prescreen", { bitId: bit.id });
    return NextResponse.json(
      { bitId: bit.id, queued: job.queued, jobId: job.jobId ?? null },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return bad("bits unavailable", 503);
  }
}
