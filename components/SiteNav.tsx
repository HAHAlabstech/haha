"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Mic,
  Orbit,
  Users,
  Database,
  Coins,
  Trophy,
  Menu,
  X,
  Sparkles,
  ArrowUpRight,
  Shield,
  HelpCircle,
  FileCode,
  Layers,
} from "lucide-react";
import WalletModal from "./WalletModal";
import {
  getSharedWalletState,
  subscribeWalletState,
  truncateAddress,
} from "@/lib/wallets";

const LANDING_NAV = [
  { href: "/#how-it-works", label: "How It Works" },
  { href: "/#waveform", label: "The Science" },
  { href: "/#vault", label: "Joke Vault" },
  { href: "/showtime", label: "Showtime" },
  { href: "/faq", label: "FAQ" },
];

const DIRECTORY_LINKS = [
  { num: "01", title: "Punchline Set", tag: "Expectation Flip", href: "/#punchline", icon: Sparkles },
  { num: "02", title: "Subtext Set", tag: "Polite vs Real", href: "/#subtext", icon: Layers },
  { num: "03", title: "IRL Dynamics", tag: "Physical World", href: "/#irl", icon: Orbit },
  { num: "04", title: "Double Meaning", tag: "Two Readings", href: "/#double-meaning", icon: FileCode },
  { num: "05", title: "Showtime Orbit", tag: "3D Laocoon Experience", href: "/showtime", icon: Orbit },
  { num: "06", title: "Take the Stage", tag: "Submit a Bit", href: "/app?tab=stage", icon: Mic },
  { num: "07", title: "The Crowd", tag: "Human Quorum Judging", href: "/app?tab=crowd", icon: Users },
  { num: "08", title: "The Joke Vault", tag: "Verified Dataset & Revenue", href: "/app?tab=vault", icon: Database },
  { num: "09", title: "Tip Jar", tag: "Daily Merkle Claims", href: "/app?tab=tipjar", icon: Coins },
  { num: "10", title: "Leaderboard", tag: "Top Comics & Crowd", href: "/app?tab=leaderboard", icon: Trophy },
  { num: "11", title: "Seasons", tag: "Straight Man Upgrades", href: "/seasons", icon: Shield },
  { num: "12", title: "Producers", tag: "Pro Stage & Vault Licenses", href: "/producers", icon: Sparkles },
];

export default function SiteNav() {
  const pathname = usePathname();
  const [modalOpen, setModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
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
      setScrolled(window.scrollY > 30);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      {/* ================= SINGLE UNIFIED FLOATING HEADER ================= */}
      <header
        className={`topbar ${scrolled ? "scrolled" : ""}`}
        aria-label="Primary"
      >
        {/* Left: Brand mark */}
        <div className="left">
          <Link href="/" className="brand-mark group" aria-label="HAHA Home">
            <span className="dot" aria-hidden="true" />
            <span className="font-mono text-sm tracking-[0.22em] font-semibold text-white group-hover:text-[#ffb13b] transition-colors">
              HAHA
            </span>
            <span className="hidden lg:inline-block border-l border-white/10 pl-3 font-mono text-[9px] uppercase tracking-[0.16em] text-zinc-500">
              AI Comedy Lab
            </span>
          </Link>
        </div>

        {/* Center: Sleek floating pill navigation */}
        <nav
          className="topbar-nav hidden md:flex"
          aria-label="Quick navigation"
        >
          {LANDING_NAV.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-400 hover:text-white hover:bg-white/5 transition-all duration-200"
            >
              <span>{l.label}</span>
            </Link>
          ))}
        </nav>

        {/* Right: Wallet + Primary CTA + Directory drawer */}
        <div className="right">
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="pill-btn"
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                first
                  ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
                  : "bg-zinc-500"
              }`}
            />
            <span>{first ? truncateAddress(first) : "Connect"}</span>
          </button>

          <Link
            href="/app"
            className="pill-btn hot hidden sm:inline-flex items-center gap-1.5 shadow-[0_0_16px_rgba(255,177,59,0.25)]"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Launch App</span>
            <ArrowUpRight className="w-3 h-3" />
          </Link>

          <button
            type="button"
            className="pill-btn"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle directory menu"
          >
            {menuOpen ? <X className="w-3.5 h-3.5" /> : <Menu className="w-3.5 h-3.5" />}
            <span className="hidden xl:inline text-[10px]">Directory</span>
          </button>
        </div>
      </header>

      {/* Fullscreen Editorial Overlay Menu */}
      <aside
        id="haha-menu-overlay"
        className={`menu-overlay ${menuOpen ? "open" : ""}`}
        aria-hidden={!menuOpen}
      >
        <div className="menu-top">
          <Link
            href="/"
            onClick={() => setMenuOpen(false)}
            className="brand-mark"
          >
            <span className="dot" />
            <span>HAHA · Season 01</span>
          </Link>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setModalOpen(true);
              }}
              className="pill-btn"
            >
              {first ? `Wallet · ${truncateAddress(first)}` : "Connect Wallet"}
            </button>
            <button
              type="button"
              className="pill-btn"
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
            >
              <X className="w-3.5 h-3.5" />
              <span>Close</span>
            </button>
          </div>
        </div>

        <nav className="menu-list" aria-label="Full club directory">
          {DIRECTORY_LINKS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.num}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="menu-item group"
              >
                <span className="num">{item.num}</span>
                <span className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-zinc-500 group-hover:text-[#ffb13b] transition-colors" />
                  <span>{item.title}</span>
                </span>
                <span className="tag flex items-center gap-1">
                  <span>{item.tag}</span>
                  <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="menu-foot">
          <span>Humans Are Hard to Automate — Comedy Club &amp; Open AI Lab</span>
          <div className="flex flex-wrap gap-5">
            <Link
              href="/rules"
              onClick={() => setMenuOpen(false)}
              className="hover:text-[#ffb13b] transition-colors flex items-center gap-1"
            >
              <Shield className="w-3 h-3" />
              House Rules
            </Link>
            <Link
              href="/faq"
              onClick={() => setMenuOpen(false)}
              className="hover:text-[#ffb13b] transition-colors flex items-center gap-1"
            >
              <HelpCircle className="w-3 h-3" />
              FAQ
            </Link>
            <Link
              href="/vault/method"
              onClick={() => setMenuOpen(false)}
              className="hover:text-[#ffb13b] transition-colors flex items-center gap-1"
            >
              <FileCode className="w-3 h-3" />
              Methodology
            </Link>
          </div>
          <span>Robinhood Chain Testnet · Season 01</span>
        </div>
      </aside>

      <WalletModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConnected={(accs) => setAccounts(accs)}
      />
    </>
  );
}
