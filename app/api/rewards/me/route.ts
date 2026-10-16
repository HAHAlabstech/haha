import { NextResponse } from "next/server";
import { getServerContracts } from "@/lib/haha-contracts";

export const dynamic = "force-dynamic";

// GET /api/rewards/me?account=0x... (alias: ?wallet=0x...)
// Returns aggregate cumulative micro-USDG + latest Merkle proof for TipJar.claim().
// Aggregation is cross-epoch AND cross-role per wallet (matches the Merkle leaf).
// 404 when no rewards yet or DB unreachable — the page treats that as empty state.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("account") ?? searchParams.get("wallet") ?? "";
  const wallet = raw.toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(wallet)) {
    return NextResponse.json({ error: "invalid account" }, { status: 400 });
  }
  try {
    const { PrismaClient } = await import("@prisma/client");
    const g = globalThis as unknown as { __hahaPrisma?: InstanceType<typeof PrismaClient> };
    g.__hahaPrisma ??= new PrismaClient();
    const prisma = g.__hahaPrisma;
    const user = await prisma.user.findUnique({
      where: { wallet },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: "no rewards" }, { status: 404 });
    }
    const rewards = await prisma.reward.findMany({
      where: { user_id: user.id },
      orderBy: [{ created_at: "asc" }],
      select: { amount_micro_usdg: true, merkle_proof: true, epoch_id: true },
    });
    if (rewards.length === 0) {
      return NextResponse.json({ error: "no rewards" }, { status: 404 });
    }
    let cumulative = 0n;
    for (const r of rewards) cumulative += BigInt(r.amount_micro_usdg);
    const latest = rewards[rewards.length - 1] as (typeof rewards)[number];
    const proof =
      latest.merkle_proof != null &&
      typeof latest.merkle_proof === "object" &&
      Array.isArray((latest.merkle_proof as { proof?: unknown }).proof)
        ? ((latest.merkle_proof as { proof: string[] }).proof as `0x${string}`[])
        : [];
    const { tipJar } = getServerContracts();
    return NextResponse.json(
      {
        cumulativeMicroUsdg: cumulative.toString(),
        proof,
        tipJar,
        epochs: rewards.length,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "rewards unavailable" }, { status: 503 });
  }
}
