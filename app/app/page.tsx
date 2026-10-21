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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/logo-transparent.webp"
              alt="HAHA Logo"
              className="h-16 w-auto object-contain filter drop-shadow-[0_0_20px_rgba(255,197,61,0.5)] animate-pulse"
            />
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
