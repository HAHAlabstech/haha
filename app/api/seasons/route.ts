import { NextResponse } from "next/server";
import { getPrisma, jsonBig } from "@/lib/server";

export const dynamic = "force-dynamic";

const FALLBACK_SEASONS = [
  {
    id: "S1",
    name: "Straight Man S1",
    base_model: "opus-5.5",
    kind: "opus_playbook_max",
    holdout_n: 0,
    holdout_score: 0,
    is_active: true,
    body: "The first playbook. Open Mic bits face a weakened setup; Pro bits face the full model.",
  },
];

// GET /api/seasons -> list all Straight Man seasons from Prisma (with S1 fallback).
export async function GET() {
  try {
    const prisma = getPrisma();
    const rows = await prisma.season.findMany({
      orderBy: { released_at: "desc" },
    });
    if (rows.length === 0) {
      return NextResponse.json(
        { ok: true, seasons: FALLBACK_SEASONS },
        { headers: { "cache-control": "no-store" } },
      );
    }
    const seasons = rows.map((r) => ({
      id: r.id,
      name: r.name,
      base_model: r.base_model,
      kind: r.kind,
      holdout_n: r.holdout_n,
      holdout_score: r.holdout_score,
      is_active: r.is_active,
      released_at: r.released_at,
      notes: r.notes,
      body:
        r.notes ||
        (r.name === "S1" || r.name === "Straight Man S1"
          ? "The first playbook. Open Mic bits face a weakened setup; Pro bits face the full model."
          : `Season ${r.name} compiled playbook (${r.kind} · ${r.base_model}).`),
    }));
    return jsonBig({ ok: true, seasons });
  } catch {
    return NextResponse.json(
      { ok: true, seasons: FALLBACK_SEASONS },
      { headers: { "cache-control": "no-store" } },
    );
  }
}
