/**
 * Well-known EVM wallets for the connect modal — same concept as veil:
 * show a branded catalog of wallets. An entry is "detected" when an
 * EIP-6963 announcement matches it (rdns/slug); otherwise the row is an
 * install link. Icons live in /public/wallets.
 */
export interface KnownWallet {
  id: string;
  name: string;
  installUrl: string;
  icon: string;
  /** Substring(s) matched against EIP-6963 rdns / wallet name. */
  match: string[];
}

export const KNOWN_WALLETS: KnownWallet[] = [
  { id: "metamask", name: "MetaMask", installUrl: "https://metamask.io/download/", icon: "/wallets/metamask.svg", match: ["metamask"] },
  { id: "rabby", name: "Rabby", installUrl: "https://rabby.io/", icon: "/wallets/rabby.svg", match: ["rabby"] },
  { id: "coinbase", name: "Coinbase Wallet", installUrl: "https://www.coinbase.com/wallet/downloads", icon: "/wallets/coinbase.svg", match: ["coinbase", "cbwallet"] },
  { id: "okx", name: "OKX Wallet", installUrl: "https://www.okx.com/web3", icon: "/wallets/okx.svg", match: ["okx"] },
  { id: "trust", name: "Trust Wallet", installUrl: "https://trustwallet.com/download", icon: "/wallets/trust.png", match: ["trust"] },
  { id: "phantom", name: "Phantom (EVM)", installUrl: "https://phantom.app/download", icon: "/wallets/phantom.svg", match: ["phantom"] },
];

export function matchKnownWallet(
  rdns: string | undefined,
  name: string,
): KnownWallet | null {
  const rdn = (rdns ?? "").toLowerCase();
  const nm = (name ?? "").toLowerCase();
  for (const w of KNOWN_WALLETS) {
    if (w.match.some((m) => rdn.includes(m) || nm.includes(m))) return w;
  }
  return null;
}
