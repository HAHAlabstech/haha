"use client";

import { useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import AppHeader, { AppTab } from "./AppHeader";
import StageView from "./views/StageView";
import CrowdView from "./views/CrowdView";
import VaultView from "./views/VaultView";
import TipJarView from "./views/TipJarView";
import LeaderboardView from "./views/LeaderboardView";

interface AppShellProps {
  initialTab?: AppTab;
}

export default function AppShell({ initialTab = "stage" }: AppShellProps) {
  const searchParams = useSearchParams();
  const tabParam = searchParams?.get("tab") as AppTab | null;
  const [activeTab, setActiveTab] = useState<AppTab>(tabParam || initialTab);
  const [dailyPool, setDailyPool] = useState("—");
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
        if (!cancelled && data && typeof data.dailyPoolUSDG === "number") {
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
    <div className="relative min-h-screen bg-[#070709] text-[#f4f4f5] overflow-x-clip selection:bg-[#ffc53d]/30 selection:text-[#ffc53d]">
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
  );
}
