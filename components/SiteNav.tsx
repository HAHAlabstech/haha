"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Mic,
  ArrowUpRight,
  Menu,
  X,
  Wallet,
} from "lucide-react";
import WalletModal from "./WalletModal";
import {
  getSharedWalletState,
  subscribeWalletState,
  truncateAddress,
} from "@/lib/wallets";

const NAV_LINKS = [
  { href: "/#how-it-works", label: "How It Works" },
  { href: "/#waveform", label: "The Science" },
  { href: "/#vault", label: "Joke Vault" },
  { href: "/#faq", label: "FAQ" },
];

export default function SiteNav() {
  const pathname = usePathname();
  const [modalOpen, setModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [accounts, setAccounts] = useState<string[]>([]);
  const first = accounts[0] ?? null;

  useEffect(() => {
    const initial = getSharedWalletState();
    if (initial.account) setAccounts([initial.account]);
    return subscribeWalletState((st) => {
      setAccounts(st.account ? [st.account] : []);
    });
  }, []);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* Top Floating Glass Navigation Bar */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-[clamp(16px,4vw,48px)] py-4 ${
          scrolled
            ? "bg-[#070709]/85 backdrop-blur-xl border-b border-white/[0.08] shadow-2xl py-3"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-[1440px] mx-auto flex items-center justify-between">
          {/* Brand Logo */}
          <Link
            href="/"
            className="flex items-center gap-3 group focus:outline-none"
            aria-label="HAHA Home"
          >
            <div className="relative w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center p-0.5 bg-[#121218] border border-white/10 group-hover:border-[#ffc53d]/50 group-hover:scale-105 transition-all shadow-[0_0_15px_rgba(255,197,61,0.2)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/logo-transparent.png"
                alt="HAHA Logo"
                className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(255,197,61,0.4)]"
              />
            </div>
            <span className="font-display font-bold text-xl tracking-[0.2em] text-white group-hover:text-[#ffc53d] transition-colors">
              HAHA
            </span>
            <span className="hidden sm:inline-block border-l border-white/10 pl-3 font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-500">
              AI Comedy Lab
            </span>
          </Link>

          {/* Center Navigation Links (Desktop) */}
          <nav
            className="hidden md:flex items-center gap-1 bg-[#12121a]/70 border border-white/[0.08] rounded-full px-4 py-1.5 backdrop-blur-md shadow-inner"
            aria-label="Primary Navigation"
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-1.5 rounded-full font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-all"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-3">
            {/* Connect Wallet Button */}
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-[#12121a]/80 hover:bg-white/10 font-mono text-[11px] uppercase tracking-[0.12em] text-zinc-300 hover:text-white transition-all backdrop-blur-md shadow-sm"
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  first
                    ? "bg-[#ffc53d] shadow-[0_0_8px_rgba(255,197,61,0.6)]"
                    : "bg-zinc-500"
                }`}
              />
              <span>{first ? truncateAddress(first) : "Connect"}</span>
            </button>

            {/* Launch App Primary CTA */}
            <Link
              href="/app"
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-[#ffc53d] to-[#f59e0b] hover:from-[#ffd875] hover:to-[#ffc53d] font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[#070709] shadow-[0_0_24px_rgba(255,197,61,0.35)] hover:shadow-[0_0_32px_rgba(255,197,61,0.55)] hover:scale-[1.02] transition-all"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Launch App</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>

            {/* Mobile Menu Toggle Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-full border border-white/10 bg-[#12121a]/80 text-zinc-300 hover:text-white"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? (
                <X className="w-4 h-4" />
              ) : (
                <Menu className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-3 p-4 rounded-2xl bg-[#0c0c12]/95 border border-white/10 backdrop-blur-2xl shadow-2xl flex flex-col gap-2">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-2.5 rounded-xl font-mono text-xs uppercase tracking-wider text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/app"
              onClick={() => setMobileMenuOpen(false)}
              className="mt-2 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-[#ffc53d] to-[#f59e0b] font-mono text-xs font-bold uppercase tracking-wider text-[#070709]"
            >
              <Mic className="w-4 h-4" />
              <span>Launch App Console</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </header>

      {/* Wallet Connection Modal */}
      <WalletModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConnected={(accs) => setAccounts(accs)}
      />
    </>
  );
}
