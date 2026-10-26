"use client";

import Link from "next/link";
import {
  Mic,
  Users,
  Database,
  Coins,
  Trophy,
  ArrowLeft,
  Flame,
  HelpCircle,
} from "lucide-react";
import WalletMenu from "@/components/WalletMenu";
import { RobinhoodLogoMark } from "@/components/RobinhoodLogo";
import { XLogoMark } from "@/components/XLogo";

export type AppTab = "stage" | "crowd" | "vault" | "tipjar" | "leaderboard";

interface AppHeaderProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  dailyPoolUSDG?: string;
}

const TABS: { id: AppTab; label: string; icon: typeof Mic }[] = [
  { id: "stage", label: "Stage", icon: Mic },
  { id: "crowd", label: "Crowd", icon: Users },
  { id: "vault", label: "Vault", icon: Database },
  { id: "tipjar", label: "Tip Jar", icon: Coins },
  { id: "leaderboard", label: "Leaderboard", icon: Trophy },
];

export default function AppHeader({
  activeTab,
  onTabChange,
  dailyPoolUSDG = "-",
}: AppHeaderProps) {
  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-white/[0.08] bg-[#070709]/90 backdrop-blur-xl transition-all px-[clamp(20px,4vw,56px)]">
        <div className="mx-auto flex min-h-16 max-w-[1440px] flex-wrap items-center justify-between gap-x-3 gap-y-2 py-2">
          {/* Left: Brand mark + Return to Landing */}
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/"
              className="group flex items-center gap-2.5 font-display text-sm font-bold tracking-[0.2em] text-white transition-colors hover:text-[#ffc53d]"
              aria-label="Back to landing"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/logo-transparent.webp"
                alt="HAHA Logo"
                className="h-7 w-auto object-contain transition-transform duration-200 group-hover:scale-105 filter drop-shadow-[0_0_8px_rgba(255,197,61,0.35)]"
              />
              <span className="font-display font-bold text-base tracking-[0.2em]">HAHA</span>
            </Link>

            <Link
              href="/seasons"
              className="hidden sm:inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-zinc-400 transition hover:bg-white/10 hover:text-white"
              title="Season 1 rules & disclosures"
            >
              Season 1
            </Link>

            <Link
              href="/"
              className="hidden items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-zinc-400 transition hover:bg-white/5 hover:text-white sm:inline-flex"
              title="Return to Story Landing Page"
            >
              <ArrowLeft className="h-3 w-3" />
              <span className="hidden md:inline">Website</span>
            </Link>
            <Link
              href="/#how-it-works"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-zinc-400 transition hover:bg-white/5 hover:text-white"
              title="How the Stage -> Straight Man -> Crowd loop works"
            >
              <HelpCircle className="h-3 w-3" />
              <span className="hidden md:inline">Flow</span>
            </Link>
          </div>

          {/* Center: Sleek Workspace Switcher */}
          <nav
            className="order-3 -mx-1 flex w-full min-w-0 items-center gap-1 overflow-x-auto rounded-full border border-white/10 bg-white/[0.03] p-1 backdrop-blur-md sm:order-none sm:mx-0 sm:w-auto sm:justify-center"
            aria-label="App Workspace"
          >
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onTabChange(t.id)}
                  aria-label={t.label}
                  aria-current={active ? "page" : undefined}
                  title={t.label}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] transition-all duration-200 cursor-pointer ${
                    active
                      ? "bg-gradient-to-r from-[#ffc53d] to-[#f59e0b] text-[#070709] font-bold shadow-[0_0_16px_rgba(255,197,61,0.35)]"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className={`h-3 w-3 ${active ? "text-[#070709]" : "text-zinc-500"}`} />
                  <span className="hidden md:inline">{t.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right: Network info + Pool + X Logo + Wallet Menu */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {/* Live Pool Pill */}
            <div className="hidden lg:flex items-center gap-1.5 rounded-full border border-[#ffc53d]/25 bg-[#ffc53d]/10 px-3 py-1 font-mono text-[10px] text-[#ffc53d]">
              <Flame className="h-3 w-3" />
              <span>{dailyPoolUSDG === "-" ? "Pool unavailable" : `$${dailyPoolUSDG} USDG`}</span>
            </div>

            {/* Network Pill */}
            <div className="hidden xl:flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-[10px] text-zinc-300">
              <RobinhoodLogoMark size={14} color="#ffc53d" />
              <span className="font-semibold tracking-wide text-zinc-200">Robinhood Chain</span>
            </div>

            {/* X (Twitter) Link */}
            <a
              href="https://x.com/HAHAstage"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow HAHA on X (@HAHAstage)"
              title="Follow @HAHAstage on X"
              className="flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-full border border-white/10 bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all"
            >
              <XLogoMark size={13} className="text-zinc-300 hover:text-white transition-colors" />
            </a>

            {/* Wallet Menu (logo + address + balances + disconnect) */}
            <WalletMenu />
          </div>
        </div>
      </header>
    </>
  );
}
