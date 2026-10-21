"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

type StepId = "stage" | "quorum" | "settlement";

interface PipelineStep {
  id: StepId;
  num: string;
  tag: string;
  title: string;
  description: string;
  bullets: string[];
  chips: string[];
  ctaText: string;
  ctaLink: string;
}

const STEPS: PipelineStep[] = [
  {
    id: "stage",
    num: "01",
    tag: "The Human Challenge",
    title: "Take The Stage",
    description:
      "Deliver your sharpest real-life nuances, double entendres, or deadpan setups. Choose Open Mic (5 free daily bits, 1.0× multiplier) or Pro Stage (2.5× reward weight against the full Straight Man playbook).",
    bullets: [
      "Open Mic is free: 5 bits recharged every 24 hours",
      "Stump the AI's literal chain-of-thought analysis",
      "Instant Straight Man automated response & punchline",
    ],
    chips: ["Open Mic · Free", "Pro Stage · 2.5×", "Subtext Valence"],
    ctaText: "Launch Stage Console",
    ctaLink: "/app?tab=stage",
  },
  {
    id: "quorum",
    num: "02",
    tag: "The Blind Jury",
    title: "Blind Crowd Quorum",
    description:
      "Your bit enters the Crowd judging queue. Verified human jurors evaluate two anonymous answers side-by-side with zero metadata. A bit wins when ≥60% of jurors agree the comedian beat the machine.",
    bullets: [
      "Blind evaluation: no handles, no wallet addresses",
      "5 to 7 human jurors per bit quorum",
      "Honeypots & calibration prevent bot collusion",
    ],
    chips: ["Zero Metadata", "60% Supermajority", "Anti-Sybil Honeypots"],
    ctaText: "Join The Jury",
    ctaLink: "/app?tab=crowd",
  },
  {
    id: "settlement",
    num: "03",
    tag: "The Payout Engine",
    title: "On-Chain Settlement",
    description:
      "At midnight UTC, the settlement engine compiles verified wins into a Merkle root on Robinhood Chain. Winning comedians claim real USDG directly from the Tip Jar; 20% buys and burns $HAHA via Mic Drop; 10% is locked as perpetual data royalties in the Joke Vault.",
    bullets: [
      "Verifiable Merkle proof claims directly in USDG",
      "20% Mic Drop permanent buyback & burn",
      "10% lifetime royalty when labs license your bit",
    ],
    chips: ["USDG Payouts", "20% Mic Drop Burn", "10% Joke Vault Royalties"],
    ctaText: "Inspect Vault & Tip Jar",
    ctaLink: "/app?tab=vault",
  },
];

/* ---- Visual Instruments for the Right Half ---- */

