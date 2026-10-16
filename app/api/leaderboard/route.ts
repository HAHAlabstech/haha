import { NextResponse } from "next/server";
import { getPrisma, jsonBig } from "@/lib/server";

export const dynamic = "force-dynamic";

// GET /api/leaderboard -> top comedians (by killed-it bits & reputation) and top crowd jurors (by consensus accuracy & reputation).
export async function GET() {
  try {
    const prisma = getPrisma();
    const [topComedians, topJurors, killedItGroups, voteGroups] =
      await Promise.all([
        prisma.user.findMany({
          orderBy: [{ comedian_rep: "desc" }, { created_at: "asc" }],
          take: 15,
          select: {
            id: true,
            wallet: true,
            handle: true,
            comedian_tier: true,
            comedian_rep: true,
          },
        }),
        prisma.user.findMany({
          orderBy: [{ crowd_rep: "desc" }, { created_at: "asc" }],
          take: 15,
          select: {
            id: true,
            wallet: true,
            handle: true,
            crowd_tier: true,
            crowd_rep: true,
            plant_total: true,
            plant_correct: true,
          },
        }),
        prisma.bit.groupBy({
          by: ["user_id"],
          where: { status: "killed_it" },
          _count: { id: true },
        }),
        prisma.crowdAssignment.groupBy({
          by: ["juror_id"],
          where: { is_plant: false, voted_at: { not: null } },
          _count: { id: true },
        }),
      ]);

    const killedMap = new Map<string, number>();
    for (const g of killedItGroups) killedMap.set(g.user_id, g._count.id);

    const voteMap = new Map<string, number>();
    for (const g of voteGroups) voteMap.set(g.juror_id, g._count.id);

    const comedians = topComedians
      .map((u) => ({
        wallet: u.wallet,
        handle: u.handle,
        comedian_tier: u.comedian_tier,
        comedian_rep: u.comedian_rep,
        killed_it_count: killedMap.get(u.id) ?? 0,
      }))
      .sort(
        (a, b) =>
          b.killed_it_count - a.killed_it_count ||
          b.comedian_rep - a.comedian_rep,
      )
      .slice(0, 10);

    const jurors = topJurors
      .map((u) => ({
        wallet: u.wallet,
        handle: u.handle,
        crowd_tier: u.crowd_tier,
        crowd_rep: u.crowd_rep,
        votes_cast: voteMap.get(u.id) ?? 0,
      }))
      .sort((a, b) => b.crowd_rep - a.crowd_rep || b.votes_cast - a.votes_cast)
      .slice(0, 10);

    return jsonBig({ ok: true, comedians, jurors });
  } catch (err) {
    return NextResponse.json(
      { ok: true, comedians: [], jurors: [], error: (err as Error).message },
      { headers: { "cache-control": "no-store" } },
    );
  }
}
