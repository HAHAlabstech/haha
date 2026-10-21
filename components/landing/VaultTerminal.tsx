"use client";

import Link from "next/link";

const CATEGORIES = [
  {
    key: "irony_sarcasm",
    title: "Irony & Deadpan",
    tag: "Valence Inversion",
    description:
      "Bits where the intended message directly inverts the surface text. Impossible for surface pattern matchers to solve without theory of mind.",
    count: "2,410 verified",
    rate: "$12.00 / bit",
  },
  {
    key: "cultural_vernacular",
    title: "Slang & Context",
    tag: "Cultural Memory",
    description:
      "Colloquial humor, local double meanings, and generational vernacular that hasn't made it into static pre-training dumps.",
    count: "1,890 verified",
    rate: "$12.00 / bit",
  },
  {
    key: "anti_humor_absurdist",
    title: "Anti-Humor",
    tag: "Syllogistic Rupture",
    description:
      "Jokes that purposefully subvert the expectation of a standard punchline, generating comedic relief through pure irrationality.",
    count: "1,640 verified",
    rate: "$12.00 / bit",
  },
  {
    key: "innuendo_subtext",
    title: "Double Meaning",
    tag: "Parallel Reading",
    description:
      "Carefully calibrated wordplay that requires evaluating two competing semantic universes simultaneously to comprehend the humor.",
    count: "2,180 verified",
    rate: "$12.00 / bit",
  },
];

export default function VaultTerminal() {
  return (
    <section
      id="vault"
      className="relative haha-sec-divider bg-[#070709] py-28 px-[clamp(20px,4vw,56px)] text-white overflow-hidden"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-30 mix-blend-screen"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/landing/bg-vault.jpg"
          alt=""
          loading="lazy"
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#070709] via-transparent to-[#070709]" />
      </div>

      <div className="max-w-[1440px] mx-auto relative z-10">
        {/* Header with Title & Stats */}
        <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-end mb-16">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#ffc53d] font-semibold mb-3">
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
          <div className="haha-glass-panel relative rounded-2xl p-8">
            <div className="flex items-center justify-between border-b border-white/[0.07] pb-4 mb-5 font-mono text-[11px] uppercase tracking-[0.16em]">
              <span className="text-zinc-500">Live Replacement Cost</span>
              <span className="text-[#ffc53d]">Preliminary Metric</span>
            </div>

            <div className="display-serif text-4xl sm:text-5xl text-white font-bold tabular-nums tracking-tight">
              $105,420<span className="text-xl text-[#ffc53d]">.00</span>
            </div>
            <p className="mt-3 text-xs text-zinc-400 leading-relaxed font-light">
              Estimated vendor replacement cost to independently source, adversarially benchmark, and human-verify comparable nuance tokens.
            </p>

            <div className="mt-6 pt-4 border-t border-white/[0.07] flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.16em]">
              <Link
                href="/app?tab=vault"
                className="text-[#ffc53d] hover:text-white transition-colors"
              >
                Explore Vault &rarr;
              </Link>
              <Link
                href="/producers"
                className="text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                License Dataset &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* 4 Category Taxonomy Cards — Pure Editorial Typography */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIES.map((cat) => (
            <div
              key={cat.key}
              className="haha-glass-panel rounded-2xl p-8 flex flex-col justify-between transition-colors duration-300 hover:border-white/20"
            >
              <div>
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#ffc53d] block mb-4">
                  {cat.tag}
                </span>
                <h3 className="display-serif text-2xl text-white font-normal tracking-tight mb-3">
                  {cat.title}
                </h3>
                <p className="text-[13px] text-zinc-400 leading-relaxed font-light">
                  {cat.description}
                </p>
              </div>

              <div className="mt-8 pt-4 border-t border-white/[0.07] flex items-center justify-between font-mono text-[11px]">
                <span className="text-zinc-500">{cat.count}</span>
                <span className="text-zinc-300">{cat.rate}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Revenue Split Ribbon */}
        <div className="haha-glass-panel mt-8 rounded-2xl px-8 py-5 flex flex-wrap items-center justify-between gap-6 font-mono text-xs">
          <span className="text-zinc-400 uppercase tracking-[0.16em] text-[11px]">
            On-Chain Licensing Split
          </span>
          <div className="flex flex-wrap items-center gap-8 text-zinc-400 text-[11px]">
            <span><b className="text-white font-normal">30%</b> Daily Tip Jar</span>
            <span><b className="text-white font-normal">20%</b> $HAHA Mic Drop Burn</span>
            <span><b className="text-white font-normal">10%</b> Comedian Royalties</span>
            <span><b className="text-white font-normal">40%</b> Protocol Treasury</span>
          </div>
        </div>
      </div>
    </section>
  );
}
