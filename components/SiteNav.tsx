"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Mic, ArrowUpRight, Menu, X } from "lucide-react";
import WalletMenu from "./WalletMenu";
import { scrollToId } from "@/components/landing/SmoothScroll";
import { XLogoMark } from "./XLogo";

const NAV_LINKS = [
  { href: "/#waveform", label: "The Science" },
  { href: "/#how-it-works", label: "How It Works" },
  { href: "/#vault", label: "Joke Vault" },
  { href: "/#telemetry", label: "Live Feed" },
  { href: "/#faq", label: "FAQ" },
  { href: "/contracts", label: "Contracts" },
];

export default function SiteNav() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const hero = document.querySelector(".haha-runway");
      if (hero) {
        const rect = hero.getBoundingClientRect();
        setScrolled(rect.bottom <= 80);
      } else {
        setScrolled(window.scrollY > 20);
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  const handleNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string,
  ) => {
    if (href.startsWith("/#") && pathname === "/") {
      e.preventDefault();
      const id = href.replace("/#", "");
      if (scrollToId(id)) {
        window.history.pushState(null, "", href);
        setMobileMenuOpen(false);
      }
    } else {
      setMobileMenuOpen(false);
    }
  };

  return (
    <>
      {/* Top Floating Glass Navigation Bar: aligned to px-[clamp(20px,4vw,56px)] & max-w-[1440px] */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-[clamp(20px,4vw,56px)] py-4 ${
          scrolled || mobileMenuOpen
            ? "bg-[#070709]/85 backdrop-blur-xl border-b border-white/[0.08] shadow-2xl py-3"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-[1440px] mx-auto flex items-center justify-between">
          {/* Brand Logo */}
          <Link
            href="/"
            className="flex min-w-0 items-center gap-2.5 group focus:outline-none"
            aria-label="HAHA Home"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/logo-transparent.webp"
              alt="HAHA Logo"
              className="h-8 w-auto object-contain transition-transform duration-200 group-hover:scale-105 filter drop-shadow-[0_0_12px_rgba(255,197,61,0.35)]"
            />
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
                onClick={(e) => handleNavClick(e, link.href)}
                className="px-4 py-1.5 rounded-full font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right Action Buttons */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {/* X (Twitter) Link */}
            <a
              href="https://x.com/HAHAstage"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow HAHA on X (@HAHAstage)"
              title="Follow @HAHAstage on X"
              className="flex items-center justify-center h-9 w-9 rounded-full border border-white/10 bg-[#12121a]/70 text-zinc-400 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all backdrop-blur-md"
            >
              <XLogoMark size={13} className="text-zinc-300 hover:text-white transition-colors" />
            </a>

            <WalletMenu />

            <Link
              href="/app"
              className="hidden items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-[#ffc53d] to-[#f59e0b] hover:from-[#ffd875] hover:to-[#ffc53d] font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[#070709] shadow-[0_0_24px_rgba(255,197,61,0.35)] hover:shadow-[0_0_32px_rgba(255,197,61,0.55)] hover:scale-[1.02] transition-all sm:inline-flex"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Launch App</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>

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
          <div className="md:hidden mt-3 p-4 rounded-2xl bg-[#0c0c12]/95 border border-white/10 backdrop-blur-2xl shadow-2xl flex flex-col gap-2 animate-hahaDropdownEnter">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className="px-4 py-2.5 rounded-xl font-mono text-xs uppercase tracking-wider text-zinc-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                {link.label}
              </Link>
            ))}
            <a
              href="https://x.com/HAHAstage"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between px-4 py-2.5 rounded-xl font-mono text-xs uppercase tracking-wider text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
            >
              <span className="flex items-center gap-2.5">
                <XLogoMark size={13} className="text-zinc-300" />
                <span>Follow @HAHAstage</span>
              </span>
              <ArrowUpRight className="w-3.5 h-3.5 text-zinc-500" />
            </a>
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
    </>
  );
}
