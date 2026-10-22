import { NextResponse } from "next/server";
import {
  bad,
  enqueueJob,
  getPrisma,
  isColluding,
  requireWalletSession,
  shuffleInPlace,
  TIER_WEIGHT,
} from "@/lib/server";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 64 * 1024;

// POST /api/bits/[id]/verdict {wallet, verdict: got_it|missed_it, answer?, explanation?}
// got_it -> bombed. missed_it -> one ComedianReveal (reject second) + disputed
// + 5 blind CrowdAssignments (author & colluding jurors excluded, position_ai randomized,
// vote_weight snapshotted by tier) + BullMQ normalize job.
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!id) return bad("missing id", 400);

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
  const verdict = typeof b.verdict === "string" ? b.verdict : "";
  if (verdict !== "got_it" && verdict !== "missed_it") {
    return bad("verdict must be got_it or missed_it", 400);
  }

  try {
    const prisma = getPrisma();
    const auth = await requireWalletSession(req, prisma, wallet);
    if (!auth.ok) return auth.response;

    const bit = await prisma.bit.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        user_id: true,
        ai_answer: { select: { id: true } },
        user: {
          select: {
            id: true,
            wallet: true,
            device_hash: true,
            ip_subnet: true,
            funding_source: true,
          },
        },
      },
    });
    if (!bit) return bad("bit not found", 404);
    if (bit.user.wallet.toLowerCase() !== wallet) {
      return bad("only the author can submit the verdict", 403);
    }
    if (bit.status !== "answered") {
      return bad(`cannot submit verdict when bit is ${bit.status}`, 409);
    }
    // `answered` is written by prescreen before the Straight Man job stores
    // its output. Never let the author judge an answer that does not exist.
    if (!bit.ai_answer) {
      return bad("the Straight Man has not answered this bit yet", 409);
    }

    if (verdict === "got_it") {
      await prisma.bit.update({
        where: { id },
        data: { status: "bombed" },
      });
      return NextResponse.json(
        { bitId: id, status: "bombed" },
        { headers: { "cache-control": "no-store" } },
      );
    }

    const answer = typeof b.answer === "string" ? b.answer : "";
    const explanation = typeof b.explanation === "string" ? b.explanation : "";
    if (!answer || answer.length > 200) {
      return bad("answer must be 1-200 chars", 400);
    }
    if (!explanation || explanation.length > 400) {
      return bad("explanation must be 1-400 chars", 400);
    }
    const existing = await prisma.comedianReveal.findUnique({
      where: { bit_id: id },
      select: { id: true },
    });
    if (existing) return bad("reveal already submitted", 409);

    await prisma.comedianReveal.create({
      data: { bit_id: id, answer, explanation },
    });

    // 5 blind jurors: onboarded real wallets, not the author or colluding
    // accounts. Seed/probe wallets (0x000...xxxx) are excluded; they are
    // fixtures, not people, and would hold assignments forever.
    const rawCandidates = await prisma.user.findMany({
      where: {
        onboarding_passed: true,
        id: { not: bit.user_id },
        NOT: { wallet: { startsWith: "0x000000000000000000000000" } },
      },
      select: {
        id: true,
        crowd_tier: true,
        device_hash: true,
        ip_subnet: true,
        funding_source: true,
      },
      take: 50,
    });
    const candidates = rawCandidates.filter((c) => !isColluding(bit.user, c));
    shuffleInPlace(candidates);
    const picked = candidates.slice(0, 5);
    const expires_at = new Date(Date.now() + 30 * 60 * 1000); // SLA 30 min (plan §7)
    await prisma.$transaction(
      picked.map((j) =>
        prisma.crowdAssignment.create({
          data: {
            bit_id: id,
            juror_id: j.id,
            vote_weight: TIER_WEIGHT[j.crowd_tier] ?? 1.0,
            position_ai: Math.random() < 0.5 ? "A" : "B",
            expires_at,
          },
        }),
      ),
    );
    await prisma.bit.update({
      where: { id },
      data: { status: "disputed" },
    });

    const normJob = await enqueueJob("bits", "normalize", { bitId: id });
    return NextResponse.json(
      {
        bitId: id,
        status: "disputed",
        jurors: picked.length,
        normalizeQueued: normJob.queued,
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return bad("verdict unavailable", 503);
  }
}
