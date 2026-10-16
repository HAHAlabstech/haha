import {
  getChainById,
  robinhoodMainnet,
  robinhoodTestnet,
  type ChainEnv,
} from "./haha-chains";

/**
 * Raw EIP-6963 wallet layer (no wagmi / rainbowkit / ethers / Privy).
 *
 * - Detects injected providers via EIP-6963 announce/request events.
 * - Connects with `eth_requestAccounts` (raw EIP-1193).
 * - Switches chains with `wallet_switchEthereumChain`, falling back to
 *   `wallet_addEthereumChain` when the chain is unknown (error 4902).
 *
 * This module NEVER handles private keys or secrets — signing happens
 * inside the user's wallet only.
 */

// --- EIP-1193 / EIP-6963 types ---------------------------------------------

export interface Eip1193Provider {
  request: (args: { method: string; params?: unknown }) => Promise<unknown>;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (
    event: string,
    listener: (...args: unknown[]) => void,
  ) => void;
}

export interface Eip6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}

export interface Eip6963ProviderDetail {
  info: Eip6963ProviderInfo;
  provider: Eip1193Provider;
}

interface Eip6963AnnounceEvent extends CustomEvent<Eip6963ProviderDetail> {
  type: "eip6963:announceProvider";
}

// --- Discovery --------------------------------------------------------------

/**
 * Discover EIP-6963 providers. Listens for announcements, then prods
 * wallets to re-announce. Resolves after `timeoutMs` with deduped results.
 * Must be called in the browser (uses `window`).
 */
export function discoverProviders(timeoutMs = 500): Promise<Eip6963ProviderDetail[]> {
  if (typeof window === "undefined") return Promise.resolve([]);
  const seen = new Map<string, Eip6963ProviderDetail>();

  const onAnnounce = (event: Event) => {
    const detail = (event as Eip6963AnnounceEvent).detail;
    if (!detail?.info?.uuid || !detail?.provider) return;
    if (!seen.has(detail.info.uuid)) seen.set(detail.info.uuid, detail);
  };

  window.addEventListener("eip6963:announceProvider", onAnnounce);
  window.dispatchEvent(new Event("eip6963:requestProvider"));

  return new Promise((resolve) => {
    window.setTimeout(() => {
      window.removeEventListener("eip6963:announceProvider", onAnnounce);
      resolve([...seen.values()]);
    }, timeoutMs);
  });
}

/**
 * Legacy fallback: a pre-EIP-6963 `window.ethereum` injection.
 * Returns null on the server or when absent.
 */
export function getLegacyProvider(): Eip1193Provider | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { ethereum?: Eip1193Provider };
  return w.ethereum ?? null;
}

// --- Accounts ---------------------------------------------------------------

export async function getAccounts(
  provider: Eip1193Provider,
): Promise<string[]> {
  const accs = (await provider.request({
    method: "eth_accounts",
  })) as string[];
  return Array.isArray(accs) ? accs : [];
}

export async function connectProvider(
  provider: Eip1193Provider,
): Promise<string[]> {
  const accs = (await provider.request({
    method: "eth_requestAccounts",
  })) as string[];
  return Array.isArray(accs) ? accs : [];
}

export async function getChainId(
  provider: Eip1193Provider,
): Promise<number | null> {
  const hex = (await provider.request({ method: "eth_chainId" })) as string;
  if (typeof hex !== "string") return null;
  const n = Number.parseInt(hex, 16);
  return Number.isNaN(n) ? null : n;
}

// --- Switch-or-add chain ----------------------------------------------------

function chainAddParams(chainId: number) {
  const chain = getChainById(chainId);
  const list =
    chain ??
    (chainId === robinhoodMainnet.id ? robinhoodMainnet : robinhoodTestnet);
  const rpc = list.rpcUrls.default.http[0] ?? "";
  const explorer = list.blockExplorers?.default.url;
  return {
    chainId: `0x${list.id.toString(16)}`,
    chainName: list.name,
    nativeCurrency: { ...list.nativeCurrency },
    rpcUrls: rpc ? [rpc] : [],
    blockExplorerUrls: explorer ? [explorer] : [],
  };
}

/**
 * Switch the wallet to `chainId`; if the wallet doesn't know the chain
 * (error 4902), add it first and retry. Returns the post-switch chain id.
 */
export async function switchOrAddChain(
  provider: Eip1193Provider,
  chainId: number,
): Promise<number> {
  const targetHex = `0x${chainId.toString(16)}`;
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: targetHex }],
    });
  } catch (err: unknown) {
    const code =
      typeof err === "object" && err !== null && "code" in err
        ? (err as { code?: unknown }).code
        : undefined;
    if (code === 4902 || code === -32603) {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [chainAddParams(chainId)],
      });
    } else {
      throw err;
    }
  }
  const current = await getChainId(provider);
  if (current !== chainId) {
    throw new Error(`Wallet is on chain ${current ?? "unknown"}, not ${chainId}`);
  }
  return chainId;
}

/**
 * Connect a provider and ensure it sits on the HAHA chain for `env`.
 * Returns the connected account list.
 */
export async function connectAndEnsureChain(
  provider: Eip1193Provider,
  env: ChainEnv,
  chainId: number,
): Promise<string[]> {
  const accounts = await connectProvider(provider);
  await switchOrAddChain(provider, chainId);
  void env;
  return accounts;
}

// --- Events -----------------------------------------------------------------

export function onAccountsChanged(
  provider: Eip1193Provider,
  listener: (accounts: string[]) => void,
): () => void {
  if (!provider.on) return () => {};
  const wrapped = (...args: unknown[]) => {
    const accs = args[0];
    listener(Array.isArray(accs) ? (accs as string[]) : []);
  };
  provider.on("accountsChanged", wrapped);
  return () => provider.removeListener?.("accountsChanged", wrapped);
}

export function onChainChanged(
  provider: Eip1193Provider,
  listener: (chainId: number | null) => void,
): () => void {
  if (!provider.on) return () => {};
  const wrapped = (...args: unknown[]) => {
    const hex = args[0];
    const n =
      typeof hex === "string" ? Number.parseInt(hex, 16) : Number.NaN;
    listener(Number.isNaN(n) ? null : n);
  };
  provider.on("chainChanged", wrapped);
  return () => provider.removeListener?.("chainChanged", wrapped);
}

// --- Formatting --------------------------------------------------------------

export function truncateAddress(addr: string, chars = 4): string {
  if (!addr.startsWith("0x") || addr.length < 10) return addr;
  return `${addr.slice(0, 2 + chars)}…${addr.slice(-chars)}`;
}
