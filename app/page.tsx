"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Mic,
  Orbit,
  Sparkles,
  CheckCircle2,
  Coins,
  Database,
  Flame,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react";
import ClubStage3D from "@/components/ClubStage3D";
import CategorySets from "@/components/CategorySets";

interface SpotlightBit {
  id: string;
  category: string;
  text: string;
  result: string;
}

const DEFAULT_SPOTLIGHT: SpotlightBit[] = [
  {
    id: "",
    category: "SET 01 · PUNCHLINE",
    text: "My therapist told me to write letters to the people I'm angry at and then burn them. Good news: I did the letters. What do I do with the people?",
    result: "Killed it vs Straight Man S1",
  },
  {
    id: "",
    category: "SET 02 · SUBTEXT",
    text: "“No worries at all!! Totally get it. Maybe next year haha.”",
    result: "Killed it vs Straight Man S1",
  },
  {
    id: "",
    category: "SET 03 · IRL",
    text: "A guest arrives at 7:00 PM sharp for a 7:00 PM dinner party. The host opens the door in a towel holding a wet spatula.",
    result: "Killed it vs Straight Man S1",
  },
];

const CAT_LABEL: Record<string, string> = {
  punchline: "SET 01 · PUNCHLINE",
  subtext: "SET 02 · SUBTEXT",
  irl: "SET 03 · IRL",
  double_meaning: "SET 04 · DOUBLE MEANING",
};

