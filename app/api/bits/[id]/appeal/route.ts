import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 64 * 1024;

function getPrisma(): PrismaClient {
  const g = globalThis as unknown as { __hahaPrisma?: PrismaClient };
  g.__hahaPrisma ??= new PrismaClient();
  return g.__hahaPrisma;
}

function bad(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

// POST /api/bits/[id]/appeal {wallet, reason<=500}
// 1 appeal per bit (reject second). Only bombed/heckled_off bits.
// Creates Appeal + 7 retrial CrowdAssignments (is_retrial, round 2,
// excluding round-1 jurors).
// TODO(worker): retrial orchestration + AI-judge verdict move to BullMQ.
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
  const reason = typeof b.reason === "string" ? b.reason : "";
  if (!reason || reason.length > 500) {
    return bad("reason must be 1-500 chars", 400);
  }

  try {
    const prisma = getPrisma();
    const bit = await prisma.bit.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        user_id: true,
        user: { select: { wallet: true } },
      },
    });
    if (!bit) return bad("bit not found", 404);
    if (bit.user.wallet.toLowerCase() !== wallet) {
      return bad("only the author can appeal", 403);
    }
    if (bit.status !== "bombed" && bit.status !== "heckled_off") {
      return bad("only bombed or heckled_off bits can be appealed", 409);
    }
    const prior = await prisma.appeal.findFirst({
      where: { bit_id: id },
      select: { id: true },
    });
    if (prior) return bad("appeal already filed for this bit", 409);

    const round1 = await prisma.crowdAssignment.findMany({
      where: { bit_id: id, round: 1 },
      select: { juror_id: true },
    });
    const excluded = new Set<string>([
      bit.user_id,
      ...round1.map((r) => r.juror_id),
    ]);
    const candidates = await prisma.user.findMany({
      where: {
        onboarding_passed: true,
        id: { notIn: [...excluded] },
      },
      select: { id: true },
      take: 30,
    });
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = candidates[i] as { id: string };
      candidates[i] = candidates[j] as { id: string };
      candidates[j] = tmp;
    }
    const picked = candidates.slice(0, 7);
    const expires_at = new Date(Date.now() + 48 * 3600 * 1000);

    const appeal = await prisma.appeal.create({
      data: {
        bit_id: id,
        user_id: bit.user_id,
        reason,
        retrial_round: 2,
      },
      select: { id: true },
    });
    await prisma.$transaction(
      picked.map((j) =>
        prisma.crowdAssignment.create({
          data: {
            bit_id: id,
            juror_id: j.id,
            is_retrial: true,
            round: 2,
            position_ai: Math.random() < 0.5 ? "A" : "B",
            expires_at,
          },
        }),
      ),
    );
    await prisma.bit.update({
      where: { id },
      data: { retrial_round: 2, status: "disputed" },
    });
    return NextResponse.json(
      { appealId: appeal.id, bitId: id, jurors: picked.length },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return bad("appeal unavailable", 503);
  }
}
