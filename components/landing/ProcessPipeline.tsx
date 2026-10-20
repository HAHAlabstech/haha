"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Mic,
  Users,
  Coins,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Flame,
  Binary,
  Layers,
} from "lucide-react";

/* 02 · The Protocol Workflow (How It Works).
   Dojang Pinned Feature Runway Architecture:
   On desktop (>900px), a tall runway (340vh) holds a sticky stage (100vh).
   Scrolling scrubs progress continuous variable u (0.000 -> 2.000) across the 3 core protocol steps:
   - Step 01: Take The Stage (Open Mic submission & Straight Man evaluation)
   - Step 02: Blind Crowd Quorum (5-7 human jurors judge side-by-side with zero metadata)
   - Step 03: On-Chain Settlement (Merkle root verification, USDG payout, 20% burn, 10% vault royalty)
   Every scene has continuous spatial translation, 3D card perspective tilt, and blur filtering.
   On mobile/tablet, it stacks as responsive editorial cards without any layout break. */

type StepId = "stage" | "quorum" | "settlement";

interface PipelineStep {
  id: StepId;
  num: string;
  tag: string;
  title: string;
  accent: string;
  accentBg: string;
  accentBorder: string;
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
    accent: "text-[#ffc53d]",
    accentBg: "bg-[#ffc53d]/10",
    accentBorder: "border-[#ffc53d]/30",
    description:
      "Deliver your sharpest real-life nuances, double entendres, or deadpan setups. Choose Open Mic (5 free daily bits, 1.0× multiplier) or stake for Pro Stage (2.5× reward weight against the full Straight Man playbook).",
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
    accent: "text-[#ffc53d]",
    accentBg: "bg-[#ffc53d]/10",
    accentBorder: "border-[#ffc53d]/30",
    description:
      "Your bit enters the Crowd judging queue. Verified human jurors evaluate two anonymous answers side-by-side with zero metadata. A bit earns the 'Killed It' stamp when ≥60% of jurors agree the comedian beat the machine.",
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
    accent: "text-[#ffc53d]",
    accentBg: "bg-[#ffc53d]/10",
    accentBorder: "border-[#ffc53d]/30",
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
    <div className="w-full rounded-2xl border border-[#ffc53d]/25 bg-gradient-to-b from-[#14120e] via-[#0c0c12] to-[#070709] p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
      {/* Terminal Title Bar */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ffc53d] animate-pulse" />
          <span className="font-mono text-xs uppercase tracking-widest text-[#ffc53d] font-semibold">
            Stage Console // Performance Terminal
          </span>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border border-white/10 text-zinc-400 bg-white/5">
          Mode: Open Mic 1.0×
        </span>
      </div>