function StageConsoleVisual() {
  return (
    <div className="haha-glass-panel w-full rounded-2xl p-6 sm:p-8 space-y-6">
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 font-mono text-[11px] uppercase tracking-[0.16em]">
        <span className="text-[#ffc53d]">Stage Console // Performance Terminal</span>
        <span className="text-zinc-500">Open Mic 1.0×</span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 uppercase tracking-[0.14em]">
          <span>Human Submission</span>
          <span className="text-[#ffc53d]">Entropy 5.84 bits</span>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-[#070709] p-5 display-serif text-lg sm:text-xl text-zinc-100 leading-relaxed font-normal">
          “I told the AI my wife asked me to put myself in her shoes. Now I&apos;m sitting on the bed crying and my ankles hurt.”
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-[0.14em]">
          <span className="text-zinc-500">Straight Man Literal Read</span>
          <span className="text-zinc-500">Confidence 99.4%</span>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-[#070709]/80 p-5 text-xs sm:text-[13px] text-zinc-400 leading-relaxed font-light space-y-3">
          <p>
            “Footwear designed for female ergonomics does not accommodate male skeletal widths. Crying is an unoptimized biological reaction to blisters.”
          </p>
          <div className="flex items-center justify-between pt-3 border-t border-white/[0.06] font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">
            <span>Subtext Inversion</span>
            <span className="text-[#ffc53d]">Literal Miss</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function BlindQuorumVisual() {
  return (
    <div className="haha-glass-panel w-full rounded-2xl p-6 sm:p-8 space-y-6">
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 font-mono text-[11px] uppercase tracking-[0.16em]">
        <span className="text-[#ffc53d]">Blind Quorum // Jury Ballot #742</span>
        <span className="text-zinc-400">Supermajority 86%</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-[#ffc53d]/40 bg-[#070709] p-5 flex flex-col justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#ffc53d] mb-3">
              Option A · Blind
            </div>
            <p className="text-xs sm:text-[13px] text-zinc-200 leading-relaxed font-light">
              “The husband took an idiomatic request for empathy literally and wore her high heels.”
            </p>
          </div>
          <div className="mt-5 pt-3 border-t border-white/[0.07] font-mono text-[11px] text-[#ffc53d]">
            6 Juror Votes
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#070709]/50 p-5 flex flex-col justify-between opacity-65">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500 mb-3">
              Option B · Blind
            </div>
            <p className="text-xs sm:text-[13px] text-zinc-400 leading-relaxed font-light">
              “Footwear designed for female ergonomics does not accommodate male skeletal widths.”
            </p>
          </div>
          <div className="mt-5 pt-3 border-t border-white/[0.07] font-mono text-[11px] text-zinc-500">
            1 Juror Vote
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-[#070709] px-5 py-4 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.16em]">
        <span className="text-zinc-400">6/7 Jurors · 100% Fair</span>
        <span className="text-[#ffc53d]">Comedian Wins</span>
      </div>
    </div>
  );
}

function SettlementVisual() {
  return (
    <div className="haha-glass-panel w-full rounded-2xl p-6 sm:p-8 space-y-6">
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 font-mono text-[11px] uppercase tracking-[0.16em]">
        <span className="text-[#ffc53d]">Settlement Engine // Robinhood Chain</span>
        <span className="text-zinc-500">Root 0x9c4e…3b17</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-white/[0.08] bg-[#070709] p-5">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500 block mb-2">
            Comedian Payout
          </span>
          <span className="display-serif text-2xl sm:text-3xl font-bold text-white tabular-nums">
            $142.50 <span className="text-xs font-mono text-[#ffc53d]">USDG</span>
          </span>
          <span className="text-[11px] font-mono text-zinc-500 block mt-2">
            Claimable via TipJar.sol
          </span>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#070709] p-5">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500 block mb-2">
            20% Mic Drop Burn
          </span>
          <span className="display-serif text-2xl sm:text-3xl font-bold text-white tabular-nums">
            42,800 <span className="text-xs font-mono text-zinc-400">$HAHA</span>
          </span>
          <span className="text-[11px] font-mono text-zinc-500 block mt-2">
            Permanent Buyback &amp; Burn
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-[#070709] px-5 py-4 flex items-center justify-between font-mono text-[11px]">
        <span className="text-zinc-400 uppercase tracking-[0.14em]">
          Vault Asset #BIT-8120 · 10% Perpetual Royalty
        </span>
        <span className="text-[#ffc53d] uppercase tracking-[0.16em]">
          Anchored
        </span>
      </div>
    </div>
  );
}

const VISUALS: Record<StepId, () => React.JSX.Element> = {
  stage: StageConsoleVisual,
  quorum: BlindQuorumVisual,
  settlement: SettlementVisual,
};

export default function ProcessPipeline() {
  const [mode, setMode] = useState<"pinned" | "stacked">("pinned");
  const [activeStep, setActiveStep] = useState<number>(0);
  const runwayRef = useRef<HTMLDivElement>(null);
  const sceneRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const mq = window.matchMedia(
      "(min-width: 900px) and (min-height: 640px) and (prefers-reduced-motion: no-preference)",
    );
    const apply = () => setMode(mq.matches ? "pinned" : "stacked");
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const runway = runwayRef.current;
    if (!runway) return;
    let raf = 0;

    const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

    const onScroll = () => {
      raf = 0;
      if (mode !== "pinned") return;

      const rect = runway.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      if (travel <= 0) return;

      const scrolled = -rect.top;
      const u = Math.max(0, Math.min(2, (scrolled / travel) * 2));

      for (let i = 0; i < STEPS.length; i++) {
        const scene = sceneRefs.current[i];
        if (!scene) continue;
        const d = u - i;
        const v = clamp01(1 - Math.abs(d) / 0.45);
        scene.style.setProperty("--v", v.toFixed(3));
        scene.style.setProperty("--d", d.toFixed(3));
        const isActive = Math.abs(d) < 0.35;
        scene.dataset.active = isActive ? "true" : "false";
      }

      const activeIdx = Math.max(0, Math.min(2, Math.round(u)));
      setActiveStep(activeIdx);
    };

    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(onScroll);
    };

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    onScroll();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [mode]);

  const scrollToStep = (idx: number) => {
    const runway = runwayRef.current;
    if (!runway) return;
    const travel = runway.clientHeight - window.innerHeight;
    const targetTop = runway.offsetTop + (idx / 2) * travel;
    window.scrollTo({ top: targetTop, behavior: "smooth" });
  };

  return (
    <section
      id="how-it-works"
      ref={runwayRef}
      data-mode={mode}
      className="haha-pipe-runway relative haha-sec-divider bg-[#070709] text-white"
    >
      <div className="haha-pipe-stage">
        {/* Full-bleed Ambient Background Texture */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-35 mix-blend-screen"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/landing/bg-pipeline.jpg"
            alt=""
            loading="lazy"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#070709] via-transparent to-[#070709]" />
        </div>

        {/* Exact max-w-[1440px] Inner Container Matching All Other Sections */}
        <div className="haha-pipe-inner">
          {/* Pinned Top Navigation Header */}
          <div className="flex items-center justify-between w-full border-b border-white/10 pb-3 sm:pb-4 mb-3 sm:mb-6">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs uppercase tracking-[0.24em] text-[#ffc53d] font-semibold">
                03 — The Protocol Workflow
              </span>
              <span className="text-zinc-600 hidden sm:inline">/</span>
              <span className="font-mono text-xs uppercase tracking-wider text-zinc-400 hidden sm:inline">
                How The Comedy Club Works
              </span>
            </div>

            <div className="font-mono text-xs text-zinc-400">
              Step <b className="text-white font-bold">0{activeStep + 1}</b> / 03
            </div>
          </div>

          {/* 3 Story Scenes */}
          <div className="haha-pipe-scenes">
            {STEPS.map((s, idx) => {
              const Visual = VISUALS[s.id];
              const isFirst = idx === 0;
              return (
                <div
                  key={s.id}
                  ref={(el) => {
                    sceneRefs.current[idx] = el;
                  }}
                  data-step-index={idx}
                  data-active={activeStep === idx ? "true" : "false"}
                  className="haha-pipe-scene"
                  style={
                    mode === "pinned"
                      ? ({
                          "--v": isFirst ? "1" : "0",
                          "--d": isFirst ? "0" : String(idx),
                        } as React.CSSProperties)
                      : undefined
                  }
                >
                  {/* Left Half: Story Copy */}
                  <div className="haha-pipe-copy space-y-4 sm:space-y-5">
                    <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.18em]">
                      <span className="text-[#ffc53d] font-semibold">
                        Step {s.num}
                      </span>
                      <span className="text-zinc-600">·</span>
                      <span className="text-zinc-400">{s.tag}</span>
                    </div>

                    <h3 className="display-serif text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-white tracking-tight leading-[1.06]">
                      {s.title}
                    </h3>

                    <p className="text-sm sm:text-base lg:text-lg text-zinc-300 leading-relaxed font-light max-w-xl">
                      {s.description}
                    </p>

                    {/* Clean Hairline Highlights */}
                    <ul className="space-y-2 border-t border-white/10 pt-4 max-w-lg">
                      {s.bullets.map((b) => (
                        <li
                          key={b}
                          className="flex items-baseline gap-3 text-xs sm:text-[13px] text-zinc-400 font-light"
                        >
                          <span className="h-1 w-1 rounded-full bg-[#ffc53d] shrink-0" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Action Link */}
                    <div className="flex flex-wrap items-center gap-4 pt-2">
                      <Link
                        href={s.ctaLink}
                        className="inline-flex items-center gap-2 rounded-full bg-[#ffc53d] hover:bg-[#ffd875] px-7 py-3.5 font-mono text-xs uppercase tracking-widest text-[#070709] font-bold transition-all duration-200 hover:scale-[1.02] shadow-[0_0_24px_rgba(255,197,61,0.25)]"
                      >
                        <span>{s.ctaText}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>

                  {/* Right Half: Live Transforming Visual Card */}
                  <div className="haha-pipe-visual">
                    <Visual />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pinned Bottom Step Rail Indicator */}
          <div className="hidden lg:flex items-center justify-center gap-3 pt-4 border-t border-white/10">
            {STEPS.map((step, i) => (
              <button
                key={step.id}
                type="button"
                onClick={() => scrollToStep(i)}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-mono text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                  activeStep === i
                    ? "bg-white/15 text-white font-bold border border-white/30"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5 border border-transparent"
                }`}
              >
                <span className={activeStep === i ? "text-[#ffc53d]" : ""}>
                  0{i + 1}
                </span>
                <span>{step.title}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
