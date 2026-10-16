"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
    text: "“No worries at all!! Totally get it 😊 Maybe next year haha.”",
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
    <div>
      {/* ==================== 3D STAGE HERO ==================== */}
      <section className="stage-hero" id="top">
        <ClubStage3D />

        <div className="stage-hud">
          <div>
            <span className="eyebrow">
              Humans Are Hard to Automate · Season 01
            </span>
            <h1 className="stage-title mt-3">
              Tell a joke. <em>Fool the AI.</em> Get paid.
            </h1>
          </div>

          <div className="stage-meta">
            <p>
              Center stage sits <b>The Straight Man</b> — an AI with
              encyclopedic grammar and zero sense of humor. Stump it in front of
              a staked human crowd and earn your share of tonight&apos;s{" "}
              <b>Tip Jar</b>.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/stage" className="pill-btn hot">
                <span>🎤 Take the stage</span>
              </Link>
              <Link href="/showtime" className="pill-btn">
                <span>✦ 360° Showtime Orbit</span>
              </Link>
            </div>
            <a href="#lineup" className="scroll-cue">
              <span className="line" aria-hidden="true" />
              <span>Scroll for tonight&apos;s lineup</span>
            </a>
          </div>
        </div>
      </section>

      {/* ==================== LIVE CLUB TELEMETRY STRIP ==================== */}
      <section
        aria-label="Live club telemetry"
        className="border-b border-[#efe8dc]/12 bg-[#110e0b] px-[clamp(20px,4vw,56px)] py-10"
      >
        <div className="mx-auto grid max-w-[1440px] gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="border-l border-[#ffb13b]/45 pl-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#a49b8e]">
              01 · Bits Performed Today
            </div>
            <div className="display-serif mt-1.5 text-4xl text-[#fff6ed] tabular-nums">
              {bitsToday}
            </div>
          </div>

          <div className="border-l border-[#efe8dc]/15 pl-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#a49b8e]">
              02 · Killed It Today
            </div>
            <div className="display-serif mt-1.5 text-4xl text-[#ffb13b] tabular-nums">
              {killedToday}
            </div>
          </div>

          <div className="border-l border-[#efe8dc]/15 pl-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#a49b8e]">
              03 · On-Chain Tip Jar (USDG)
            </div>
            <div className="display-serif mt-1.5 text-4xl text-[#fff6ed] tabular-nums">
              {tipJarUsdg}
            </div>
          </div>

          <div className="border-l border-[#efe8dc]/15 pl-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#a49b8e]">
              04 · Joke Vault Replacement Cost
            </div>
            <div className="display-serif mt-1.5 text-4xl text-[#8fb596] tabular-nums">
              {vaultCost}
            </div>
          </div>
        </div>
      </section>

      {/* ==================== RECENTLY KILLED IT (SPOTLIGHT) ==================== */}
      <section
        aria-label="Bits that killed it"
        className="px-[clamp(20px,4vw,56px)] pt-20 pb-8"
      >
        <div className="mx-auto max-w-[1440px]">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
            <div>
              <span className="eyebrow">Standing Ovation · Live Feed</span>
              <h2 className="display-serif mt-3 text-4xl text-[#fff6ed] md:text-5xl">
                Recently <em>killed it</em> on stage.
              </h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/vault" className="pill-btn">
                <span>Inspect the Joke Vault →</span>
              </Link>
              <Link href="/tipjar" className="pill-btn">
                <span>Tip Jar &amp; Claims →</span>
              </Link>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {spotlight.map((b, idx) => (
              <div key={b.id || `${b.text}-${idx}`} className="screen">
                <div className="screen-bar">
                  <span>{b.category}</span>
                  <span className="dots">
                    <i />
                    <i />
                    <i />
                  </span>
                </div>
                <div className="screen-body">
                  <p className="quote">“{b.text}”</p>
                  <div className="flex items-center justify-between gap-3 pt-4">
                    <span className="stamp">★ {b.result}</span>
                    {b.id ? (
                      <Link
                        href={`/bit/${encodeURIComponent(b.id)}`}
                        className="font-mono text-[11px] uppercase tracking-widest text-[#ffb13b] underline hover:text-[#ffd27d]"
                      >
                        Inspect Bit →
                      </Link>
                    ) : (
                      <Link
                        href="/stage"
                        className="font-mono text-[11px] uppercase tracking-widest text-[#a49b8e] hover:text-[#ffb13b]"
                      >
                        Try on Stage →
                      </Link>
                    )}
                  </div>
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