export default function HomePage() {
  const [bitsToday, setBitsToday] = useState<string>("—");
  const [killedToday, setKilledToday] = useState<string>("—");
  const [tipJarUsdg, setTipJarUsdg] = useState<string>("—");
  const [vaultCost, setVaultCost] = useState<string>("$684,200");
  const [spotlight, setSpotlight] = useState<SpotlightBit[]>(DEFAULT_SPOTLIGHT);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/bits").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/tipjar/summary").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/vault/summary").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([bitsData, tjData, vaultData]) => {
        if (cancelled) return;
        if (bitsData) {
          if (typeof bitsData.bitsToday === "number") {
            setBitsToday(bitsData.bitsToday.toString());
          }
          if (typeof bitsData.killedItToday === "number") {
            setKilledToday(bitsData.killedItToday.toString());
          }
          if (
            Array.isArray(bitsData.spotlight) &&
            bitsData.spotlight.length > 0
          ) {
            setSpotlight(
              bitsData.spotlight.map(
                (b: {
                  id: string;
                  category: string;
                  scenario: string;
                  season?: string;
                }) => ({
                  id: b.id,
                  category: CAT_LABEL[b.category] ?? b.category.toUpperCase(),
                  text: b.scenario,
                  result: `Killed it vs ${b.season ?? "Straight Man S1"}`,
                }),
              ),
            );
          }
        }
        if (tjData?.escrow?.tipJarMicroUsdg) {
          try {
            const val = Number(BigInt(tjData.escrow.tipJarMicroUsdg)) / 1e6;
            setTipJarUsdg(
              `$${val.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`,
            );
          } catch {
            // keep default
          }
        }
        if (typeof vaultData?.replacementCostUsd === "number") {
          setVaultCost(
            `$${vaultData.replacementCostUsd.toLocaleString("en-US")}`,
          );
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="bg-[#060606] text-zinc-100">
      {/* ==================== 3D STAGE HERO ==================== */}
      <section className="stage-hero relative" id="top">
        <ClubStage3D />

        <div className="stage-hud">
          <div>
            <div className="inline-flex items-center gap-2 mb-3">
              <span className="hud-badge text-[10px]">
                <Flame className="w-3 h-3 text-[#ffb13b]" />
                Season 01 Live · The Straight Man
              </span>
            </div>
            <h1 className="stage-title mt-2">
              Tell a joke. <em className="text-[#ffb13b]">Fool the AI.</em> Get paid.
            </h1>
          </div>

          <div className="stage-meta">
            <p className="text-zinc-300 leading-relaxed text-sm">
              Center stage sits <b>The Straight Man</b> — an AI with
              encyclopedic grammar and zero sense of humor. Stump it in front of
              a staked human crowd and earn your share of tonight&apos;s{" "}
              <b className="text-[#ffb13b]">Tip Jar</b>.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/stage" className="pill-btn hot flex items-center gap-2">
                <Mic className="w-3.5 h-3.5" />
                <span>Take the stage</span>
              </Link>
              <Link href="/showtime" className="pill-btn flex items-center gap-2">
                <Orbit className="w-3.5 h-3.5 text-zinc-400" />
                <span>360° Showtime Orbit</span>
              </Link>
            </div>
            <a href="#lineup" className="scroll-cue flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
              <span className="line" aria-hidden="true" />
              <span>Scroll for tonight&apos;s lineup</span>
            </a>
          </div>
        </div>
      </section>

      {/* ==================== LIVE CLUB TELEMETRY STRIP ==================== */}
      <section
        aria-label="Live club telemetry"
        className="border-y border-white/10 bg-[#08080b] px-[clamp(20px,4vw,56px)] py-8 relative z-20"
      >
        <div className="mx-auto grid max-w-[1440px] gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="laocoon-card p-5 border-l-2 border-l-[#ffb13b]">
            <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-[#ffb13b]" />
                01 · Bits Performed Today
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-[#ffb13b] shadow-[0_0_8px_#ffb13b]" />
            </div>
            <div className="display-serif mt-2 text-4xl text-white tabular-nums">
              {bitsToday}
            </div>
            <div className="mt-2 font-mono text-[10px] text-zinc-500">
              Active open mic submissions
            </div>
          </div>

          <div className="laocoon-card p-5 border-l-2 border-l-[#3b82f6]">
            <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-[#3b82f6]" />
                02 · Killed It Today
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-[#3b82f6] shadow-[0_0_8px_#3b82f6]" />
            </div>
            <div className="display-serif mt-2 text-4xl text-[#ffb13b] tabular-nums">
              {killedToday}
            </div>
            <div className="mt-2 font-mono text-[10px] text-zinc-500">
              Stumped Straight Man quorum
            </div>
          </div>

          <div className="laocoon-card p-5 border-l-2 border-l-[#ffb13b]">
            <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400">
              <span className="flex items-center gap-1.5">
                <Coins className="w-3 h-3 text-[#ffb13b]" />
                03 · On-Chain Tip Jar
              </span>
              <span className="hud-badge text-[9px] py-0 px-1.5">USDG</span>
            </div>
            <div className="display-serif mt-2 text-4xl text-white tabular-nums">
              {tipJarUsdg}
            </div>
            <div className="mt-2 font-mono text-[10px] text-zinc-500">
              Robinhood Chain pool
            </div>
          </div>

          <div className="laocoon-card p-5 border-l-2 border-l-[#10b981]">
            <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400">
              <span className="flex items-center gap-1.5">
                <Database className="w-3 h-3 text-[#10b981]" />
                04 · Vault Corpus Value
              </span>
              <span className="hud-badge text-[9px] py-0 px-1.5 border-[#10b981]/30 text-[#10b981]">HNSW</span>
            </div>
            <div className="display-serif mt-2 text-4xl text-[#10b981] tabular-nums">
              {vaultCost}
            </div>
            <div className="mt-2 font-mono text-[10px] text-zinc-500">
              Adversarial nuance dataset
            </div>
          </div>
        </div>
      </section>

      {/* ==================== RECENTLY KILLED IT (SPOTLIGHT) ==================== */}
      <section
        aria-label="Bits that killed it"
        className="px-[clamp(20px,4vw,56px)] pt-24 pb-16 relative z-20"
      >
        <div className="mx-auto max-w-[1440px]">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 mb-3">
                <span className="hud-badge text-[10px]">
                  <Flame className="w-3 h-3 text-[#ffb13b]" />
                  Standing Ovation · Live Feed
                </span>
              </div>
              <h2 className="display-serif mt-1 text-4xl text-white md:text-5xl">
                Recently <em className="text-[#ffb13b]">killed it</em> on stage.
              </h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/vault" className="laocoon-pill flex items-center gap-1.5">
                <span>Inspect the Joke Vault</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
              <Link href="/tipjar" className="laocoon-pill flex items-center gap-1.5">
                <span>Tip Jar &amp; Claims</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {spotlight.map((b, idx) => (
              <div key={b.id || `${b.text}-${idx}`} className="laocoon-card p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-[#ffb13b]">
                      {b.category}
                    </span>
                    <span className="dots flex gap-1">
                      <i className="h-1.5 w-1.5 rounded-full bg-[#ffb13b]" />
                      <i className="h-1.5 w-1.5 rounded-full bg-[#ffb13b]/60" />
                      <i className="h-1.5 w-1.5 rounded-full bg-[#ffb13b]/30" />
                    </span>
                  </div>
                  <p className="font-serif text-lg leading-relaxed text-zinc-100 mt-4">
                    “{b.text}”
                  </p>
                </div>
                <div className="flex items-center justify-between gap-3 pt-6 border-t border-white/10 mt-6">
                  <span className="hud-badge text-[10px] flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-[#ffb13b]" />
                    <span>{b.result}</span>
                  </span>
                  {b.id ? (
                    <Link
                      href={`/bit/${encodeURIComponent(b.id)}`}
                      className="font-mono text-[11px] uppercase tracking-widest text-[#ffb13b] hover:text-[#ffd27d] flex items-center gap-1 transition-colors"
                    >
                      <span>Inspect Bit</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  ) : (
                    <Link
                      href="/stage"
                      className="font-mono text-[11px] uppercase tracking-widest text-zinc-400 hover:text-[#ffb13b] flex items-center gap-1 transition-colors"
                    >
                      <span>Try on Stage</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== LINEUP & 4 DEEP-DIVE SETS ==================== */}
      <CategorySets />
    </div>
  );
}
