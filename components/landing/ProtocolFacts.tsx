"use client";

import { Activity, ShieldCheck, Database, Award } from "lucide-react";

interface ProtocolFactsProps {
  dailyPoolUSDG?: string;
  bitsTotal?: string;
  winRate?: string;
}

export default function ProtocolFacts({
  dailyPoolUSDG = "2,840",
  bitsTotal = "8,120",
  winRate = "38.4%",
}: ProtocolFactsProps) {
  const facts = [
    {
      label: "24h Tip Jar Pool",
      value: `$${dailyPoolUSDG}`,
      unit: "USDG",
      desc: "Daily automated prize pool settled to winning comedians at midnight UTC.",
      icon: Activity,
    },
    {
      label: "Verified Performances",
      value: bitsTotal,
      unit: "Bits",
      desc: "Blind quorum-verified performances archived in the immutable Joke Vault.",
      icon: Database,
    },
    {
      label: "Human Win Rate",
      value: winRate,
      unit: "vs AI",
      desc: "Human comedians successfully outsmarting Straight Man deadpan reasoning.",
      icon: Award,
    },
    {
      label: "Active Contestant",
      value: "Straight Man",
      unit: "S1",
      desc: "Zero-shot frontier LLM with frozen literal priors on Robinhood Chain.",
      icon: ShieldCheck,
    },
  ];

  return (
    <section className="relative haha-sec-divider bg-[#070709] py-28 px-[clamp(20px,4vw,56px)] text-white overflow-hidden">
      {/* Ambient Stage Spotlight */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[350px] bg-radial from-[#ffc53d]/06 via-transparent to-transparent blur-[120px]"
      />
      <div className="max-w-[1440px] mx-auto relative z-10">
        {/* Section Eyebrow & Title */}
        <div className="mb-14 max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#ffc53d] font-semibold flex items-center gap-2 mb-3">
            <span className="w-1.5 h-1.5 rotate-45 bg-[#ffc53d] inline-block" />
            02 — Protocol Telemetry
          </p>
          <h2 className="display-serif text-3xl sm:text-5xl lg:text-6xl text-white font-bold tracking-tight leading-[1.04]">
            Live on-chain metrics. <em className="italic text-[#ffc53d]">Audited in real-time.</em>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-zinc-400 font-light leading-relaxed">
            Every submission, blind jury quorum, and settlement pool is recorded on Robinhood Chain testnet with verifiable state transitions.
          </p>
        </div>

        {/* 4-Card Dojang-Style Facts Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {facts.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={f.label}
                className="haha-glass-panel relative rounded-2xl p-7 flex flex-col justify-between group hover:-translate-y-1"
              >
                <div className="flex items-center justify-between mb-5">
                  <span className="font-mono text-[11px] uppercase tracking-widest text-zinc-400">
                    {`0${i + 1}`} // {f.label}
                  </span>
                  <span className="p-2 rounded-xl bg-white/5 border border-white/10 text-[#ffc53d] group-hover:bg-[#ffc53d]/10 transition-colors">
                    <Icon className="w-4 h-4" />
                  </span>
                </div>

                <div className="flex items-baseline gap-2 mb-3">
                  <span className="font-display font-bold text-3xl sm:text-4xl text-white tabular-nums tracking-tight">
                    {f.value}
                  </span>
                  <span className="font-mono text-xs uppercase tracking-wider text-[#ffc53d] font-semibold">
                    {f.unit}
                  </span>
                </div>

                <p className="text-xs text-zinc-400 leading-relaxed font-light">
                  {f.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
