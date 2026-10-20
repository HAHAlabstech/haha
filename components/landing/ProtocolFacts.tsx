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
    <section className="relative border-t border-white/[0.08] bg-[#070709] py-24 px-[clamp(20px,4vw,56px)] text-white">
      <div className="max-w-[1440px] mx-auto">
        {/* Section Eyebrow & Title */}
        <div className="mb-12 max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#ffc53d] font-semibold flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rotate-45 bg-[#ffc53d] inline-block" />
            02 — Protocol Telemetry
          </p>
          <h2 className="display-serif text-3xl sm:text-5xl text-white font-bold tracking-tight leading-[1.05]">
            Live on-chain metrics. <em className="italic text-[#ffc53d]">Audited in real-time.</em>
          </h2>
          <p className="mt-3 text-base text-zinc-400 font-light leading-relaxed">
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
                className="relative rounded-2xl border border-white/10 bg-gradient-to-b from-[#111116] to-[#0c0c12] p-6 shadow-xl transition-all duration-300 hover:border-[#ffc53d]/40 hover:-translate-y-1"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-[11px] uppercase tracking-widest text-zinc-400">
                    {`0${i + 1}`} // {f.label}
                  </span>
                  <Icon className="w-4 h-4 text-[#ffc53d]" />
                </div>

                <div className="flex items-baseline gap-2 mb-2">
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
