import type { Address } from "viem";

/**
 * Canonical HAHA contract addresses.
 *
 * Hardcoded defaults below are the source of truth for the client.
 * Server-side env vars (FEE_SPLITTER_ADDRESS, TIPJAR_ADDRESS, …) may
 * override them at runtime via /api/config — see `resolveContracts`.
 * No contract address or RPC key is ever exposed via NEXT_PUBLIC_*.
 */

export interface HahaContracts {
  /** Uniswap v4 PoolManager (canonical v4 deployment). */
  poolManager: Address;
  /** Uniswap v4 PositionManager (canonical v4 deployment). */
  positionManager: Address;
  /** Uniswap v4 StateView (canonical v4 deployment). */
  stateView: Address;
  /** Permit2 (canonical deployment). */
  permit2: Address;
  /** USDG stablecoin (6 decimals). */
  usdg: Address;
  /** HAHA TipJar (cumulative Merkle rewards). Set after deploy. */
  tipJar: Address;
  /** HAHA FeeSplitter (creator-fee recipient). Set after deploy. */
  feeSplitter: Address;
  /** HAHA MicDrop (buyback & burn). Set after deploy. */
  micDrop: Address;
  /** HAHA CrowdStaking. Set after deploy. */
  crowdStaking: Address;
  /** HAHA VaultRegistry. Set after deploy. */
  vaultRegistry: Address;
  /** HAHA ProducerGateway. Set after deploy. */
  producerGateway: Address;
  /** Standalone fixed-supply HAHA token configured at runtime. */
  hahaToken: Address;
}

/** USDG uses 6 decimals — always re-read `decimals()` on-chain; never assume 18. */
export const USDG_DECIMALS = 6;

const ZERO_ADDRESS =
  "0x0000000000000000000000000000000000000000" as Address;

export const HAHA_CONTRACT_DEFAULTS: HahaContracts = {
  poolManager: "0x8366a39CC670B4001A1121B8F6A443a643e40951",
  positionManager: "0x58daec3116aae6d93017baaea7749052e8a04fa7",
  stateView: "0xf3334192d15450cdd385c8b70e03f9a6bd9e673b",
  permit2: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
  usdg: "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168",
  // HAHA-suite contracts: zero until deployed; overridden by server env.
  tipJar: ZERO_ADDRESS,
  feeSplitter: ZERO_ADDRESS,
  micDrop: ZERO_ADDRESS,
  crowdStaking: ZERO_ADDRESS,
  vaultRegistry: ZERO_ADDRESS,
  producerGateway: ZERO_ADDRESS,
  hahaToken: ZERO_ADDRESS,
};

/** Server-env var name per contract key. Read only on the server. */
const CONTRACT_ENV_VARS: Record<keyof HahaContracts, string> = {
  poolManager: "POOL_MANAGER_ADDRESS",
  positionManager: "POSITION_MANAGER_ADDRESS",
  stateView: "STATE_VIEW_ADDRESS",
  permit2: "PERMIT2_ADDRESS",
  usdg: "USDG_ADDRESS",
  tipJar: "TIPJAR_ADDRESS",
  feeSplitter: "FEE_SPLITTER_ADDRESS",
  micDrop: "MICDROP_ADDRESS",
  crowdStaking: "CROWD_STAKING_ADDRESS",
  vaultRegistry: "VAULT_REGISTRY_ADDRESS",
  producerGateway: "PRODUCER_GATEWAY_ADDRESS",
  hahaToken: "HAHA_TOKEN_ADDRESS",
};

function isAddressLike(v: string | undefined): v is Address {
  return typeof v === "string" && /^0x[0-9a-fA-F]{40}$/.test(v);
}

/**
 * Resolve contracts on the SERVER: hardcoded defaults with optional
 * env overrides. Call only in server components / route handlers.
 */
