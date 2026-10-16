import { defineChain } from "viem";

/**
 * Robinhood Chain network definitions (viem `defineChain`).
 *
 * - Testnet: chain id 46630, primary RPC PublicNode
 *   https://robinhood-sepolia-rpc.publicnode.com
 * - Mainnet: chain id 4663, primary RPC PublicNode
 *   https://robinhood-rpc.publicnode.com
 *
 * These URLs are public endpoints (no API key). Any keyed upstream
 * (e.g. Alchemy) lives server-side only and is proxied via /api/rpc —
 * never via NEXT_PUBLIC_*.
 */

export const robinhoodTestnet = defineChain({
  id: 46_630,
  name: "Robinhood Chain Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        "https://robinhood-sepolia-rpc.publicnode.com",
        "https://rpc.testnet.chain.robinhood.com",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "Robinhood Testnet Explorer",
      url: "https://explorer.testnet.chain.robinhood.com",
    },
  },
  testnet: true,
});

export const robinhoodMainnet = defineChain({
  id: 4_663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        "https://robinhood-rpc.publicnode.com",
        "https://rpc.mainnet.chain.robinhood.com",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "Robinhood Chain Explorer",
      url: "https://robinhoodchain.blockscout.com",
    },
  },
});

export type ChainEnv = "testnet" | "mainnet";

export const HAHA_CHAIN_IDS = {
  testnet: robinhoodTestnet.id,
  mainnet: robinhoodMainnet.id,
} as const;

export function getChainForEnv(env: ChainEnv) {
  return env === "mainnet" ? robinhoodMainnet : robinhoodTestnet;
}

export function getChainById(chainId: number) {
  if (chainId === robinhoodMainnet.id) return robinhoodMainnet;
  if (chainId === robinhoodTestnet.id) return robinhoodTestnet;
  return null;
}

/** Shape of the runtime config served by GET /api/config. */
export interface HahaRuntimeConfig {
  chainEnv: ChainEnv;
  chainId: number;
  chainName: string;
  explorerUrl: string;
}
