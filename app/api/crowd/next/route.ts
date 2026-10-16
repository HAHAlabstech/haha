import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const dynamic = "force-dynamic";

function getPrisma(): PrismaClient {
  const g = globalThis as unknown as { __hahaPrisma?: PrismaClient };
  g.__hahaPrisma ??= new PrismaClient();
  return g.__hahaPrisma;
}

// GET /api/crowd/next?wallet=0x...
// Returns one open assignment for the juror, blind A/B style: the two texts
// (AI answer vs comedian reveal, normalized or raw) under labels A/B with NO
// source labels. Excludes own bits, same device/ip/funding authors, and
// already-voted or expired assignments. SKIP LOCKED style: orderBy + take 1.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = (searchParams.get("wallet") ?? "").toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(wallet)) {
    return NextResponse.json({ error: "invalid wallet" }, { status: 400 });
  }
  try {
    const prisma = getPrisma();
    const juror = await prisma.user.findUnique({
      where: { wallet },
      select: {
        id: true,
        device_hash: true,
        ip_subnet: true,
        funding_source: true,
      },
    });
    if (!juror) {
      return NextResponse.json({ error: "unknown juror" }, { status: 404 });
    }
    // SKIP LOCKED style: earliest-expiring open assignment first.
    const candidates = await prisma.crowdAssignment.findMany({
      where: {
        juror_id: juror.id,
        vote: null,
        expires_at: { gt: new Date() },
      },
      orderBy: { expires_at: "asc" },
      take: 10,
      include: {
        bit: {
          include: {
            ai_answer: true,
            comedian_reveal: true,
            user: {
              select: {
                id: true,
                device_hash: true,
                ip_subnet: true,
                funding_source: true,
              },
            },
          },
        },
      },
    });
    const pick = candidates.find((c) => {
      if (c.bit.user_id === juror.id) return false;
      const author = c.bit.user;
      if (
        juror.device_hash &&
        author.device_hash &&
        juror.device_hash === author.device_hash
      ) {
        return false;
      }
      if (
        juror.ip_subnet &&
        author.ip_subnet &&
        juror.ip_subnet === author.ip_subnet
      ) {
        return false;
      }
      if (
        juror.funding_source &&
        author.funding_source &&
        juror.funding_source === author.funding_source
      ) {
        return false;
      }
      return true;
    });
    if (!pick) {
      return NextResponse.json(
        { error: "no assignments" },
        {
          status: 404,
          headers: { "cache-control": "no-store" },
        },
      );
    }
    const aiText =
      pick.bit.ai_answer?.normalized_text ??
      pick.bit.ai_answer?.answer ??
      "";
    const comicText =
      pick.bit.comedian_reveal?.normalized_text ??
      pick.bit.comedian_reveal?.answer ??
      "";
    // Blind: position_ai decides which source sits under A vs B. Never leak it.
    const options =
      pick.position_ai === "A"
        ? { A: aiText, B: comicText }
        : { A: comicText, B: aiText };
    return NextResponse.json(
      {
        assignmentId: pick.id,
        bitId: pick.bit_id,
        category: pick.bit.category,
        scenario: pick.bit.scenario,
        question: pick.bit.question,
        isRetrial: pick.is_retrial,
        round: pick.round,
        options,
        expiresAt: pick.expires_at.toISOString(),
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "crowd queue unavailable" },
      { status: 503 },
    );
  }
}
