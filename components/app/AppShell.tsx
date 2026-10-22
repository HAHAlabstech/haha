"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import AppHeader, { AppTab } from "./AppHeader";
import StageView from "./views/StageView";
import CrowdView from "./views/CrowdView";
import VaultView from "./views/VaultView";
import TipJarView from "./views/TipJarView";
import LeaderboardView from "./views/LeaderboardView";
import { XLogoMark } from "@/components/XLogo";

interface AppShellProps {
  initialTab?: AppTab;
}

export default function AppShell({ initialTab = "stage" }: AppShellProps) {
  const searchParams = useSearchParams();
  const tabParam = searchParams?.get("tab") as AppTab | null;
  const [activeTab, setActiveTab] = useState<AppTab>(tabParam || initialTab);
  const [dailyPool, setDailyPool] = useState("-");
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (tabParam && ["stage", "crowd", "vault", "tipjar", "leaderboard"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/tipjar/summary")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data && typeof data.dailyPoolUSDGDisplay === "string") {
          setDailyPool(data.dailyPoolUSDGDisplay);
        } else if (!cancelled && data && typeof data.dailyPoolUSDG === "number") {
          setDailyPool(data.dailyPoolUSDG.toLocaleString());
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const handleTabChange = (nextTab: AppTab) => {
    startTransition(() => {
      setActiveTab(nextTab);
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.set("tab", nextTab);
        window.history.replaceState(null, "", url.toString());
      }
    });
  };

  return (
    <div className="relative min-h-screen bg-[#070709] text-[#f4f4f5] overflow-x-clip selection:bg-[#ffc53d]/30 selection:text-[#ffc53d] flex flex-col justify-between">
      <div>
        {/* Ambient Stage Lighting Glow */}
        <div
          aria-hidden
          className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[550px] bg-radial from-[#ffc53d]/06 via-[#ffc53d]/01 to-transparent blur-[160px] rounded-full z-0"
        />

        {/* Subtle Ambient Stage Texture */}
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-25 mix-blend-screen"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/landing/bg-spotlight.jpg"
            alt=""
            className="w-full h-full object-cover object-top filter saturate-[1.1] contrast-[1.1]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#070709]/80 via-[#070709]/90 to-[#070709]" />
        </div>

        {/* Dedicated Clean App Header with Workspace Switcher */}
        <AppHeader
          activeTab={activeTab}
          onTabChange={handleTabChange}
          dailyPoolUSDG={dailyPool}
        />

        {/* Main Workspace Stage */}
        <main key={activeTab} className="relative z-10 animate-hahaTabEnter">
          {activeTab === "stage" && <StageView />}
          {activeTab === "crowd" && <CrowdView />}
          {activeTab === "vault" && <VaultView />}
          {activeTab === "tipjar" && <TipJarView />}
          {activeTab === "leaderboard" && <LeaderboardView />}
        </main>
      </div>

      {/* Sleek App Console Footer */}
      <footer className="relative z-10 border-t border-white/[0.08] bg-[#070709]/85 backdrop-blur-xl px-[clamp(20px,4vw,56px)] py-5 mt-20">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-500">
          <div className="flex items-center gap-2">
            <span className="text-zinc-300 font-semibold tracking-wider">HAHA</span>
            <span>·</span>
            <span>AI Comedy Lab on Robinhood Chain</span>
          </div>

          <div className="flex items-center gap-4 sm:gap-6">
            <a
              href="https://x.com/HAHAlabstech"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow HAHA on X (@HAHAlabstech)"
              className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors"
              title="Follow @HAHAlabstech on X"
            >
              <XLogoMark size={13} className="text-zinc-300" />
              <span>@HAHAlabstech</span>
            </a>
            <Link href="/contracts" className="hover:text-white transition-colors">
              Contracts
            </Link>
            <Link href="/#faq" className="hover:text-white transition-colors">
              FAQ
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
