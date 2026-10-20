"use client";

import { Database, Sparkles, Layers, Orbit, Scale, ArrowUpRight, Shield, Coins } from "lucide-react";
import Link from "next/link";

const CATEGORIES = [
  {
    key: "irony_sarcasm",
    title: "Irony & Deadpan",
    icon: Sparkles,
    tag: "Valence Inversion",
    description: "Bits where the intended message directly inverts the surface text. Impossible for surface pattern matchers to solve without theory of mind.",
    stats: "2,410 Verified Bits · $12.00 / bit",
  },
  {
    key: "cultural_vernacular",
    title: "Slang & Generational Context",
    icon: Layers,
    tag: "Cultural Memory",
    description: "Colloquial humor, local double meanings, and generational vernacular that hasn't made it into Wikipedia or static training dumps.",
    stats: "1,890 Verified Bits · $12.00 / bit",
  },
  {
    key: "anti_humor_absurdist",
    title: "Anti-Humor & Absurdism",
    icon: Orbit,
    tag: "Syllogistic Rupture",
    description: "Jokes that purposefully subvert the expectation of a standard punchline, generating comedic relief through pure irrationality.",
    stats: "1,640 Verified Bits · $12.00 / bit",
  },
  {
    key: "innuendo_subtext",
    title: "Innuendo & Double Meaning",
    icon: Scale,
    tag: "Parallel Interpretation",
    description: "Carefully calibrated wordplay that requires evaluating two competing semantic universes simultaneously to comprehend the humor.",
    stats: "2,180 Verified Bits · $12.00 / bit",
  },
];

export default function VaultTerminal() {
  return (
    <section id="vault" className="relative haha-sec-divider bg-[#070709] py-28 px-[clamp(20px,4vw,56px)] text-white overflow-hidden">
      {/* Ambient Luxury Vault Background Texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-35 mix-blend-screen"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/landing/bg-vault.jpg"
          alt=""
          loading="lazy"
          className="w-full h-full object-cover object-center filter saturate-[1.05] contrast-[1.1]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#070709] via-transparent to-[#070709]" />
      </div>

      {/* Ambient Stage Spotlight */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/4 right-1/4 w-[750px] h-[450px] bg-radial from-[#ffc53d]/06 via-transparent to-transparent blur-[140px]"
      />

      <div className="max-w-[1440px] mx-auto relative z-10">
        {/* Header with Title & Stats */}
        <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-end mb-16">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#ffc53d] font-semibold flex items-center gap-2 mb-3">
              <span className="w-1.5 h-1.5 rotate-45 bg-[#ffc53d] inline-block" />
              04 — The Data Engine
            </p>
            <h2 className="display-serif text-3xl sm:text-5xl lg:text-6xl text-white font-bold tracking-tight leading-[1.04]">
              The Joke Vault: <em className="italic text-[#ffc53d]">Provenance-signed nuance data.</em>
            </h2>
            <p className="mt-4 text-base sm:text-lg text-zinc-400 font-light leading-relaxed max-w-2xl">
              Every verified bit becomes an immutable data asset. AI labs license this multi-rater benchmark to teach frontier reasoning models the human art of subtext.
            </p>
          </div>

          {/* Live Replacement Cost Terminal Card */}
          <div className="haha-glass-panel relative rounded-2xl p-7 shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
              <span className="font-mono text-[11px] uppercase tracking-widest text-zinc-400">
                Live Replacement Cost
              </span>
              <span className="font-mono text-[11px] uppercase tracking-wider text-[#ffc53d] font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ffc53d] animate-pulse" />
                Audited Metric
              </span>
            </div>

            <div className="display-serif text-4xl sm:text-5xl text-white font-bold tabular-nums">
              $105,420<span className="text-xl text-[#ffc53d]">.00</span>
            </div>
            <p className="mt-2 text-xs text-zinc-400 leading-relaxed font-light">
              Theoretical cost for an AI enterprise to independently source, adversarially benchmark, and human-verify comparable humor tokens.
            </p>

            <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between">
              <Link
                href="/app?tab=vault"
                className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-[#ffc53d] hover:text-white transition-colors"
              >
                <span>Explore Joke Vault</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/app?tab=vault"
                className="font-mono text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Enterprise API &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* 4 Category Taxonomy Cards */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <div
                key={cat.key}
                className="haha-glass-panel group rounded-2xl p-7 backdrop-blur-md shadow-2xl flex flex-col justify-between hover:-translate-y-1 relative"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-[#ffc53d] group-hover:bg-[#ffc53d]/10 transition-colors">
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className="font-mono text-[9px] uppercase tracking-widest text-zinc-400">
                      {cat.tag}
                    </span>
                  </div>
                  <h3 className="display-serif text-xl text-white font-bold group-hover:text-[#ffc53d] transition-colors mb-2">
                    {cat.title}
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed font-light">
                    {cat.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between font-mono text-[10px] text-zinc-400">
                  <span className="text-zinc-300">{cat.stats.split(" · ")[0]}</span>
                  <span className="text-[#ffc53d] font-semibold">{cat.stats.split(" · ")[1]}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Revenue Split Ribbon */}
        <div className="haha-glass-panel mt-12 rounded-2xl p-7 flex flex-wrap items-center justify-between gap-6 font-mono text-xs">
          <div className="flex items-center gap-3">
            <Coins className="w-4 h-4 text-[#ffc53d]" />
            <span className="text-zinc-200 font-semibold uppercase tracking-wider">Vault Revenue Distribution:</span>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-zinc-400">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#ffc53d]" />
              <span><b className="text-white">30%</b> to Daily Tip Jar Pool</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-zinc-400" />
              <span><b className="text-white">20%</b> to $HAHA Permanent Mic Drop Burns</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-white" />
              <span><b className="text-white">10%</b> to Contributing Comedian Royalties</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
