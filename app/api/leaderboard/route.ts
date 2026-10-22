import { NextResponse } from "next/server";
import { getPrisma, jsonBig } from "@/lib/server";
import { getChainForEnv } from "@/lib/haha-chains";
import { readChainEnv } from "@/lib/server";
import { buildChainDataScope } from "@/lib/chain-data-scope";

export const dynamic = "force-dynamic";

// GET /api/leaderboard -> chain-scoped verified comedians and voted jurors.
export async function GET() {
  try {
    const prisma = getPrisma();
    const scope = buildChainDataScope(getChainForEnv(readChainEnv()).id);
    const [killedItGroups, voteGroups] = await Promise.all([
      prisma.bit.groupBy({
        by: ["user_id"],
        where: scope.killedBits,
        _count: { id: true },
      }),
      prisma.crowdAssignment.groupBy({
        by: ["juror_id"],
        where: scope.votedAssignments,
        _count: { id: true },
      }),
    ]);

    const killedMap = new Map<string, number>();
    for (const g of killedItGroups) killedMap.set(g.user_id, g._count.id);

    const voteMap = new Map<string, number>();
    for (const g of voteGroups) voteMap.set(g.juror_id, g._count.id);

    const comedianIds = [...killedMap.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 10)
      .map(([id]) => id);
    const topComedians = comedianIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: comedianIds } },
          select: { id: true, wallet: true, handle: true },
        })
      : [];
    const comedians = comedianIds
      .map((id) => {
        const u = topComedians.find((x) => x.id === id);
        if (!u) return null;
        return { wallet: u.wallet, handle: u.handle, killed_it_count: killedMap.get(id) ?? 0 };
      })
      .filter(Boolean);

    // Jurors: rank by ACTUAL votes cast (aggregate first), then fetch those
    // users: the crowd_rep-ordered pre-select pushed real voters out of the
    // candidate set entirely (seed wallets fill the take:15 window).
    const jurorIds = [...voteMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id]) => id);
    const topJurors =
      jurorIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: jurorIds } },
            select: {
              id: true,
              wallet: true,
              handle: true,
            },
          })
        : [];
    const jurors = jurorIds
      .map((id) => {
        const u = topJurors.find((x) => x.id === id);
        if (!u) return null;
        return {
          wallet: u.wallet,
          handle: u.handle,
          votes_cast: voteMap.get(id) ?? 0,
        };
      })
      .filter(Boolean);

    return jsonBig({ ok: true, comedians, jurors });
  } catch (err) {
    return NextResponse.json(
      { ok: true, comedians: [], jurors: [], error: (err as Error).message },
      { headers: { "cache-control": "no-store" } },
    );
  }
}
