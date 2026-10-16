import { NextResponse } from "next/server";
import {
  getChainForEnv,
  type ChainEnv,
  type HahaRuntimeConfig,
} from "@/lib/haha-chains";
import { getServerContracts } from "@/lib/haha-contracts";

export const dynamic = "force-dynamic";

function readChainEnv(): ChainEnv {
  // Server-only env (never NEXT_PUBLIC_* — those freeze at build time).
  const raw = (process.env.CHAIN_ENV ?? "").toLowerCase();
  return raw === "mainnet" ? "mainnet" : "testnet";
}

/**
 * Runtime client config. Served at request time (not build time) so one
 * Docker image works for both testnet (46630) and mainnet (4663).
 * No secrets are ever included here — only chain metadata + public
 * contract addresses.
 */
export async function GET() {
  const chainEnv = readChainEnv();
  const chain = getChainForEnv(chainEnv);
  const contracts = getServerContracts();

  const body: HahaRuntimeConfig & {
    contracts: Record<string, string>;
  } = {
    chainEnv,
    chainId: chain.id,
    chainName: chain.name,
    explorerUrl: chain.blockExplorers?.default.url ?? "",
    contracts: { ...contracts },
  };

  return NextResponse.json(body, {
    headers: { "cache-control": "no-store" },
  });
}
