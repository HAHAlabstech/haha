import { NextResponse } from "next/server";
import { getChainForEnv, HAHA_CHAIN_IDS } from "@/lib/haha-chains";
import { getServerContracts, USDG_DECIMALS } from "@/lib/haha-contracts";
import { readChainEnv, serverRpcCall } from "@/lib/server-rpc";

export const dynamic = "force-dynamic";

/**
 * Read-only wallet balances for the wallet menu chip (ETH native +
 * USDG). Served via the server-side RPC fanout — the browser never
 * talks to keyed upstreams, matching /api/rpc policy.
 */

const BALANCE_OF_SELECTOR = "0x70a08231";

function isValidAddress(v: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(v);
}

function bigHexToAmount(hexResult: string, decimals: number, maxFrac: number): string | null {
  if (typeof hexResult !== "string" || !/^0x[0-9a-fA-F]+$/.test(hexResult)) {
    return null;
  }
  try {
    const wei = BigInt(hexResult);
    const base = 10n ** BigInt(decimals);
    const whole = wei / base;
    let frac = (wei % base).toString().padStart(decimals, "0").slice(0, maxFrac);
    frac = frac.replace(/0+$/, "");
    return frac.length > 0 ? `${whole}.${frac}` : `${whole}`;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const address = url.searchParams.get("address") ?? "";
  if (!isValidAddress(address)) {
    return NextResponse.json(
      { ok: false, error: "valid address required" },
      { status: 400 },
    );
  }

  const env = readChainEnv();
  const chain = getChainForEnv(env);
  const contracts = getServerContracts();
  const explorerUrl = chain.blockExplorers?.default.url ?? null;

  const explorer =
    explorerUrl && /^0x[0-9a-fA-F]{40}$/.test(address)
      ? `${explorerUrl}/address/${address}`
      : null;

  const usdg = contracts.usdg;
  const padded = Buffer.from(address.toLowerCase().replace(/^0x/, ""), "hex")
    .toString("hex")
    .padStart(64, "0");

  const [ethRes, usdgRes] = await Promise.allSettled([
    serverRpcCall(env, "eth_getBalance", [address, "latest"], HAHA_CHAIN_IDS[env]),
    serverRpcCall(
      env,
      "eth_call",
      [{ to: usdg, data: `${BALANCE_OF_SELECTOR}${padded}` }, "latest"],
      HAHA_CHAIN_IDS[env],
    ),
  ]);

  const eth =
    ethRes.status === "fulfilled"
      ? bigHexToAmount(ethRes.value as string, 18, 4)
      : null;
  const usdgBalance =
    usdgRes.status === "fulfilled"
      ? bigHexToAmount(usdgRes.value as string, USDG_DECIMALS, 6)
      : null;

  return NextResponse.json(
    {
      ok: true,
      chainEnv: env,
      chainId: HAHA_CHAIN_IDS[env],
      chainName: chain.name,
      explorer,
      usdgToken: usdg,
      eth,
      usdg: usdgBalance,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