export function getServerContracts(
  env: NodeJS.ProcessEnv = process.env,
): HahaContracts {
  const out: HahaContracts = { ...HAHA_CONTRACT_DEFAULTS };
  (Object.keys(CONTRACT_ENV_VARS) as (keyof HahaContracts)[]).forEach(
    (key) => {
      const raw = env[CONTRACT_ENV_VARS[key]];
      if (isAddressLike(raw)) out[key] = raw;
    },
  );
  if (env.CHAIN_ENV !== "mainnet") {
    if (!isAddressLike(env.USDG_ADDRESS) && isAddressLike(env.TESTNET_MOCK_USDG)) {
      out.usdg = env.TESTNET_MOCK_USDG;
    }
    if (!isAddressLike(env.HAHA_TOKEN_ADDRESS) && isAddressLike(env.TESTNET_MOCK_HAHA)) {
      out.hahaToken = env.TESTNET_MOCK_HAHA;
    }
  }
  return out;
}

/**
 * Resolve contracts on the CLIENT from a runtime overrides object
 * (e.g. fetched from /api/config). Unknown keys are ignored.
 */
export function resolveContracts(
  overrides?: Partial<Record<keyof HahaContracts, string>>,
): HahaContracts {
  const out: HahaContracts = { ...HAHA_CONTRACT_DEFAULTS };
  if (!overrides) return out;
  (Object.keys(CONTRACT_ENV_VARS) as (keyof HahaContracts)[]).forEach(
    (key) => {
      const raw = overrides[key];
      if (isAddressLike(raw)) out[key] = raw;
    },
  );
  return out;
}

/** True once the HAHA suite contract for `key` has a real address. */
export function isDeployed(contracts: HahaContracts, key: keyof HahaContracts) {
  return contracts[key].toLowerCase() !== ZERO_ADDRESS.toLowerCase();
}

/** Minimal TipJar ABI for the claim UI (cumulative Merkle claim). */
export const tipJarAbi = [
  {
    type: "function",
    name: "claim",
    stateMutability: "nonpayable",
    inputs: [
      { name: "account", type: "address" },
      { name: "recipient", type: "address" },
      { name: "cumulativeMicro", type: "uint256" },
      { name: "deadline", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "v", type: "uint8" },
      { name: "r", type: "bytes32" },
      { name: "s", type: "bytes32" },
      { name: "proof", type: "bytes32[]" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "nonces",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "cumulativeClaimed",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "totalPaidOut",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "merkleRoot",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bytes32" }],
  },
  {
    type: "function",
    name: "currentEpoch",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "pendingEpoch",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "pendingEta",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "rootDelay",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "proposeRoot",
    stateMutability: "nonpayable",
    inputs: [
      { name: "epoch", type: "uint256" },
      { name: "newRoot", type: "bytes32" },
      { name: "totalCumulative", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "activateRoot",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
] as const;

/** Minimal ERC-20 ABI slice (USDG/HAHA balance/decimals/approve). */
export const erc20Abi = [
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

/** Minimal ProducerGateway ABI for B2B plan checkout. */
export const producerGatewayAbi = [
  {
    type: "function",
    name: "purchasePlan",
    stateMutability: "nonpayable",
    inputs: [
      { name: "planType", type: "uint8" },
      { name: "amountMicroUsdg", type: "uint256" },
      { name: "orderId", type: "bytes32" },
      { name: "batchId", type: "bytes32" },
    ],
    outputs: [{ name: "derivedBatchId", type: "bytes32" }],
  },
  {
    type: "function",
    name: "planPriceMicro",
    stateMutability: "view",
    inputs: [{ name: "planType", type: "uint8" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

/** Minimal CrowdStaking ABI for juror staking & checks. */
export const crowdStakingAbi = [
  {
    type: "function",
    name: "stakes",
    stateMutability: "view",
    inputs: [{ name: "juror", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "extraBitStake",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "stake",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "initiateUnstake",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "completeUnstake",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
] as const;