      {/* Comedian Setup Input Box */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
          <span className="uppercase tracking-wider">Human Submission:</span>
          <span className="text-[#ffc53d]">Entropy: 5.84 bits</span>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/50 p-4 font-mono text-xs sm:text-sm text-zinc-200 leading-relaxed">
          “I told the AI my wife asked me to put myself in her shoes.
          <span className="text-[#ffc53d] block mt-1">
            Now I&apos;m sitting on the bed crying and my ankles hurt.”
          </span>
        </div>
      </div>

      {/* Straight Man AI Response Box */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
          <span className="uppercase tracking-wider text-[#ffc53d]">
            Straight Man AI Reasoning:
          </span>
          <span className="text-zinc-500">Literal Confidence: 99.4%</span>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/60 p-4 font-mono text-xs text-zinc-300 space-y-2">
          <p className="text-zinc-400 italic">
            “Footwear designed for female ergonomics does not accommodate male
            skeletal widths. Crying is an unoptimized biological reaction to
            blisters.”
          </p>
          <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[10px] text-zinc-400">
            <span>Semantic Miss: Subtext Inversion</span>
            <span className="text-[#ffc53d] font-semibold">
              Result: STUMPED
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function BlindQuorumVisual() {
  return (
    <div className="w-full rounded-2xl border border-[#ffc53d]/20 bg-gradient-to-b from-[#121218] via-[#0c0c12] to-[#070709] p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
      {/* Terminal Title Bar */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ffc53d]" />
          <span className="font-mono text-xs uppercase tracking-widest text-[#ffc53d] font-semibold">
            Blind Quorum // Jury Ballot #742
          </span>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border border-[#ffc53d]/30 text-[#ffc53d] bg-[#ffc53d]/10 font-bold">
          Supermajority: 78%
        </span>
      </div>

      {/* Side-by-Side Blind Choices */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="rounded-xl border-2 border-[#ffc53d]/50 bg-black/60 p-4 relative overflow-hidden">
          <div className="font-mono text-[10px] uppercase tracking-widest text-[#ffc53d] font-bold mb-2">
            Option A (Blind)
          </div>
          <p className="text-xs text-zinc-300 font-mono leading-relaxed line-clamp-3">
            “Now I&apos;m sitting on the bed crying and my ankles hurt.”
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#ffc53d]/15 text-[#ffc53d] text-[10px] font-mono font-bold">
            <CheckCircle2 className="w-3 h-3 text-[#ffc53d]" /> 5 Juror Votes
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/30 p-4 opacity-60">
          <div className="font-mono text-[10px] uppercase tracking-widest text-zinc-400 font-medium mb-2">
            Option B (Blind)
          </div>
          <p className="text-xs text-zinc-400 font-mono leading-relaxed line-clamp-3">
            “Footwear designed for female ergonomics does not accommodate male
            skeletal widths...”
          </p>
          <div className="mt-3 text-[10px] font-mono text-zinc-500">
            1 Juror Vote
          </div>
        </div>
      </div>

      {/* Verified Juror Stamp Banner */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-1.5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <span
                key={i}
                className="w-6 h-6 rounded-full border border-black bg-zinc-800 text-[9px] font-mono flex items-center justify-center text-zinc-300 font-bold"
              >
                J{i}
              </span>
            ))}
          </div>
          <span className="font-mono text-xs text-zinc-300">
            6/7 Jurors Consensus
          </span>
        </div>
        <div className="rounded-lg bg-[#ffc53d] text-[#070709] px-3 py-1 font-mono text-xs uppercase font-extrabold tracking-widest shadow-[0_0_15px_rgba(255,197,61,0.4)]">
          KILLED IT
        </div>
      </div>
    </div>
  );
}

function SettlementVisual() {
  return (
    <div className="w-full rounded-2xl border border-[#ffc53d]/20 bg-gradient-to-b from-[#121218] via-[#0c0c12] to-[#070709] p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
      {/* Terminal Title Bar */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ffc53d]" />
          <span className="font-mono text-xs uppercase tracking-widest text-[#ffc53d] font-semibold">
            Settlement Engine // Robinhood Chain
          </span>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-400">
          Merkle Root: 0x9c4e...3b17
        </span>
      </div>

      {/* Rewards & Burn Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="rounded-xl border border-[#ffc53d]/30 bg-black/60 p-4">
          <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-400 block mb-1">
            Comedian Payout
          </span>
          <span className="font-display text-xl sm:text-2xl font-bold text-[#ffc53d]">
            $142.50 <span className="text-xs font-mono">USDG</span>
          </span>
          <span className="text-[10px] font-mono text-zinc-400 block mt-1">
            Settled via Tip Jar Pool
          </span>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/40 p-4">
          <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-400 block mb-1">
            20% Mic Drop Burn
          </span>
          <span className="font-display text-xl sm:text-2xl font-bold text-zinc-100">
            42,800 <span className="text-xs font-mono text-zinc-400">$HAHA</span>
          </span>
          <span className="text-[10px] font-mono text-zinc-400 block mt-1">
            Permanent Buyback & Burn
          </span>
        </div>
      </div>

      {/* Joke Vault Permanent Asset Certificate */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#ffc53d]/10 border border-[#ffc53d]/30 flex items-center justify-center text-[#ffc53d]">
            <Binary className="w-5 h-5" />
          </div>
          <div>
            <span className="font-mono text-xs uppercase tracking-wider text-white font-bold block">
              Joke Vault Asset #BIT-8120
            </span>
            <span className="font-mono text-[10px] text-zinc-400 block">
              10% Perpetual Royalty Share Locked
            </span>
          </div>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-widest text-[#ffc53d] px-2 py-1 rounded bg-[#ffc53d]/10 border border-[#ffc53d]/20 font-bold">
          Immutable
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
      // Progress u: 0.000 to 2.000 across 3 steps
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
      className="haha-pipe-runway relative haha-sec-divider bg-[#050508] text-white"
    >
      <div className="haha-pipe-stage">
        {/* Pinned Top Navigation Header */}
        <div className="flex items-center justify-between w-full border-b border-white/10 pb-3 sm:pb-4 mb-3 sm:mb-6">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs uppercase tracking-[0.24em] text-[#ffc53d] font-semibold flex items-center gap-2">
              <span className="w-1.5 h-1.5 rotate-45 bg-[#ffc53d] inline-block" />
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
                <div className="haha-pipe-copy space-y-3 sm:space-y-4 lg:space-y-5">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`inline-flex items-center justify-center px-2.5 py-1 rounded-md font-mono text-[11px] font-bold uppercase tracking-widest ${s.accentBg} ${s.accent} border ${s.accentBorder}`}
                    >
                      Step {s.num}
                    </span>
                    <span className="font-mono text-xs uppercase tracking-wider text-zinc-400">
                      {s.tag}
                    </span>
                  </div>

                  <h3 className="display-serif text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-white tracking-tight leading-[1.08]">
                    {s.title}
                  </h3>

                  <p className="text-sm sm:text-base lg:text-lg text-zinc-300 leading-relaxed font-light max-w-xl">
                    {s.description}
                  </p>

                  {/* Bullet Highlights */}
                  <ul className="space-y-1.5 sm:space-y-2 border-t border-white/10 pt-3 sm:pt-4 max-w-lg">
                    {s.bullets.map((b) => (
                      <li
                        key={b}
                        className="flex items-start gap-2.5 text-xs text-zinc-300 font-light"
                      >
                        <CheckCircle2
                          className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${s.accent}`}
                        />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Tag Chips & Action Button */}
                  <div className="flex flex-wrap items-center gap-4 pt-2">
                    <Link
                      href={s.ctaLink}
                      className="inline-flex items-center gap-2 rounded-full bg-[#ffc53d] hover:bg-[#ffd875] px-7 py-3.5 font-mono text-xs uppercase tracking-widest text-[#070709] font-bold transition-all duration-200 hover:scale-[1.02] shadow-[0_0_24px_rgba(255,197,61,0.25)]"
                    >
                      <span>{s.ctaText}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>

                    <div className="flex flex-wrap gap-2">
                      {s.chips.map((chip) => (
                        <span
                          key={chip}
                          className="px-3 py-1 rounded-full border border-white/10 bg-white/5 font-mono text-[10px] uppercase tracking-wider text-zinc-400"
                        >
                          {chip}
                        </span>
                      ))}
                    </div>
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
                  ? "bg-white/15 text-white font-bold border border-white/30 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
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
    </section>
  );
}
