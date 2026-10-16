import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function cronAuth(req: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "cron not configured" }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}

// POST /api/cron/season-upgrade — thin enqueue ack; the BullMQ worker owns execution.
export async function POST(req: Request) {
  const denied = cronAuth(req);
  if (denied) return denied;
  // TODO(worker): enqueue seasonUpgrade job (worker/jobs/seasonUpgrade.js).
  return NextResponse.json(
    { accepted: true, job: "season-upgrade" },
    { headers: { "cache-control": "no-store" } },
  );
}
