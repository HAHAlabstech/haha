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
} from "lucide-react";
import WalletMenu from "@/components/WalletMenu";
import { RobinhoodLogoMark } from "@/components/RobinhoodLogo";

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
  dailyPoolUSDG = "2,840",
}: AppHeaderProps) {
  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-white/[0.08] bg-[#070709]/90 backdrop-blur-xl transition-all">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-[clamp(16px,3vw,36px)]">
          {/* Left: Brand mark + Return to Landing */}
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="group flex items-center gap-2.5 font-display text-sm font-bold tracking-[0.2em] text-white transition-colors hover:text-[#ffc53d]"
              aria-label="Back to landing"
            >
              <div className="relative w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center p-0.5 bg-[#121218] border border-white/10 group-hover:border-[#ffc53d]/50 group-hover:scale-105 transition-all shadow-[0_0_12px_rgba(255,197,61,0.25)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/logo-transparent.png"
                  alt="HAHA Logo"
                  className="w-full h-full object-contain filter drop-shadow-[0_0_6px_rgba(255,197,61,0.4)]"
                />
              </div>
              <span className="font-display font-bold text-base tracking-[0.2em]">HAHA</span>
            </Link>

            <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-zinc-400">
              Season 01
            </span>

            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-zinc-400 transition hover:bg-white/5 hover:text-white"
              title="Return to Story Landing Page"
            >
              <ArrowLeft className="h-3 w-3" />
              <span className="hidden md:inline">Website</span>
            </Link>
          </div>

          {/* Center: Sleek Workspace Switcher */}
          <nav
            className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1 backdrop-blur-md"
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
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] transition-all duration-200 cursor-pointer ${
                    active
                      ? "bg-gradient-to-r from-[#ffc53d] to-[#f59e0b] text-[#070709] font-bold shadow-[0_0_16px_rgba(255,197,61,0.35)]"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className={`h-3 w-3 ${active ? "text-[#070709]" : "text-zinc-500"}`} />
                  <span className="hidden sm:inline">{t.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right: Network info + Pool + Wallet Menu */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live Pool Pill */}
            <div className="hidden lg:flex items-center gap-1.5 rounded-full border border-[#ffc53d]/25 bg-[#ffc53d]/10 px-3 py-1 font-mono text-[10px] text-[#ffc53d]">
              <Flame className="h-3 w-3" />
              <span>${dailyPoolUSDG} USDG</span>
            </div>

            {/* Network Pill */}
            <div className="hidden xl:flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-[10px] text-zinc-300">
              <RobinhoodLogoMark size={14} color="#ffc53d" />
              <span className="font-semibold tracking-wide text-zinc-200">Robinhood Chain</span>
            </div>

            {/* Wallet Menu (logo + address + balances + disconnect) */}
            <WalletMenu />
          </div>
        </div>
      </header>
    </>
  );
}
