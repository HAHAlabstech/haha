import { NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { getChainForEnv, type ChainEnv } from "@/lib/haha-chains";
import {
  erc20Abi,
  getServerContracts,
  isDeployed,
} from "@/lib/haha-contracts";

export const dynamic = "force-dynamic";

function readChainEnv(): ChainEnv {
  const raw = (process.env.CHAIN_ENV ?? "").toLowerCase();
  return raw === "mainnet" ? "mainnet" : "testnet";
}

// GET /api/tipjar/summary -> escrow balances via server-side viem reads
// (best-effort, zeros on failure), launch proof placeholders, and
// feeRecipient / takeover / freeze status fields.
export async function GET() {
  const chainEnv = readChainEnv();
  const chain = getChainForEnv(chainEnv);
  const contracts = getServerContracts();

  let tipJarMicroUsdg = "0";
  let feeSplitterMicroUsdg = "0";
  try {
    const override =
      chainEnv === "mainnet"
        ? process.env.RPC_URL_MAINNET?.trim()
        : process.env.RPC_URL_TESTNET?.trim();
    const rpcUrl =
      override && override.length > 0
        ? override
        : (chain.rpcUrls.default.http[0] as string);
    const client = createPublicClient({
      chain,
      transport: http(rpcUrl),
    });
    const [tipBal, feeBal] = await Promise.all([
      client.readContract({
        address: contracts.tipJar,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [contracts.tipJar],
      }),
      client.readContract({
        address: contracts.usdg,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [contracts.feeSplitter],
      }),
    ]);
    // NOTE: USDG balanceOf the escrow contracts; re-read decimals() on-chain
    // before displaying (USDG uses 6 decimals, never assume 18).
    tipJarMicroUsdg = (tipBal as bigint).toString();
    feeSplitterMicroUsdg = (feeBal as bigint).toString();
  } catch {
    tipJarMicroUsdg = "0";
    feeSplitterMicroUsdg = "0";
  }

  return NextResponse.json(
    {
      chainEnv,
      chainId: chain.id,
      escrow: {
        tipJar: { address: contracts.tipJar, microUsdg: tipJarMicroUsdg },
        feeSplitter: {
          address: contracts.feeSplitter,
          microUsdg: feeSplitterMicroUsdg,
        },
      },
      launched: isDeployed(contracts, "hahaToken"),
      launchProof: { txHash: null, note: "placeholder — set at launch" },
      feeRecipient: contracts.feeSplitter,
      takeoverArmed: false,
      frozen: false,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
