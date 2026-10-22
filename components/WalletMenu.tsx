"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  LogOut,
  RefreshCw,
  UserRound,
  Wallet as WalletIcon,
} from "lucide-react";
import WalletModal from "@/components/WalletModal";
import { RobinhoodLogoMark } from "@/components/RobinhoodLogo";
import {
  disconnectWallet,
  getSharedWalletState,
  subscribeWalletState,
  truncateAddress,
} from "@/lib/wallets";

interface WalletBalances {
  chainId: number;
  chainName: string;
  explorer: string | null;
  eth: string | null;
  usdg: string | null;
}

/**
 * Veil-style wallet chip: wallet logo + address + chevron, with a
 * dropdown holding chain info, live ETH/USDG balances (fetched only
 * while the menu is open, via the server-side RPC fanout), copy
 * address, explorer link, and disconnect. HAHA dark/gold skin.
 */
export default function WalletMenu() {
  const [account, setAccount] = useState<string | null>(null);
  const [icon, setIcon] = useState<string | null>(null);
  const [label, setLabel] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [balances, setBalances] = useState<WalletBalances | null>(null);
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const st = getSharedWalletState();
    if (st.account) {
      setAccount(st.account);
      setIcon(st.icon);
      setLabel(st.label);
    }
    return subscribeWalletState((next) => {
      setAccount(next.account);
      setIcon(next.icon);
      setLabel(next.label);
      if (!next.account) {
        setMenuOpen(false);
        setBalances(null);
      }
    });
  }, []);

  const loadBalances = useCallback(async (addr: string) => {
    setBalancesLoading(true);
    try {
      const res = await fetch(
        `/api/wallet/balances?address=${encodeURIComponent(addr)}`,
        { headers: { "cache-control": "no-store" } },
      );
      if (!res.ok) throw new Error(String(res.status));
      setBalances((await res.json()) as WalletBalances);
    } catch {
      setBalances(null);
    } finally {
      setBalancesLoading(false);
    }
  }, []);

  // Close on outside click or Escape (standard disclosure).
  useEffect(() => {
    if (!menuOpen) return;
    const onDocMouseDown = (e: MouseEvent | TouchEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("touchstart", onDocMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("touchstart", onDocMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const openMenu = () => {
    setMenuOpen(true);
    if (account) void loadBalances(account);
  };

  const handleCopy = () => {
    if (!account) return;
    void navigator.clipboard.writeText(account);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDisconnect = () => {
    disconnectWallet();
    setMenuOpen(false);
  };

  const iconClass = "h-3.5 w-3.5 shrink-0";

  return (
    <div ref={menuRef} className="relative">
      {!account ? (
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="pill-btn cursor-pointer"
          aria-haspopup="dialog"
        >
          <WalletIcon className="h-3.5 w-3.5 text-[#ffc53d]" aria-hidden />
          <span className="text-[11px]">Connect</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => (menuOpen ? setMenuOpen(false) : openMenu())}
          className="pill-btn cursor-pointer"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label={`Wallet ${truncateAddress(account)}, open account menu`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {icon ? (
            <img
              src={icon}
              alt=""
              width={16}
              height={16}
              className="h-4 w-4 rounded-[4px] object-contain"
            />
          ) : (
            <WalletIcon className="h-3.5 w-3.5 text-[#ffc53d]" aria-hidden />
          )}
          <span className="text-[11px]">{truncateAddress(account)}</span>
          <ChevronDown
            className={`h-3 w-3 transition-transform ${menuOpen ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
      )}

      {account && menuOpen && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-[60] w-[264px] max-w-[calc(100vw-24px)] rounded-2xl border border-white/10 bg-[#0c0c12]/95 p-1.5 shadow-2xl backdrop-blur-2xl"
        >
          {/* Header: connected wallet + chain */}
          <div className="border-b border-white/[0.08] px-3 pb-2 pt-2.5 font-mono text-[10px] uppercase tracking-[0.14em]">
            <div className="text-zinc-500">Connected via {label ?? "EVM Wallet"}</div>
            <div className="mt-1 font-bold text-[#ffc53d] flex items-center gap-1.5">
              <RobinhoodLogoMark size={13} color="#ffc53d" />
              <span>
                {balances?.chainName ?? "Robinhood Chain"}
                {balances?.chainId ? ` (${balances.chainId})` : " (46630)"}
              </span>
            </div>
          </div>

          {/* Balances */}
          <div className="border-b border-white/[0.08] px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-500">
                Balances
              </span>
              <button
                type="button"
                onClick={() => void loadBalances(account)}
                disabled={balancesLoading}
                className="rounded-md p-1 text-zinc-500 transition hover:text-[#ffc53d] disabled:opacity-40 cursor-pointer"
                aria-label="Refresh balances"
              >
                <RefreshCw
                  className={`h-3 w-3 ${balancesLoading ? "animate-spin" : ""}`}
                  aria-hidden
                />
              </button>
            </div>
            {balancesLoading && !balances ? (
              <span className="block py-1 font-mono text-[10px] text-zinc-600">
                Loading balances…
              </span>
            ) : (
              <div className="mt-0.5 flex flex-col gap-0.5 font-mono text-[11px]">
                <span className="flex items-center justify-between">
                  <span className="text-zinc-500">ETH</span>
                  <span className="text-white">{balances?.eth ?? "-"}</span>
                </span>
                <span className="flex items-center justify-between">
                  <span className="text-zinc-500">USDG</span>
                  <span className="text-white">{balances?.usdg ?? "-"}</span>
                </span>
              </div>
            )}
          </div>

          {/* Owner recovery: pending/rejected bits live on the profile. */}
          <Link
            role="menuitem"
            href={`/u/${encodeURIComponent(account)}`}
            onClick={() => setMenuOpen(false)}
            className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-zinc-300 transition hover:bg-white/[0.06] hover:text-white"
          >
            <UserRound className={iconClass} aria-hidden />
            <span>My bits &amp; profile</span>
          </Link>

          {/* Copy address */}
          <button
            type="button"
            role="menuitem"
            onClick={handleCopy}
            className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left font-mono text-[11px] uppercase tracking-[0.12em] text-zinc-300 transition hover:bg-white/[0.06] hover:text-white cursor-pointer"
          >
            {copied ? (
              <Check className={`${iconClass} text-[#ffc53d]`} aria-hidden />
            ) : (
              <Copy className={iconClass} aria-hidden />
            )}
            <span>{copied ? "Address copied" : "Copy address"}</span>
          </button>

          {/* Explorer */}
          {balances?.explorer && (
            <a
              role="menuitem"
              href={balances.explorer}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-0.5 flex w-full items-center gap-2 rounded-xl px-3 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-zinc-300 transition hover:bg-white/[0.06] hover:text-white"
            >
              <ExternalLink className={iconClass} aria-hidden />
              <span>View on Explorer</span>
            </a>
          )}

          {/* Disconnect */}
          <button
            type="button"
            role="menuitem"
            onClick={handleDisconnect}
            className="mt-0.5 flex w-full items-center gap-2 rounded-xl border-t border-white/[0.08] px-3 py-2 text-left font-mono text-[11px] uppercase tracking-[0.12em] text-zinc-400 transition hover:bg-red-500/10 hover:text-red-400 cursor-pointer"
          >
            <LogOut className={iconClass} aria-hidden />
            <span>Disconnect</span>
          </button>
        </div>
      )}

      <WalletModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConnected={(accs) => {
          const st = getSharedWalletState();
          if (accs[0] ?? st.account) {
            setAccount(accs[0] ?? st.account);
            setIcon(st.icon);
            setLabel(st.label);
          }
        }}
      />
    </div>
  );
}
