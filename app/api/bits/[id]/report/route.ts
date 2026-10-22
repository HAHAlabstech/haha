import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getChainForEnv } from "@/lib/haha-chains";
import { readChainEnv } from "@/lib/server";

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

// POST /api/bits/[id]/report {reporterId?, reason} -> Report (status open).
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
  const reason = typeof b.reason === "string" ? b.reason : "";
  if (!reason || reason.length > 500) {
    return bad("reason must be 1-500 chars", 400);
  }
  const reporterId =
    typeof b.reporterId === "string" && b.reporterId.length > 0
      ? b.reporterId
      : "anonymous";

  try {
    const prisma = getPrisma();
    const chainId = getChainForEnv(readChainEnv()).id;
    const bit = await prisma.bit.findFirst({
      where: { id, chain_id: chainId },
      select: { id: true },
    });
    if (!bit) return bad("bit not found", 404);
    const report = await prisma.report.create({
      data: {
        bit_id: id,
        reporter_id: reporterId,
        reason,
        status: "open",
      },
      select: { id: true },
    });
    return NextResponse.json(
      { reportId: report.id },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return bad("report unavailable", 503);
  }
}
