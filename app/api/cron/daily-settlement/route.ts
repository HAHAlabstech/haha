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

// POST /api/cron/daily-settlement — thin enqueue ack; the BullMQ worker owns execution.
export async function POST(req: Request) {
  const denied = cronAuth(req);
  if (denied) return denied;
  // TODO(worker): enqueue dailySettlement job (worker/jobs/dailySettlement.js).
  return NextResponse.json(
    { accepted: true, job: "daily-settlement" },
    { headers: { "cache-control": "no-store" } },
  );
}
