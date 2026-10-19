"use client";

import { Mic, Users, Coins, ArrowUpRight, CheckCircle2, Flame, ShieldCheck } from "lucide-react";
import Link from "next/link";

const STEPS = [
  {
    num: "01",
    tag: "The Challenge",
    title: "Take The Stage",
    icon: Mic,
    accent: "text-[#ffc53d]",
    accentBg: "bg-[#ffc53d]/10",
    accentBorder: "border-[#ffc53d]/30",
    description:
      "Deliver your sharpest real-life moments, double entendres, or deadpan setups. Choose Open Mic (5 free daily bits, 1.0× multiplier) or stake for Pro Stage (2.5× reward weight against the full Straight Man playbook).",
    bullets: [
      "Open Mic is free: 5 bits every 24 hours",
      "Stump the AI's literal chain-of-thought",
      "Instant Straight Man automated response",
    ],
    ctaText: "Go to Stage",
    ctaLink: "/stage",
  },
  {
    num: "02",
    tag: "The Jury",
    title: "Blind Crowd Quorum",
    icon: Users,
    accent: "text-[#3b82f6]",
    accentBg: "bg-[#3b82f6]/10",
    accentBorder: "border-[#3b82f6]/30",
    description:
      "Your bit enters the Crowd judging queue. Verified human jurors evaluate two anonymous answers side-by-side with zero metadata. A bit earns the 'Killed It' stamp when ≥60% of jurors agree the comedian beat the machine.",
    bullets: [
      "Blind evaluation: no handles, no wallet addresses",
      "5 to 7 human jurors per bit quorum",
      "Honeypots & calibration prevent bot collusion",
    ],
    ctaText: "Join the Jury",
    ctaLink: "/crowd",
  },
  {
    num: "03",
    tag: "The Payout",
    title: "On-Chain Settlement",
    icon: Coins,
    accent: "text-emerald-400",
    accentBg: "bg-emerald-400/10",
    accentBorder: "border-emerald-400/30",
    description:
      "At midnight UTC, the settlement engine compiles verified wins into a Merkle root on Robinhood Chain. Winning comedians claim real USDG from the Tip Jar; 20% buys and burns $HAHA via Mic Drop; 10% is locked as perpetual data royalties.",
    bullets: [
      "Verifiable Merkle proof claims in USDG",
      "20% Mic Drop permanent buyback & burn",
      "10% lifetime royalty when labs license your bit",
    ],
    ctaText: "Check Tip Jar",
    ctaLink: "/tipjar",
  },
];

export default function ProcessPipeline() {
  return (
    <section id="how-it-works" className="relative py-24 px-[clamp(20px,4vw,56px)] max-w-[1440px] mx-auto">
      {/* Section Header */}
      <div className="max-w-3xl mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 font-mono text-[10px] uppercase tracking-[0.2em] text-[#ffc53d] mb-4">
          <ShieldCheck className="w-3 h-3" />
          <span>The Protocol Workflow</span>
        </div>
        <h2 className="display-serif text-3xl sm:text-5xl text-[#f4f4f5] tracking-tight">
          How the comedy club <em>actually works.</em>
        </h2>
        <p className="mt-4 text-base sm:text-lg text-zinc-400 leading-relaxed">
          From open mic submission to on-chain USDG settlement. Zero trust required — verified by blind human consensus and backed by cryptographic proofs.
        </p>
      </div>

      {/* 3-Step Interactive Process Cards */}
      <div className="relative grid gap-8 lg:grid-cols-3">
        {STEPS.map((s, idx) => {
          const Icon = s.icon;
          return (
            <div
              key={s.num}
              className="group relative rounded-2xl border border-white/10 bg-gradient-to-b from-[#111116] via-[#0c0c12] to-[#070709] p-8 shadow-xl transition-all duration-300 hover:border-white/20 hover:-translate-y-1 flex flex-col justify-between"
            >
              {/* Card Header & Step Indicator */}
              <div>
                <div className="flex items-center justify-between border-b border-white/10 pb-5 mb-6">
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${s.accentBg} ${s.accent} border ${s.accentBorder}`}>
                      <Icon className="w-5 h-5" />
                    </span>
                    <div>
                      <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                        Step {s.num}
                      </span>
                      <h4 className="font-mono text-xs uppercase tracking-wider text-zinc-300 font-semibold">
                        {s.tag}
                      </h4>
                    </div>
                  </div>
                  <span className="font-serif text-2xl text-zinc-600 font-italic group-hover:text-zinc-400 transition-colors">
                    #{s.num}
                  </span>
                </div>

                <h3 className="display-serif text-2xl text-[#f4f4f5] mb-3 group-hover:text-white transition-colors">
                  {s.title}
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed mb-6">
                  {s.description}
                </p>

                {/* Checklist Features */}
                <ul className="space-y-2.5 mb-8 border-t border-white/5 pt-5">
                  {s.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2.5 text-xs text-zinc-300 leading-normal">
                      <CheckCircle2 className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${s.accent}`} />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Bottom Card Action */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                <Link
                  href={s.ctaLink}
                  className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-[#ffc53d] hover:text-white transition-colors group-hover:underline"
                >
                  <span>{s.ctaText}</span>
                  <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
                {idx === 2 ? (
                  <span className="inline-flex items-center gap-1 font-mono text-[10px] text-emerald-400 bg-emerald-400/10 px-2.5 py-0.5 rounded-full border border-emerald-400/20">
                    <Flame className="w-3 h-3 text-[#ffc53d]" />
                    <span>Daily Burns</span>
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
