"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
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
        });
        if (accs[0]) {
          await ensureSiweSession(entry.provider, accs[0]).catch(() => {});
        }
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

  if (!open) return null;

  const expectedChain = runtime?.chainId ?? 46_630;
  const onWrongChain = chainId !== null && chainId !== expectedChain;
  const firstAccount = accounts[0] ?? null;

  return (
    <div
      className="fixed inset-0 z-90 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="Connect wallet"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-[#efe8dc]/20 bg-[#14100d] p-7 shadow-[0_30px_90px_rgba(0,0,0,0.85)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between">
          <div>
            <span className="eyebrow">Box Office · EIP-6963</span>
            <h2 className="display-serif mt-2 text-3xl text-[#fff6ed]">
              Connect <em>wallet.</em>
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="pill-btn"
            style={{ padding: "6px 12px" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="mb-5 text-sm leading-relaxed text-[#a49b8e]">
          {runtime
            ? `HAHA runs on ${runtime.chainName} (Chain ${runtime.chainId}).`
            : "Loading network info…"}{" "}
          Sign in with your wallet to take the stage, judge in the Crowd, or
          claim Tip Jar payouts.
        </p>

        {firstAccount && activeLabel ? (
          <div className="mb-4 rounded-xl border border-[#8fb596]/35 bg-[#8fb596]/10 p-3.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-widest text-[#8fb596]">
                Connected · {activeLabel}
              </span>
              <button
                type="button"
                onClick={() => void refreshAccounts()}
                className="font-mono text-[10px] uppercase tracking-wider text-[#a49b8e] underline hover:text-[#efe8dc]"
              >
                Refresh
              </button>
            </div>
            <p className="mt-1 font-mono text-sm text-[#fff6ed]">
              {truncateAddress(firstAccount)}
            </p>
          </div>
        ) : null}

        {onWrongChain ? (
          <div className="mb-4 rounded-xl border border-[#c93b2b]/40 bg-[#c93b2b]/15 p-3.5 text-sm text-[#efe8dc]">
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

        <div className="space-y-2.5">
          {entries.map((entry) => (
            <button
              key={entry.label}
              type="button"
              disabled={busy !== null}
              onClick={() => void connectEntry(entry)}
              className="flex w-full items-center justify-between rounded-xl border border-[#efe8dc]/12 bg-[#1c1611] px-4 py-3.5 text-left text-sm text-[#efe8dc] transition hover:border-[#ffb13b] hover:bg-[#ffb13b]/10 disabled:opacity-50"
            >
              <span className="font-medium">{entry.label}</span>
              <span className="font-mono text-[11px] uppercase tracking-widest text-[#ffb13b]">
                {busy === entry.label ? "Signing…" : "Connect →"}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between">
          {scanning ? (
            <p className="font-mono text-[11px] uppercase tracking-wider text-[#a49b8e]">
              Scanning EIP-6963 providers…
            </p>
          ) : (
            <button
              type="button"
              onClick={() => void scan()}
              className="font-mono text-[11px] uppercase tracking-wider text-[#a49b8e] underline hover:text-[#ffb13b]"
            >
              Rescan wallets
            </button>
          )}
        </div>

        {error ? (
          <p
            className="mt-3 rounded-lg border border-[#c93b2b]/35 bg-[#c93b2b]/10 p-3 text-xs text-[#ffb13b]"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <p className="mt-5 border-t border-[#efe8dc]/10 pt-4 font-mono text-[10px] uppercase tracking-[0.14em] leading-relaxed text-[#6c6459]">
          Zero seed phrases · SIWE session verified · Rewards depend on the Tip
          Jar
        </p>
      </div>
    </div>
  );
}
