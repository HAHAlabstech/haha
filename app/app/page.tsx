import { Suspense } from "react";
import type { Metadata } from "next";
import AppShell from "@/components/app/AppShell";

export const metadata: Metadata = {
  title: "HAHA App — Comedy Lab Console",
  description:
    "The official Web3 comedy app on Robinhood Chain. Walk up to the mic, blind judge the crowd, explore the Joke Vault, and claim USDG rewards.",
};

export default function AppPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#060606]">
          <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-widest text-[#ffb13b]">
            <span className="h-2 w-2 rounded-full bg-[#ffb13b] animate-ping" />
            <span>Loading HAHA App Console…</span>
          </div>
        </div>
      }
    >
      <AppShell />
    </Suspense>
  );
}
