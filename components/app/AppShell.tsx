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
  const [dailyPool, setDailyPool] = useState("2,840");
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
    <div className="relative min-h-screen bg-[#060606] text-[#f4f4f5]">
      {/* Dedicated Clean App Header with Workspace Switcher */}
      <AppHeader
        activeTab={activeTab}
        onTabChange={handleTabChange}
        dailyPoolUSDG={dailyPool}
      />

      {/* Main Workspace Stage */}
      <main className="relative z-10 animate-fadeIn">
        {activeTab === "stage" && <StageView />}
        {activeTab === "crowd" && <CrowdView />}
        {activeTab === "vault" && <VaultView />}
        {activeTab === "tipjar" && <TipJarView />}
        {activeTab === "leaderboard" && <LeaderboardView />}
      </main>
    </div>
  );
}
