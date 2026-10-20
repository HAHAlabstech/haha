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
    <section id="vault" className="relative py-24 px-[clamp(20px,4vw,56px)] max-w-[1440px] mx-auto">
      {/* Background Glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/3 -right-20 w-[600px] h-[400px] bg-[#ffc53d]/5 blur-[140px] rounded-full"
      />

      {/* Header with Title & Stats */}
      <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-end mb-16">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 font-mono text-[10px] uppercase tracking-[0.2em] text-[#ffc53d] mb-4">
            <Database className="w-3 h-3" />
            <span>The Data Engine</span>
          </div>
          <h2 className="display-serif text-3xl sm:text-5xl text-[#f4f4f5] tracking-tight">
            The Joke Vault: <em>Provenance-Signed Nuance Data.</em>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-zinc-400 leading-relaxed max-w-2xl">
            Every verified bit becomes an immutable data asset. AI labs license this multi-rater benchmark to teach frontier reasoning models the human art of subtext.
          </p>
        </div>

        {/* Live Replacement Cost Terminal Card */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#121218] to-[#0c0c12] p-6 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
            <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">
              Live Replacement Cost
            </span>
            <span className="font-mono text-[11px] uppercase tracking-wider text-[#ffc53d] font-medium">
              Audited Metric
            </span>
          </div>

          <div className="display-serif text-4xl sm:text-5xl text-[#f4f4f5] font-semibold tabular-nums">
            $105,420<span className="text-xl text-[#ffc53d]">.00</span>
          </div>
          <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
            Theoretical cost for an AI enterprise to independently source, adversarially benchmark, and human-verify comparable humor tokens.
          </p>

          <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between">
            <Link
              href="/vault"
              className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-[#ffc53d] hover:text-white transition-colors"
            >
              <span>Explore Joke Vault</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/producers"
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
              className="group rounded-2xl border border-white/10 bg-[#0c0c12]/80 p-6 backdrop-blur-md shadow-lg transition-all duration-300 hover:border-[#ffc53d]/30 hover:-translate-y-1 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-[#ffc53d] group-hover:bg-[#ffc53d]/10 transition-colors">
                    <Icon className="w-4 h-4" />
                  </span>
                  <span className="font-mono text-[9px] uppercase tracking-widest text-zinc-500">
                    {cat.tag}
                  </span>
                </div>
                <h3 className="display-serif text-xl text-[#f4f4f5] group-hover:text-white transition-colors mb-2">
                  {cat.title}
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {cat.description}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between font-mono text-[10px] text-zinc-500">
                <span className="text-zinc-300">{cat.stats.split(" · ")[0]}</span>
                <span className="text-[#ffc53d]">{cat.stats.split(" · ")[1]}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Revenue Split Ribbon */}
      <div className="mt-12 rounded-xl border border-white/10 bg-[#0c0c10] p-6 flex flex-wrap items-center justify-between gap-6 font-mono text-xs">
        <div className="flex items-center gap-3">
          <Coins className="w-4 h-4 text-[#ffc53d]" />
          <span className="text-zinc-300 font-semibold uppercase tracking-wider">Vault Revenue Distribution:</span>
        </div>
        <div className="flex flex-wrap items-center gap-6 text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#ffc53d]" />
            <span><b>30%</b> to Daily Tip Jar Pool</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-zinc-400" />
            <span><b>20%</b> to $HAHA Permanent Mic Drop Burns</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-white" />
            <span><b>10%</b> to Contributing Comedian Royalties</span>
          </div>
        </div>
      </div>
    </section>
  );
}
