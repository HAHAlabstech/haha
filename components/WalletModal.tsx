"use client";

import { useCallback, useEffect, useState } from "react";
import { X, Wallet } from "lucide-react";
import { RobinhoodLogoMark } from "@/components/RobinhoodLogo";
import { KNOWN_WALLETS } from "@/lib/known-wallets";
import type {
  Eip1193Provider,
  Eip6963ProviderDetail,
} from "@/lib/wallets";
import {
  connectAndEnsureChain,
  discoverProviders,
  ensureSiweSession,
  getAccounts,
  getChainId,
  getLegacyProvider,
  getSharedWalletState,
  onAccountsChanged,
  onChainChanged,
  setSharedWalletState,
  switchOrAddChain,
  truncateAddress,
} from "@/lib/wallets";
import type { ChainEnv, HahaRuntimeConfig } from "@/lib/haha-chains";

interface WalletModalProps {
  open: boolean;
  onClose: () => void;
  onConnected?: (accounts: string[]) => void;
}

interface ProviderEntry {
  label: string;
  detail: Eip6963ProviderDetail | null;
  provider: Eip1193Provider | null;
}

/**
 * EIP-6963 wallet picker modal. Raw EIP-1193 only (no wagmi, no
 * rainbowkit, no ethers, no hosted connectors. No secrets involved.
 */
