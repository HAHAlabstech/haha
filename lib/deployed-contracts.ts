export type ContractCategory = "protocol" | "external_dependency";

export interface DeployedContractEntry {
  readonly name: string;
  readonly symbol: string;
  readonly address: `0x${string}`;
  readonly role: string;
  readonly status: string;
  readonly category: ContractCategory;
}

export const MAINNET_CONTRACTS_CHAIN = {
  id: 4663,
  name: "Robinhood Chain Mainnet",
  explorerUrl: "https://robinhoodchain.blockscout.com",
} as const;

/** Current product contracts only. Retired and HOLD-only deployments are omitted. */
export const ACTIVE_MAINNET_CONTRACTS = [
  {
    name: "HAHA",
    symbol: "HAHA",
    address: "0xd2Da320EF90FB76809587C830A33a49512bA90D9",
    role: "Fixed-supply product token",
    status: "Standalone token · no minting",
    category: "protocol",
  },
  {
    name: "CrowdStaking",
    symbol: "STAKING",
    address: "0xe861a2c5d2114A76779d91d416c750bE7D3f7d88",
    role: "HAHA staking and extra-bit escrow",
    status: "Bound to standalone HAHA",
    category: "protocol",
  },
  {
    name: "TipJar",
    symbol: "USDG CLAIMS",
    address: "0xda4762e4205aFf2d8CB9177cDcE6d69A23068bbE",
    role: "Cumulative Merkle reward claims",
    status: "Claims require verified funding and an activated root",
    category: "protocol",
  },
  {
    name: "ProducerGateway",
    symbol: "B2B GATEWAY",
    address: "0x71826870a70064F0657EF527AFd9d1029Ae950de",
    role: "B2B purchase and reward funding entrypoint",
    status: "Configured for USDG receipts",
    category: "protocol",
  },
  {
    name: "VaultRegistry",
    symbol: "VAULT",
    address: "0x27e5ADf5F3BfEBFA7B7B81619CA68a97CD1866D6",
    role: "On-chain dataset snapshot roots",
    status: "Configured for vault anchoring",
    category: "protocol",
  },
  {
    name: "USDG",
    symbol: "USDG",
    address: "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168",
    role: "Payment and reward token (6 decimals)",
    status: "External contract dependency",
    category: "external_dependency",
  },
] as const satisfies readonly DeployedContractEntry[];

export function getContractExplorerUrl(address: string): string {
  return `${MAINNET_CONTRACTS_CHAIN.explorerUrl}/address/${address}`;
}
