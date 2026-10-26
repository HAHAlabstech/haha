"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Mic,
  ArrowUpRight,
  Database,
  Users,
} from "lucide-react";
import LandingShowtimeHero from "@/components/landing/LandingShowtimeHero";
import SmoothScroll from "@/components/landing/SmoothScroll";
import HumorSpectrogram from "@/components/landing/HumorSpectrogram";
import ProtocolFacts from "@/components/landing/ProtocolFacts";
import ProcessPipeline from "@/components/landing/ProcessPipeline";
import VaultTerminal from "@/components/landing/VaultTerminal";
import SpotlightFeed from "@/components/landing/SpotlightFeed";
import LandingFaq from "@/components/landing/LandingFaq";
import { ScrollReveal } from "@/components/ScrollReveal";

export default function HomePage() {
  const [dailyPoolUSDG, setDailyPoolUSDG] = useState("-");
  const [bitsTotal, setBitsTotal] = useState("8,120");
  const [winRate, setWinRate] = useState("38.4%");

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/bits").then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch("/api/tipjar/summary").then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch("/api/vault/summary").then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]).then(([bitsData, tjData, vaultData]) => {
      if (cancelled) return;
      if (tjData && typeof tjData.dailyPoolUSDGDisplay === "string") {
        setDailyPoolUSDG(tjData.dailyPoolUSDGDisplay);
      } else if (tjData && typeof tjData.dailyPoolUSDG === "number") {
        setDailyPoolUSDG(tjData.dailyPoolUSDG.toLocaleString());
      }
      if (vaultData && typeof vaultData.verifiedCount === "number") {
        setBitsTotal(vaultData.verifiedCount.toLocaleString());
      }
      if (bitsData && typeof bitsData.humanWinRate === "string") {
        setWinRate(bitsData.humanWinRate);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="relative min-h-screen bg-[#070709] text-[#f4f4f7] selection:bg-[#ffc53d]/30 selection:text-[#ffc53d] overflow-x-clip">
      <SmoothScroll />
      {/* =========================================================================
          FULL SCROLL-DRIVEN 360° 3D SHOWTIME HERO RUNWAY
          ========================================================================= */}
      <LandingShowtimeHero />

      {/* =========================================================================
          THE SCIENCE: SCROLL-DRIVEN OVERLAPPING SPECTROGRAM RUNWAY
          (Dojang IdeaScene 2-Column Pinned Runway Architecture)
          ========================================================================= */}
      <HumorSpectrogram />

      {/* =========================================================================
          LIVE PROTOCOL TELEMETRY (Dojang FactsSection 4-Card Grid)
          ========================================================================= */}
      <ProtocolFacts
        dailyPoolUSDG={dailyPoolUSDG}
        bitsTotal={bitsTotal}
        winRate={winRate}
      />

      {/* =========================================================================
          HOW HAHA WORKS: 3-STEP PROCESS PIPELINE
          ========================================================================= */}
      <ProcessPipeline />

      {/* =========================================================================
          THE DATA ENGINE: THE JOKE VAULT & REPLACEMENT COST
          ========================================================================= */}
      <VaultTerminal />

      {/* =========================================================================
          LIVE TELEMETRY & SPOTLIGHT BATTLE FEED
          ========================================================================= */}
      <SpotlightFeed />

      {/* =========================================================================
          BOX OFFICE FAQ
          ========================================================================= */}
      <LandingFaq />

      {/* =========================================================================
          07 · CLIMAX CTA SECTION
          ========================================================================= */}
      <section className="relative haha-sec-divider bg-[#050508] py-36 px-[clamp(20px,4vw,56px)] text-center overflow-hidden">
        {/* Ambient Stage Finale Texture */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-50 mix-blend-screen"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/landing/bg-spotlight.jpg"
            alt=""
            loading="lazy"
            className="w-full h-full object-cover object-center filter saturate-[1.2] contrast-[1.1]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#050508] via-transparent via-transparent to-[#050508]" />
        </div>

        {/* Ambient Stage Spotlight */}
        <div
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] bg-radial from-[#ffc53d]/15 via-[#ffc53d]/03 to-transparent blur-[160px] rounded-full"
        />

        <ScrollReveal direction="scale" className="relative z-10 max-w-3xl mx-auto space-y-6">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#ffc53d] font-semibold text-center">
            Open Mic Is Live
          </p>

          <h2 className="display-serif text-4xl sm:text-6xl lg:text-7xl text-white font-bold tracking-tight leading-[1.04]">
            The stage is set. <em className="italic text-[#ffc53d]">Take the mic.</em>
          </h2>

          <p className="text-base sm:text-lg text-zinc-400 leading-relaxed max-w-xl mx-auto font-light">
            Test your comedic instinct against the Straight Man. 5 free bits every day on Robinhood Chain.
          </p>

          <div className="pt-4 flex flex-wrap justify-center gap-4">
            <Link
              href="/app?tab=stage"
              className="inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-[#ffc53d] to-[#f59e0b] hover:from-[#ffd875] hover:to-[#ffc53d] px-8 py-4 font-mono text-xs uppercase tracking-widest text-[#070709] font-bold transition-all duration-200 hover:scale-[1.02] shadow-[0_0_35px_rgba(255,197,61,0.4)]"
            >
              <Mic className="w-4 h-4" />
              <span>Launch App Now</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>

            <Link
              href="/app?tab=crowd"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#12121a]/80 px-7 py-4 font-mono text-xs uppercase tracking-widest text-zinc-300 backdrop-blur-md transition-all duration-200 hover:bg-white/10 hover:text-white"
            >
              <Users className="w-4 h-4" />
              <span>Join As Juror</span>
            </Link>
          </div>
        </ScrollReveal>
      </section>
    </main>
  );
}