export default function WalletModal({
  open,
  onClose,
  onConnected,
}: WalletModalProps) {
  const [entries, setEntries] = useState<ProviderEntry[]>([]);
  const [scanning, setScanning] = useState(false);
  const [accounts, setAccounts] = useState<string[]>([]);
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const [activeProvider, setActiveProvider] =
    useState<Eip1193Provider | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [runtime, setRuntime] = useState<HahaRuntimeConfig | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shouldRender, setShouldRender] = useState(open);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setShouldRender(true);
      setIsClosing(false);
      if (typeof document !== "undefined") {
        document.body.style.overflow = "hidden";
      }
    } else if (shouldRender) {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
        setIsClosing(false);
        if (typeof document !== "undefined") {
          document.body.style.overflow = "";
        }
      }, 200);
      return () => {
        clearTimeout(timer);
        if (typeof document !== "undefined") {
          document.body.style.overflow = "";
        }
      };
    }
    return () => {
      if (typeof document !== "undefined") {
        document.body.style.overflow = "";
      }
    };
  }, [open, shouldRender]);

  const handleClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
      setShouldRender(false);
      if (typeof document !== "undefined") {
        document.body.style.overflow = "";
      }
    }, 200);
  }, [isClosing, onClose]);

  useEffect(() => {
    if (!shouldRender || isClosing) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [shouldRender, isClosing, handleClose]);

  useEffect(() => {
    if (!open) return;
    const shared = getSharedWalletState();
    if (shared.account && accounts.length === 0) {
      setAccounts([shared.account]);
      if (shared.label) setActiveLabel(shared.label);
      if (shared.provider) setActiveProvider(shared.provider);
    }
    let cancelled = false;
    fetch("/api/config")
      .then((r) => (r.ok ? r.json() : null))
      .then((cfg: HahaRuntimeConfig | null) => {
        if (!cancelled && cfg) setRuntime(cfg);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, accounts.length]);

  const scan = useCallback(async () => {
    setScanning(true);
    setError(null);
    try {
      const found = await discoverProviders(600);
      const list: ProviderEntry[] = found.map((d) => ({
        label: d.info.name || d.info.rdns || "Wallet",
        detail: d,
        provider: d.provider,
      }));
      const legacy = getLegacyProvider();
      if (legacy && !list.some((e) => e.provider === legacy)) {
        list.push({
          label: "Browser wallet",
          detail: null,
          provider: legacy,
        });
      }
      setEntries(list);
      if (list.length === 0) {
        setError(
          "No EIP-6963 wallet found. Install an EIP-1193 wallet extension, then try again.",
        );
      }
    } catch {
      setError("Wallet scan failed. Please try again.");
    } finally {
      setScanning(false);
    }
  }, []);

  useEffect(() => {
    if (open) void scan();
  }, [open, scan]);

  useEffect(() => {
    if (!activeProvider) return;
    const offAcc = onAccountsChanged(activeProvider, (accs) => {
      setAccounts(accs);
      setSharedWalletState({
        account: accs[0] ?? null,
        provider: accs.length > 0 ? activeProvider : null,
        sessionToken: null,
      });
      onConnected?.(accs);
      if (accs.length === 0) setActiveLabel(null);
    });
    const offChain = onChainChanged(activeProvider, (id) => setChainId(id));
    return () => {
      offAcc();
      offChain();
    };
  }, [activeProvider, onConnected]);

  const connectEntry = useCallback(
    async (entry: ProviderEntry) => {
      if (!entry.provider) return;
      setBusy(entry.label);
      setError(null);
      try {
        const env: ChainEnv = runtime?.chainEnv ?? "testnet";
        const targetChain = runtime?.chainId ?? 46_630;
        const accs = await connectAndEnsureChain(
          entry.provider,
          env,
          targetChain,
        );
        const current = await getChainId(entry.provider).catch(() => null);
        setAccounts(accs);
        setActiveLabel(entry.label);
        setActiveProvider(entry.provider);
        setChainId(current);
        setSharedWalletState({
          account: accs[0] ?? null,
          provider: entry.provider,
          label: entry.label,
          icon: entry.detail?.info?.icon ?? null,
        });
        if (accs[0]) {
          await ensureSiweSession(entry.provider, accs[0]).catch(() => {});
        }
        onConnected?.(accs);
        if (accs.length > 0) handleClose();
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Connection rejected in wallet.",
        );
      } finally {
        setBusy(null);
      }
    },
    [handleClose, onConnected, runtime],
  );

  const refreshAccounts = useCallback(async () => {
    if (!activeProvider) return;
    const accs = await getAccounts(activeProvider).catch(() => []);
    setAccounts(accs);
    setSharedWalletState({ account: accs[0] ?? null });
  }, [activeProvider]);

  const switchChain = useCallback(async () => {
    if (!activeProvider || !runtime) return;
    setBusy("__switch");
    setError(null);
    try {
      const id = await switchOrAddChain(activeProvider, runtime.chainId);
      setChainId(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chain switch failed.");
    } finally {
      setBusy(null);
    }
  }, [activeProvider, runtime]);

  if (!shouldRender) return null;

  const expectedChain = runtime?.chainId ?? 46_630;
  const onWrongChain = chainId !== null && chainId !== expectedChain;
  const firstAccount = accounts[0] ?? null;

  return (
    <div
      className={`fixed inset-0 z-90 flex items-center justify-center bg-black/80 p-4 ${
        isClosing ? "animate-hahaFadeOut" : "animate-hahaFadeIn"
      }`}
      role="dialog"
      aria-modal="true"
      aria-label="Connect wallet"
      onClick={handleClose}
    >
      <div
        className={`w-full max-w-xl max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain rounded-2xl border border-white/10 bg-[#0c0c12]/95 p-7 shadow-[0_30px_90px_rgba(0,0,0,0.85)] backdrop-blur-2xl sm:p-6 ${
          isClosing ? "animate-hahaModalExit" : "animate-hahaModalEnter"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex min-w-0 items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/logo-transparent.webp"
              alt="HAHA Logo"
              className="h-10 w-auto object-contain filter drop-shadow-[0_0_10px_rgba(255,197,61,0.4)]"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#ffc53d] font-semibold">Box Office</span>
                <span className="text-zinc-600">·</span>
                <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-zinc-300">
                  <RobinhoodLogoMark size={12} color="#ffc53d" />
                  <span>Robinhood Chain</span>
                </span>
              </div>
              <h2 className="display-serif text-2xl text-white font-bold">
                Connect <em className="text-[#ffc53d]">wallet.</em>
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="pill-btn cursor-pointer"
            style={{ padding: "6px 12px" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="mb-5 text-sm leading-relaxed text-zinc-400">
          Sign in with your Web3 wallet on Robinhood Chain to take the stage,
          cast blind verdicts in the Crowd, or claim Tip Jar USDG rewards.
        </p>

        {firstAccount && activeLabel ? (
          <div className="mb-4 rounded-xl border border-[#ffc53d]/30 bg-[#ffc53d]/10 p-3.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-widest text-[#ffc53d] font-bold">
                Connected · {activeLabel}
              </span>
              <button
                type="button"
                onClick={() => void refreshAccounts()}
                className="font-mono text-[10px] uppercase tracking-wider text-zinc-400 underline hover:text-white"
              >
                Refresh
              </button>
            </div>
            <p className="mt-1 font-mono text-sm text-white">
              {truncateAddress(firstAccount)}
            </p>
          </div>
        ) : null}

        {onWrongChain ? (
          <div className="mb-4 rounded-xl border border-rose-500/40 bg-rose-500/15 p-3.5 text-sm text-white">
            <p>
              Wallet is on chain {chainId}, expected {expectedChain}.
            </p>
            <button
              type="button"
              onClick={() => void switchChain()}
              disabled={busy === "__switch"}
              className="pill-btn hot mt-2.5"
            >
              {busy === "__switch" ? "Switching…" : "Switch network →"}
            </button>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {((): React.ReactNode => {
            // Veil-style catalog: well-known wallets with logos; detected
            // ones are active connect rows, the rest are install links.
            const catalogRows = KNOWN_WALLETS.map((w) => {
              const entry =
                entries.find((e) => {
                  const slug = (
                    (e.detail?.info.rdns ?? "") +
                    " " +
                    (e.detail?.info.name ?? "") +
                    " " +
                    e.label
                  ).toLowerCase();
                  return w.match.some((m) => slug.includes(m));
                }) ?? null;
              return { wallet: w, entry };
            });
            const claimed = new Set(
              catalogRows
                .filter((r) => r.entry)
                .map((r) => entries.indexOf(r.entry as ProviderEntry)),
            );
            const extraEntries = entries.filter((_, i) => !claimed.has(i));
            const hasAny = entries.length > 0;
            return (
              <>
                {catalogRows.map(({ wallet: w, entry }) =>
                  entry ? (
                    <button
                      key={w.id}
                      type="button"
                      disabled={busy !== null}
                      onClick={() => void connectEntry(entry)}
                      className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-[#12121a] px-3.5 py-2.5 text-left text-sm text-[#f4f4f7] transition hover:border-[#ffc53d]/50 hover:bg-[#ffc53d]/5 disabled:opacity-50 cursor-pointer"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#070709] border border-white/10 flex items-center justify-center p-1.5 overflow-hidden shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={entry.detail?.info.icon || w.icon}
                            alt={w.name}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <span className="font-medium text-white truncate">{entry.label}</span>
                      </div>
                      <span
                        className={`font-mono text-[11px] uppercase tracking-widest font-semibold ${
                          busy === entry.label
                            ? "text-[#ffc53d]"
                            : "text-[#ffc53d]"
                        }`}
                      >
                        {busy === entry.label ? "Signing…" : "Detected"}
                      </span>
                    </button>
                  ) : (
                    <a
                      key={w.id}
                      href={w.installUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full items-center justify-between rounded-xl border border-dashed border-white/10 bg-transparent px-3.5 py-2.5 text-left text-sm transition hover:border-white/25"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="w-8 h-8 flex items-center justify-center shrink-0 opacity-50 grayscale">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={w.icon} alt={w.name} className="w-6 h-6 object-contain" />
                        </div>
                        <span className="font-medium text-zinc-500">{w.name}</span>
                      </div>
                      <span className="font-mono text-[11px] uppercase tracking-widest text-zinc-500">
                        Install ↗
                      </span>
                    </a>
                  )
                )}
                {/* Raw EIP-6963 providers not covered by the catalog */}
                {extraEntries.map((entry) => (
                  <button
                    key={`extra-${entry.label}`}
                    type="button"
                    disabled={busy !== null}
                    onClick={() => void connectEntry(entry)}
                    className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-[#12121a] px-3.5 py-2.5 text-left text-sm text-[#f4f4f7] transition hover:border-[#ffc53d]/50 hover:bg-[#ffc53d]/5 disabled:opacity-50 cursor-pointer"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#070709] border border-white/10 flex items-center justify-center p-1.5 overflow-hidden shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {entry.detail?.info.icon ? (
                          <img src={entry.detail.info.icon} alt="" className="w-full h-full object-contain" />
                        ) : (
                          <Wallet className="w-4 h-4 text-[#ffc53d]" />
                        )}
                      </div>
                      <span className="font-medium text-white truncate">{entry.label}</span>
                    </div>
                    <span className="font-mono text-[11px] uppercase tracking-widest text-[#ffc53d] font-semibold">
                      {busy === entry.label ? "Signing…" : hasAny ? "Detected" : "Connect →"}
                    </span>
                  </button>
                ))}
              </>
            );
          })()}
        </div>

        <div className="mt-4 flex items-center justify-between">
          {scanning ? (
            <p className="font-mono text-[11px] uppercase tracking-wider text-zinc-400">
              Scanning EIP-6963 providers…
            </p>
          ) : (
            <button
              type="button"
              onClick={() => void scan()}
              className="font-mono text-[11px] uppercase tracking-wider text-zinc-400 underline hover:text-[#ffc53d]"
            >
              Rescan wallets
            </button>
          )}
        </div>

        {error ? (
          <p
            className="mt-3 rounded-lg border border-rose-500/35 bg-rose-500/10 p-3 text-xs text-rose-300"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <p className="mt-5 border-t border-white/10 pt-4 font-mono text-[10px] uppercase tracking-[0.14em] leading-relaxed text-zinc-500">
          Zero seed phrases · SIWE session verified · Rewards depend on the Tip
          Jar
        </p>
      </div>
    </div>
  );
}
