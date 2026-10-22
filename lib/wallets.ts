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

// --- Shared Wallet + SIWE Session Store --------------------------------------

export interface SharedWalletState {
  account: string | null;
  provider: Eip1193Provider | null;
  label: string | null;
  /** EIP-6963 wallet icon (data URL) captured at connect time. */
  icon: string | null;
  sessionToken: string | null;
}

const STORAGE_ACCOUNT_KEY = "haha_wallet_account";
const STORAGE_LABEL_KEY = "haha_wallet_label";
const STORAGE_ICON_KEY = "haha_wallet_icon";
const STORAGE_SESSION_KEY = "haha_session_token";
const WALLET_EVENT = "haha:wallet-changed";

const sharedState: SharedWalletState = {
  account: null,
  provider: null,
  label: null,
  icon: null,
  sessionToken: null,
};

let hydrated = false;

function hydrateFromStorage() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const acc = window.localStorage.getItem(STORAGE_ACCOUNT_KEY);
    const lbl = window.localStorage.getItem(STORAGE_LABEL_KEY);
    const tok = window.localStorage.getItem(STORAGE_SESSION_KEY);
    if (acc && /^0x[0-9a-fA-F]{40}$/.test(acc)) {
      sharedState.account = acc.toLowerCase();
    }
    if (lbl) sharedState.label = lbl;
    if (tok) sharedState.sessionToken = tok;
    try {
      const icon = window.localStorage.getItem(STORAGE_ICON_KEY);
      if (icon) sharedState.icon = icon;
    } catch {
      // ignore storage errors
    }
  } catch {
    // ignore storage errors
  }
}

export function getSharedWalletState(): SharedWalletState {
  hydrateFromStorage();
  return { ...sharedState };
}

export function setSharedWalletState(
  partial: Partial<SharedWalletState>,
): SharedWalletState {
  hydrateFromStorage();
  if ("account" in partial) {
    sharedState.account = partial.account
      ? partial.account.toLowerCase()
      : null;
  }
  if ("provider" in partial) {
    sharedState.provider = partial.provider ?? null;
  }
  if ("label" in partial) {
    sharedState.label = partial.label ?? null;
  }
  if ("icon" in partial) {
    sharedState.icon = partial.icon ?? null;
  }
  if ("sessionToken" in partial) {
    sharedState.sessionToken = partial.sessionToken ?? null;
  }
  if (typeof window !== "undefined") {
    try {
      if (sharedState.account) {
        window.localStorage.setItem(STORAGE_ACCOUNT_KEY, sharedState.account);
      } else {
        window.localStorage.removeItem(STORAGE_ACCOUNT_KEY);
      }
      if (sharedState.label) {
        window.localStorage.setItem(STORAGE_LABEL_KEY, sharedState.label);
      } else {
        window.localStorage.removeItem(STORAGE_LABEL_KEY);
      }
      if (sharedState.icon) {
        window.localStorage.setItem(STORAGE_ICON_KEY, sharedState.icon);
      } else {
        window.localStorage.removeItem(STORAGE_ICON_KEY);
      }
      if (sharedState.sessionToken) {
        window.localStorage.setItem(
          STORAGE_SESSION_KEY,
          sharedState.sessionToken,
        );
      } else {
        window.localStorage.removeItem(STORAGE_SESSION_KEY);
      }
    } catch {
      // ignore storage errors
    }
    window.dispatchEvent(
      new CustomEvent(WALLET_EVENT, { detail: { ...sharedState } }),
    );
  }
  return { ...sharedState };
}

export function subscribeWalletState(
  listener: (state: SharedWalletState) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  hydrateFromStorage();
  const handler = () => listener(getSharedWalletState());
  window.addEventListener(WALLET_EVENT, handler);
  return () => window.removeEventListener(WALLET_EVENT, handler);
}

function isTokenValidForAccount(
  token: string | null,
  account: string,
): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 4) return false;
  const [w, , expStr] = parts;
  const exp = Number(expStr);
  if (!w || !Number.isFinite(exp) || exp <= Date.now() + 30_000) return false;
  return w.toLowerCase() === account.toLowerCase();
}

export async function resolveActiveProvider(): Promise<Eip1193Provider | null> {
  hydrateFromStorage();
  if (sharedState.provider) return sharedState.provider;
  const discovered = await discoverProviders(250);
  if (discovered.length > 0) {
    const match = sharedState.label
      ? discovered.find((d) => d.info.name === sharedState.label)
      : discovered[0];
    const chosen = (match ?? discovered[0])!.provider;
    sharedState.provider = chosen;
    return chosen;
  }
  const legacy = getLegacyProvider();
  if (legacy) {
    sharedState.provider = legacy;
    return legacy;
  }
  return null;
}

