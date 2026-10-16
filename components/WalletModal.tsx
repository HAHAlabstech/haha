"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  Eip1193Provider,
  Eip6963ProviderDetail,
} from "@/lib/wallets";
import {
  connectAndEnsureChain,
  discoverProviders,
  getAccounts,
  getChainId,
  getLegacyProvider,
  onAccountsChanged,
  onChainChanged,
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
 * EIP-6963 wallet picker modal. Raw EIP-1193 only — no wagmi, no
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

  // Runtime chain config (chainEnv/chainId) — never NEXT_PUBLIC_*.
  useEffect(() => {
    if (!open) return;
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
  }, [open ]);

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

  // Track account / chain changes on the active provider.
  useEffect(() => {
    if (!activeProvider) return;
    const offAcc = onAccountsChanged(activeProvider, (accs) => {
      setAccounts(accs);
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
        onConnected?.(accs);
        if (accs.length > 0) onClose();
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Connection rejected in wallet.",
        );
      } finally {
        setBusy(null);
      }
    },
    [onClose, onConnected, runtime],
  );

  const refreshAccounts = useCallback(async () => {
    if (!activeProvider) return;
    const accs = await getAccounts(activeProvider).catch(() => []);
    setAccounts(accs);
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

  if (!open) return null;

  const expectedChain = runtime?.chainId ?? 46_630;
  const onWrongChain = chainId !== null && chainId !== expectedChain;
  const firstAccount = accounts[0] ?? null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Connect wallet"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-amber-200/15 bg-[#14101c] p-6 shadow-[0_0_60px_rgba(251,191,36,0.12)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-amber-50">
            Connect wallet
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full px-2 py-1 text-sm text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
          >
            ✕
          </button>
        </div>
        <p className="mb-4 text-sm text-zinc-400">
          {runtime
            ? `HAHA is on ${runtime.chainName} (${runtime.chainId}).`
            : "Loading network info…"}{" "}
          Wallets connect via the EIP-6963 standard.
        </p>

        {firstAccount && activeLabel ? (
          <div className="mb-4 rounded-xl border border-emerald-300/20 bg-emerald-400/5 p-3 text-sm">
            <p className="text-zinc-300">
              Connected via <span className="font-medium">{activeLabel}</span>
            </p>
            <p className="font-mono text-emerald-200">
              {truncateAddress(firstAccount)}
            </p>
            <button
              type="button"
              onClick={() => void refreshAccounts()}
              className="mt-2 text-xs text-zinc-400 underline hover:text-zinc-200"
            >
              Refresh accounts
            </button>
          </div>
        ) : null}

        {onWrongChain ? (
          <div className="mb-4 rounded-xl border border-red-300/25 bg-red-400/10 p-3 text-sm text-red-100">
            <p>
              Wallet is on chain {chainId}, expected {expectedChain}.
            </p>
            <button
              type="button"
              onClick={() => void switchChain()}
              disabled={busy === "__switch"}
              className="mt-2 rounded-lg bg-red-400/20 px-3 py-1.5 text-xs font-medium hover:bg-red-400/30 disabled:opacity-50"
            >
              {busy === "__switch" ? "Switching…" : "Switch network"}
            </button>
          </div>
        ) : null}

        <div className="space-y-2">
          {entries.map((entry) => (
            <button
              key={entry.label}
              type="button"
              disabled={busy !== null}
              onClick={() => void connectEntry(entry)}
              className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left text-sm text-zinc-100 hover:border-amber-200/40 hover:bg-white/[0.06] disabled:opacity-50"
            >
              <span className="font-medium">{entry.label}</span>
              <span className="text-xs text-zinc-400">
                {busy === entry.label ? "Waiting for wallet…" : "Connect →"}
              </span>
            </button>
          ))}
        </div>

        {scanning ? (
          <p className="mt-3 text-xs text-zinc-500">Scanning for wallets…</p>
        ) : (
          <button
            type="button"
            onClick={() => void scan()}
            className="mt-3 text-xs text-zinc-400 underline hover:text-zinc-200"
          >
            Rescan for wallets
          </button>
        )}

        {error ? (
          <p className="mt-3 text-sm text-red-200" role="alert">
            {error}
          </p>
        ) : null}

        <p className="mt-4 text-[11px] leading-relaxed text-zinc-500">
          No seed phrases, no private keys — signing happens inside your
          wallet only. Rewards vary and depend on the Tip Jar.
        </p>
      </div>
    </div>
  );
}
