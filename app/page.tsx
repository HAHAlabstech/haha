"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Mic,
  ArrowUpRight,
  Database,
  Flame,
  Users,
} from "lucide-react";
import ClubStage3D from "@/components/ClubStage3D";
import HumorSpectrogram from "@/components/landing/HumorSpectrogram";
import ProcessPipeline from "@/components/landing/ProcessPipeline";
import VaultTerminal from "@/components/landing/VaultTerminal";
import SpotlightFeed from "@/components/landing/SpotlightFeed";
import LandingFaq from "@/components/landing/LandingFaq";

export default function HomePage() {
  const [dailyPoolUSDG, setDailyPoolUSDG] = useState("2,840");
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
      if (tjData && typeof tjData.dailyPoolUSDG === "number") {
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
    <main className="relative min-h-screen bg-[#060606] text-[#f4f4f5] selection:bg-[#ffb13b]/30 selection:text-[#ffb13b] overflow-x-hidden">
      {/* =========================================================================
          HERO SECTION: 3D ROBOT STAGE + CINEMATIC HEADLINE
          ========================================================================= */}
      <section className="relative min-h-[92vh] flex flex-col justify-end px-[clamp(20px,4vw,56px)] pt-32 pb-16 max-w-[1440px] mx-auto overflow-hidden">
        {/* 3D WebGL / 2D Canvas Stage Background */}
        <ClubStage3D />

        {/* Foreground Content */}
        <div className="relative z-10 max-w-4xl space-y-8">
          {/* Eyebrow Pill */}
          <div className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-[#09090c]/80 px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-[#ffb13b] backdrop-blur-md shadow-lg">
            <span className="h-1.5 w-1.5 rounded-full bg-[#ffb13b] shadow-[0_0_8px_#ffb13b] animate-pulse" />
            <span>Robinhood Chain Testnet · Season 01</span>
          </div>

          {/* Editorial Display Headline */}
          <h1 className="display-serif text-5xl sm:text-7xl lg:text-8xl font-normal tracking-tight text-[#f4f4f5] leading-[0.95]">
            The comedy club where you stump the AI and{" "}
            <em className="font-serif italic text-[#ffb13b]">get paid.</em>
          </h1>

          {/* Subtitle */}
          <p className="max-w-2xl text-lg sm:text-xl text-zinc-300 leading-relaxed font-sans">
            Perform against the deadpan Straight Man on Robinhood Chain. Verified by a blind human crowd. Winning bits settle daily from the Tip Jar in USDG.
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              href="/stage"
              className="inline-flex items-center gap-2.5 rounded-full bg-[#ffb13b] px-7 py-4 font-mono text-xs uppercase tracking-widest text-[#060606] font-semibold transition-all duration-200 hover:bg-[#ffa71a] hover:scale-[1.02] shadow-[0_0_24px_rgba(255,177,59,0.35)]"
            >
              <Mic className="w-4 h-4" />
              <span>Launch App &middot; Take the Stage</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>

            <Link
              href="/vault"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-4 font-mono text-xs uppercase tracking-widest text-zinc-200 backdrop-blur-md transition-all duration-200 hover:bg-white/10 hover:text-white"
            >
              <Database className="w-4 h-4 text-zinc-400" />
              <span>Explore Joke Vault</span>
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================================
          TELEMETRY TICKER STRIP
          ========================================================================= */}
      <section className="relative z-10 border-y border-white/10 bg-[#09090c]/90 backdrop-blur-md py-6 px-[clamp(20px,4vw,56px)]">
        <div className="max-w-[1440px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="flex flex-col">
            <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
              24h Tip Jar Pool
            </span>
            <span className="display-serif text-2xl sm:text-3xl text-[#f4f4f5] mt-1 tabular-nums">
              ${dailyPoolUSDG} <span className="text-sm font-mono text-[#ffb13b]">USDG</span>
            </span>
          </div>

          <div className="flex flex-col">
            <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
              Verified Performances
            </span>
            <span className="display-serif text-2xl sm:text-3xl text-[#f4f4f5] mt-1 tabular-nums">
              {bitsTotal} <span className="text-sm font-mono text-zinc-400">Bits</span>
            </span>
          </div>

          <div className="flex flex-col">
            <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
              Human Win Rate
            </span>
            <span className="display-serif text-2xl sm:text-3xl text-emerald-400 mt-1 tabular-nums">
              {winRate}
            </span>
          </div>

          <div className="flex flex-col">
            <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
              AI Contestant
            </span>
            <span className="display-serif text-2xl sm:text-3xl text-[#3b82f6] mt-1">
              Straight Man <span className="text-xs font-mono text-zinc-400">S1</span>
            </span>
          </div>
        </div>
      </section>

      {/* =========================================================================
          THE SCIENCE: INTERACTIVE HUMOR SPECTROGRAM CURVE
          ========================================================================= */}
      <HumorSpectrogram />

      {/* =========================================================================
          THE PROTOCOL: 3-STEP PROCESS PIPELINE
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
          CLIMAX CTA SECTION
          ========================================================================= */}
      <section className="relative py-28 px-[clamp(20px,4vw,56px)] max-w-[1440px] mx-auto text-center overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-[#ffb13b]/10 blur-[130px] rounded-full"
        />

        <div className="relative z-1 max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 font-mono text-[10px] uppercase tracking-[0.2em] text-[#ffb13b]">
            <Flame className="w-3 h-3" />
            <span>Open Mic Is Live</span>
          </div>

          <h2 className="display-serif text-4xl sm:text-6xl text-[#f4f4f5] tracking-tight">
            The stage is set. <em className="italic text-[#ffb13b]">Take the mic.</em>
          </h2>

          <p className="text-base sm:text-lg text-zinc-400 leading-relaxed max-w-xl mx-auto">
            Test your comedic instinct against the Straight Man. 5 free bits every day on Robinhood Chain testnet.
          </p>

          <div className="pt-4 flex flex-wrap justify-center gap-4">
            <Link
              href="/stage"
              className="inline-flex items-center gap-2.5 rounded-full bg-[#ffb13b] px-8 py-4 font-mono text-xs uppercase tracking-widest text-[#060606] font-semibold transition-all duration-200 hover:bg-[#ffa71a] hover:scale-[1.02] shadow-[0_0_28px_rgba(255,177,59,0.4)]"
            >
              <Mic className="w-4 h-4" />
              <span>Launch App Now</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>

            <Link
              href="/crowd"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-4 font-mono text-xs uppercase tracking-widest text-zinc-300 backdrop-blur-md transition-all duration-200 hover:bg-white/10 hover:text-white"
            >
              <Users className="w-4 h-4" />
              <span>Join As Juror</span>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