function randomAlphaNum(len = 16): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const arr = new Uint8Array(len);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < len; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  let out = "";
  for (let i = 0; i < len; i++) out += chars[arr[i]! % chars.length];
  return out;
}

export async function ensureSiweSession(
  providerArg?: Eip1193Provider | null,
  accountArg?: string | null,
): Promise<{
  ok: boolean;
  wallet?: string;
  sessionToken?: string;
  error?: string;
}> {
  hydrateFromStorage();
  const provider = providerArg ?? (await resolveActiveProvider());
  if (!provider) {
    return { ok: false, error: "No wallet provider connected." };
  }
  let account = accountArg ?? sharedState.account;
  // localStorage and provider events can lag an account switch (especially
  // after a reload). Always reconcile against the provider immediately before
  // reusing a session or asking it to sign, or personal_sign may target a
  // stale address that the wallet no longer controls.
  let accs = await getAccounts(provider).catch(() => []);
  if (accs.length === 0) accs = await connectProvider(provider).catch(() => []);
  const currentAccount = accs[0] ?? null;
  if (
    currentAccount &&
    (!account || account.toLowerCase() !== currentAccount.toLowerCase())
  ) {
    account = currentAccount;
    setSharedWalletState({
      account,
      provider,
      sessionToken: null,
    });
  } else if (currentAccount) {
    // Preserve the provider's checksum-cased form for SIWE message parsing.
    account = currentAccount;
  } else {
    account = null;
  }
  if (!account) {
    return { ok: false, error: "No account is currently authorized in the connected wallet. Reconnect and try again." };
  }

  if (isTokenValidForAccount(sharedState.sessionToken, account)) {
    return {
      ok: true,
      wallet: account.toLowerCase(),
      sessionToken: sharedState.sessionToken!,
    };
  }

  try {
    const chainId = (await getChainId(provider).catch(() => null)) ?? 46630;
    const domain =
      typeof window !== "undefined" && window.location.host
        ? window.location.host
        : "haha.comedy";
    const origin =
      typeof window !== "undefined" && window.location.origin
        ? window.location.origin
        : "https://haha.comedy";
    const nonce = randomAlphaNum(16);
    const issuedAt = new Date().toISOString();
    const message = [
      `${domain} wants you to sign in with your Ethereum account:`,
      account,
      "",
      "Sign in to HAHA Comedy Club (no gas, no transaction).",
      "",
      `URI: ${origin}`,
      "Version: 1",
      `Chain ID: ${chainId}`,
      `Nonce: ${nonce}`,
      `Issued At: ${issuedAt}`,
    ].join("\n");

    const signature = (await provider.request({
      method: "personal_sign",
      params: [message, account],
    })) as string;

    const res = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message, signature, nonce }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      wallet?: string;
      sessionToken?: string;
      error?: string;
    };
    if (!res.ok || !data.ok) {
      return {
        ok: false,
        error: data.error ?? `SIWE verification failed (${res.status})`,
      };
    }
    setSharedWalletState({
      account: data.wallet ?? account.toLowerCase(),
      provider,
      sessionToken: data.sessionToken ?? null,
    });
    return {
      ok: true,
      wallet: (data.wallet ?? account).toLowerCase(),
      sessionToken: data.sessionToken,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "SIWE signature rejected.",
    };
  }
}

export function authHeaders(
  token?: string | null,
): Record<string, string> {
  const t = token ?? getSharedWalletState().sessionToken;
  if (!t) return {};
  // Never shadow a valid HttpOnly cookie with a stale localStorage token:
  // the server prioritizes the explicit header and would return 401.
  const parts = t.split(".");
  const expiresAt = parts.length === 4 ? Number(parts[2]) : NaN;
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now() + 30_000) {
    return {};
  }
  return { "x-haha-session": t };
}

/**
 * Disconnect locally: clear the shared wallet state, SIWE session token,
 * and any stored icon, then broadcast the change. The wallet extension
 * itself stays connected (mirrors the veil-style `clearWallet` flow) —
 * this only makes the app forget the session.
 */
export function disconnectWallet(): void {
  setSharedWalletState({
    account: null,
    provider: null,
    label: null,
    icon: null,
    sessionToken: null,
  });
}
