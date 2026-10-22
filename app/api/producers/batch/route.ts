import { NextResponse } from "next/server";
import { getPrisma, readChainEnv } from "@/lib/server";
import { getChainForEnv } from "@/lib/haha-chains";
import { buildChainDataScope } from "@/lib/chain-data-scope";
import { Prisma } from "@prisma/client";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const scope = buildChainDataScope(getChainForEnv(readChainEnv()).id);
    const batch = await getPrisma().vaultSnapshot.findFirst({ where: { ...scope.batchSnapshots, contributors_json: { not: Prisma.DbNull } }, orderBy: { created_at: "desc" }, select: { id: true, entry_count: true } });
    if (!batch) return NextResponse.json({ error: "no royalty-bound snapshot available" }, { status: 404 });
    return NextResponse.json({ batchId: batch.id, entries: batch.entry_count }, { headers: { "cache-control": "no-store" } });
  } catch { return NextResponse.json({ error: "snapshot unavailable" }, { status: 503 }); }
}
