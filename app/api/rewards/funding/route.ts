import { NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { getChainForEnv } from "@/lib/haha-chains";
import { getPrisma, readChainEnv, requireWalletSession } from "@/lib/server";
import { fundingConfig, importFundingReceipt } from "@/worker/lib/funding";

export const dynamic = "force-dynamic";

// Permissionless receipt registration: no caller chooses payout recipients.
// Only configured gateway events backed by real USDG transfers are accepted.
export async function POST(req: Request) {
  try {
    const raw = await req.text();
    if (raw.length > 4096) return NextResponse.json({ error: "request too large" }, { status: 413 });
    const body = JSON.parse(raw);
    if (typeof body.tx_hash !== "string" || !/^0x[0-9a-f]{64}$/i.test(body.tx_hash)) return NextResponse.json({ error: "invalid tx_hash" }, { status: 400 });
    const wallet=typeof body.wallet==="string"?body.wallet.toLowerCase():"";
    if(!/^0x[0-9a-f]{40}$/.test(wallet))return NextResponse.json({error:"wallet required"},{status:400});
    const prisma=getPrisma();
    const auth=await requireWalletSession(req,prisma,wallet);
    if(!auth.ok)return auth.response;
    const env = readChainEnv();
    const chain = getChainForEnv(env);
    const rpc = (env === "mainnet" ? process.env.RPC_URL_MAINNET : process.env.RPC_URL_TESTNET) || chain.rpcUrls.default.http[0];
    const client = createPublicClient({ chain, transport: http(rpc) });
    const tx=await client.getTransaction({hash:body.tx_hash});
    if(tx.from.toLowerCase()!==wallet)return NextResponse.json({error:"transaction signer does not match session"},{status:403});
    const rows = await importFundingReceipt(prisma, client, body.tx_hash, fundingConfig(), typeof body.snapshotId === "string" ? body.snapshotId : null);
    return NextResponse.json({ registered: true, receipts: rows.length, generalMicro: rows.reduce((s, r) => s + r.general_micro_usdg, 0n).toString(), royaltyMicro: rows.reduce((s, r) => s + r.royalty_remaining_micro, 0n).toString() });
  } catch {
    return NextResponse.json({ error: "funding receipt unavailable or not verifiable; no allocation created" }, { status: 422 });
  }
}
