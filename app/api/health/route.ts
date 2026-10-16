import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/health — Caddy/Docker healthcheck + uptime monitor target.
export async function GET() {
  return NextResponse.json(
    { ok: true, service: "haha-app", ts: Date.now() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
