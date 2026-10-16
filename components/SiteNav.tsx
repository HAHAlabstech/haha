"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import WalletModal from "./WalletModal";
import {
  getSharedWalletState,
  subscribeWalletState,
  truncateAddress,
} from "@/lib/wallets";

const QUICK_LINKS: { href: string; label: string }[] = [
  { href: "/showtime", label: "Showtime" },
  { href: "/stage", label: "Stage" },
  { href: "/crowd", label: "Crowd" },
  { href: "/vault", label: "Vault" },
  { href: "/tipjar", label: "Tip Jar" },
  { href: "/leaderboard", label: "Leaderboard" },
];

const MENU_ITEMS: {
  num: string;
  title: string;
  tag: string;
  href: string;
}[] = [
  {
    num: "01",
    title: "Punchline",
    tag: "Set · Expectation Flip",
    href: "/#punchline",
  },
  {
    num: "02",
    title: "Subtext",
    tag: "Set · Polite vs Real",
    href: "/#subtext",
  },
  {
    num: "03",
    title: "IRL",
    tag: "Set · Physical World",
    href: "/#irl",
  },
  {
    num: "04",
    title: "Double Meaning",
    tag: "Set · Two Readings",
    href: "/#double-meaning",
  },
  {
    num: "05",
    title: "Showtime Orbit",
    tag: "3D Laocoon Experience",
    href: "/showtime",
  },
  {
    num: "06",
    title: "Take the Stage",
    tag: "Submit a Bit",
    href: "/stage",
  },
  {
    num: "07",
    title: "The Crowd",
    tag: "Human Quorum Judging",
    href: "/crowd",
  },
  {
    num: "08",
    title: "The Joke Vault",
    tag: "Verified Dataset & Revenue",
    href: "/vault",
  },
  {
    num: "09",
    title: "Tip Jar",
    tag: "Daily Merkle Claims",
    href: "/tipjar",
  },
  {
    num: "10",
    title: "Leaderboard",
    tag: "Top Comics & Crowd",
    href: "/leaderboard",
  },
  {
    num: "11",
    title: "Seasons",
    tag: "Straight Man Upgrades",
    href: "/seasons",
  },
  {
    num: "12",
    title: "Producers",
    tag: "Pro Stage & Vault Licenses",
    href: "/producers",
  },
];

export default function SiteNav() {
  const pathname = usePathname();
  const [modalOpen, setModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [condensed, setCondensed] = useState(false);
  const [clockText, setClockText] = useState("21:40");
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
    const tickClock = () => {
      const d = new Date();
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      setClockText(`${hh}:${mm}`);
    };
    tickClock();
    const id = setInterval(tickClock, 15_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      setCondensed(window.scrollY > 180);
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
      <header
        className={`topbar ${condensed ? "condensed" : ""}`}
        aria-label="Primary"
      >
        <div className="left">
          <button
            type="button"
            className="pill-btn"
            onClick={() => setMenuOpen(true)}
            aria-expanded={menuOpen}
            aria-controls="haha-menu-overlay"
          >
            <span className="bars" aria-hidden="true" />
            <span>Menu</span>
          </button>
          <nav
            className="hidden items-center gap-1 lg:flex"
            aria-label="Quick navigation"
          >
            {QUICK_LINKS.map((l) => {
              const active =
                pathname === l.href || pathname?.startsWith(`${l.href}/`);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em] transition-colors ${
                    active
                      ? "bg-[#ffb13b]/15 text-[#ffb13b]"
                      : "text-[#a49b8e] hover:text-[#efe8dc]"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <Link href="/" className="brand-mark" aria-label="HAHA Home">
          <span className="dot" aria-hidden="true" />
          <span>HAHA</span>
        </Link>

        <div className="right">
          <span className="clock hidden xl:inline-flex" title="Your local showtime">
            Showtime <b>{clockText}</b>
          </span>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="pill-btn"
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                first
                  ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
                  : "bg-[#a49b8e]"
              }`}
            />
            <span>{first ? truncateAddress(first) : "Connect"}</span>
          </button>
          <Link href="/stage" className="pill-btn hot hidden sm:inline-flex">
            <span>🎤 Take the stage</span>
          </Link>
        </div>
      </header>

      {/* Condensed floating glass pill when scrolled */}
      <div
        className={`condensed-pill ${condensed ? "visible" : ""}`}
        role="navigation"
        aria-label="Condensed navigation"
      >
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="inline-flex items-center gap-2 text-[#efe8dc] hover:text-[#ffb13b]"
        >
          <span style={{ color: "var(--amber)" }}>●</span>
          <span>HAHA</span>
        </button>
        <span style={{ color: "var(--bone-faint)" }}>·</span>
        <Link
          href="/showtime"
          className="hidden text-[#a49b8e] hover:text-[#efe8dc] sm:inline"
        >
          Showtime
        </Link>
        <Link
          href="/crowd"
          className="hidden text-[#a49b8e] hover:text-[#efe8dc] sm:inline"
        >
          Crowd
        </Link>
        <Link
          href="/vault"
          className="hidden text-[#a49b8e] hover:text-[#efe8dc] md:inline"
        >
          Vault
        </Link>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="rounded-full border border-[#efe8dc]/20 px-2.5 py-1 text-[10px] text-[#efe8dc] hover:border-[#ffb13b]"
        >
          {first ? truncateAddress(first) : "Wallet"}
        </button>
        <Link
          href="/stage"
          className="pill-btn hot"
          style={{ padding: "5px 12px", fontSize: "10px" }}
        >
          🎤 Stage
        </Link>
      </div>

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
            >
              <span>Close ✕</span>
            </button>
          </div>
        </div>

        <nav className="menu-list" aria-label="Full club directory">
          {MENU_ITEMS.map((item) => (
            <Link
              key={item.num}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className="menu-item"
            >
              <span className="num">{item.num}</span>
              <span>{item.title}</span>
              <span className="tag">{item.tag}</span>
            </Link>
          ))}
        </nav>

        <div className="menu-foot">
          <span>Humans Are Hard to Automate — Comedy Club &amp; Open Lab</span>
          <div className="flex flex-wrap gap-5">
            <Link
              href="/rules"
              onClick={() => setMenuOpen(false)}
              className="hover:text-[#ffb13b]"
            >
              House Rules
            </Link>
            <Link
              href="/faq"
              onClick={() => setMenuOpen(false)}
              className="hover:text-[#ffb13b]"
            >
              FAQ
            </Link>
            <Link
              href="/vault/method"
              onClick={() => setMenuOpen(false)}
              className="hover:text-[#ffb13b]"
            >
              Methodology
            </Link>
          </div>
          <span>Local Showtime — {clockText}</span>
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
