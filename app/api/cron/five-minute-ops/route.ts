import { NextResponse } from "next/server";
import { enqueueJob } from "@/lib/server";

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

// POST /api/cron/five-minute-ops — thin enqueue ack; the BullMQ worker owns execution.
export async function POST(req: Request) {
  const denied = cronAuth(req);
  if (denied) return denied;
  const enqueued = await enqueueJob("five-minute-ops", "tick", {
    triggeredAt: new Date().toISOString(),
  });
  return NextResponse.json(
    { accepted: true, enqueued, job: "five-minute-ops" },
    { headers: { "cache-control": "no-store" } },
  );
}

