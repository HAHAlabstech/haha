import { Suspense } from "react";
import type { Metadata } from "next";
import AppShell from "@/components/app/AppShell";
import { RobinhoodLogoMark } from "@/components/RobinhoodLogo";

export const metadata: Metadata = {
  title: "HAHA App — Comedy Lab Console",
  description:
    "The official Web3 comedy app on Robinhood Chain. Walk up to the mic, blind judge the crowd, explore the Joke Vault, and claim USDG rewards.",
};

export default function AppPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#070709]">
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center p-1 bg-[#121218] border border-[#ffc53d]/40 shadow-[0_0_24px_rgba(255,197,61,0.35)] animate-pulse">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/logo-transparent.png"
                alt="HAHA Logo"
                className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(255,197,61,0.5)]"
              />
            </div>
            <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[#ffc53d]">
              <RobinhoodLogoMark size={14} color="#ffc53d" />
              <span>Loading HAHA App Console…</span>
            </div>
          </div>
        </div>
      }
    >
      <AppShell />
    </Suspense>
  );
}
