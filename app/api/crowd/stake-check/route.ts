import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/crowd/stake-check?wallet=0x... -> pre-launch allowlist mode.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = (searchParams.get("wallet") ?? "").toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(wallet)) {
    return NextResponse.json({ error: "invalid wallet" }, { status: 400 });
  }
  return NextResponse.json(
    { ok: true, mode: "allowlist", wallet },
    { headers: { "cache-control": "no-store" } },
  );
}
