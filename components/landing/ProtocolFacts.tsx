"use client";

import { RobinhoodLogoMark } from "@/components/RobinhoodLogo";
import { ScrollReveal } from "@/components/ScrollReveal";

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
      desc: "Rewards settle only from verified USDG funding after an eligible epoch is finalized.",
    },
    {
      label: "Verified Performances",
      value: bitsTotal,
      unit: "Bits",
      desc: "Blind quorum-verified performances archived in the immutable Joke Vault.",
    },
    {
      label: "Human Win Rate",
      value: winRate,
      unit: "vs AI",
      desc: "Human comedians successfully outsmarting Straight Man deadpan reasoning.",
    },
    {
      label: "Active Contestant",
      value: "Straight Man",
      unit: "S1",
      desc: "Zero-shot frontier LLM with frozen literal priors on Robinhood Chain.",
    },
  ];

  return (
    <section className="relative haha-sec-divider bg-[#070709] py-28 px-[clamp(20px,4vw,56px)] text-white overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-40 mix-blend-screen"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/landing/bg-spectrogram.jpg"
          alt=""
          loading="lazy"
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#070709] via-transparent to-[#070709]" />
      </div>

      <div className="max-w-[1440px] mx-auto relative z-10">
        {/* Section Eyebrow & Title */}
        <ScrollReveal className="mb-14 max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#ffc53d] font-semibold mb-3">
            02 / Arena Telemetry
          </p>
          <h2 className="display-serif text-3xl sm:text-5xl lg:text-6xl text-white font-bold tracking-tight leading-[1.04]">
            Live on-chain metrics. <em className="italic text-[#ffc53d]">Audited in real-time.</em>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-zinc-400 font-light leading-relaxed flex items-center gap-2 flex-wrap">
            <span>Every submission, blind jury quorum, and settlement pool is recorded on</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-white/10 bg-white/5 font-mono text-xs text-white">
              <RobinhoodLogoMark size={13} color="#ffc53d" />
              <span>Robinhood Chain</span>
            </span>
            <span>with verifiable state transitions.</span>
          </p>
        </ScrollReveal>

        {/* 4-Card Editorial Facts Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {facts.map((f, idx) => (
            <ScrollReveal key={f.label} delayMs={idx * 100} className="h-full">
              <div className="haha-glass-panel relative h-full rounded-2xl p-7 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:border-white/20">
                <div>
                  <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-zinc-500 block mb-5">
                    {f.label}
                  </span>

                  <div className="flex items-baseline gap-2.5 mb-4">
                    <span className="display-serif font-bold text-4xl sm:text-[42px] text-white tabular-nums tracking-tight leading-none">
                      {f.value}
                    </span>
                    <span className="font-mono text-xs uppercase tracking-wider text-[#ffc53d]">
                      {f.unit}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-zinc-400 leading-relaxed font-light border-t border-white/[0.07] pt-4">
                  {f.desc}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
