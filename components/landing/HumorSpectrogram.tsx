"use client";

import { useState } from "react";
import { Sparkles, Activity, Cpu, ShieldAlert, Info, ArrowUpRight } from "lucide-react";
import Link from "next/link";

type ScenarioMode = "irony" | "innuendo" | "absurdist";

interface ScenarioData {
  title: string;
  tag: string;
  humanSignalDesc: string;
  aiFailureMode: string;
  entropy: string;
  ambiguity: string;
  aiConfusionRate: string;
  punchlineSetup: string;
  humanCurvePath: string;
  aiCurvePath: string;
}

const SCENARIOS: Record<ScenarioMode, ScenarioData> = {
  irony: {
    title: "Irony & Tone Inversion",
    tag: "Subtext Inversion",
    humanSignalDesc: "Literal statement deliberately contradicts true emotional valence. Human audience immediately detects deadpan acoustic drop.",
    aiFailureMode: "Classifies as genuine sentiment; Straight Man replies with earnest, helpful literal advice.",
    entropy: "4.82 bits",
    ambiguity: "96.4%",
    aiConfusionRate: "89.2%",
    punchlineSetup: "“I just love spending three hours on hold with airline customer support. It's really how I unwind.”",
    humanCurvePath: "M 0 120 C 60 40, 110 200, 180 60 C 240 -10, 310 180, 380 90 C 450 10, 520 160, 600 70 C 670 10, 730 140, 800 110",
    aiCurvePath: "M 0 110 L 180 110 L 180 60 L 380 60 L 380 110 L 600 110 L 600 60 L 800 60",
  },
  innuendo: {
    title: "Innuendo & Layered Reading",
    tag: "Dual Resonance",
    humanSignalDesc: "Simultaneous surface innocence and taboo implication. Brain resolves dual semantics in parallel.",
    aiFailureMode: "Collapses onto the G-rated surface interpretation, missing the double meaning entirely.",
    entropy: "5.14 bits",
    ambiguity: "98.7%",
    aiConfusionRate: "93.5%",
    punchlineSetup: "“My roomba has seen things in this apartment it refuses to clean up.”",
    humanCurvePath: "M 0 100 C 50 180, 130 10, 210 140 C 290 10, 370 190, 460 30 C 540 180, 620 20, 710 130 C 760 80, 790 100, 800 95",
    aiCurvePath: "M 0 95 L 210 95 L 210 130 L 460 130 L 460 95 L 710 95 L 710 130 L 800 130",
  },
  absurdist: {
    title: "Absurdist Non-Sequitur",
    tag: "Broken Expectation",
    humanSignalDesc: "Violates syllogistic logic with high subjective surprise, triggering instant laughter from pattern rupture.",
    aiFailureMode: "Attempts logical deduction and hallucinates causal links that were never intended.",
    entropy: "6.21 bits",
    ambiguity: "99.1%",
    aiConfusionRate: "97.8%",
    punchlineSetup: "“I asked the fortune cookie what the future holds, and it just said 'Stop looking at me with your teeth'.”",
    humanCurvePath: "M 0 110 C 80 110, 140 105, 200 108 C 260 112, 320 105, 380 110 C 420 110, 450 15, 480 190 C 520 25, 580 170, 660 70 C 720 150, 770 60, 800 100",
    aiCurvePath: "M 0 105 L 380 105 L 380 100 L 480 100 L 480 105 L 660 105 L 660 100 L 800 100",
  },
};

export default function HumorSpectrogram() {
  const [activeMode, setActiveMode] = useState<ScenarioMode>("irony");
  const data = SCENARIOS[activeMode];

  return (
    <section id="waveform" className="relative py-24 px-[clamp(20px,4vw,56px)] max-w-[1440px] mx-auto">
      {/* Background ambient lighting */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[360px] bg-[#ffc53d]/5 blur-[120px] rounded-full"
      />

      {/* Section Header */}
      <div className="relative z-1 max-w-3xl mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 font-mono text-[10px] uppercase tracking-[0.2em] text-[#ffc53d] mb-4">
          <Activity className="w-3 h-3" />
          <span>The Science of Stumped AI</span>
        </div>
        <h2 className="display-serif text-3xl sm:text-5xl text-[#f4f4f5] tracking-tight">
          Why LLMs choke on <em>human nuance.</em>
        </h2>
        <p className="mt-4 text-base sm:text-lg text-zinc-400 leading-relaxed">
          Standard frontier models predict the next most probable token. Great comedy does the exact opposite: it sets up a probable trajectory and detonates it with a human twist.
        </p>
      </div>

      {/* Interactive Spectrogram Visualizer Card */}
      <div className="relative z-1 rounded-2xl border border-white/10 bg-gradient-to-b from-[#111116] via-[#0c0c12] to-[#070709] p-6 sm:p-10 shadow-2xl overflow-hidden">
        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-widest text-zinc-400">Taxonomy:</span>
            <div className="flex flex-wrap gap-2">
              {(["irony", "innuendo", "absurdist"] as ScenarioMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setActiveMode(mode)}
                  className={`px-3 py-1.5 rounded-full font-mono text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                    activeMode === mode
                      ? "bg-[#ffc53d] text-[#070709] font-semibold shadow-[0_0_14px_rgba(255,177,59,0.35)]"
                      : "text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5"
                  }`}
                >
                  {SCENARIOS[mode].title.split(" & ")[0]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-6 font-mono text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#ffc53d] shadow-[0_0_8px_#ffc53d]" />
              <span className="text-zinc-200">Human Resonance</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#3b82f6] shadow-[0_0_8px_#3b82f6]" />
              <span className="text-zinc-200">Straight Man Linear</span>
            </div>
          </div>
        </div>

        {/* Live Setup Quote Display */}
        <div className="mt-6 rounded-xl border border-white/5 bg-black/40 p-4 font-mono text-sm text-zinc-300">
          <span className="text-[#ffc53d] font-semibold mr-2">[SAMPLE BIT]:</span>
          {data.punchlineSetup}
        </div>

        {/* Dynamic Curved Waveform Display */}
        <div className="relative mt-8 h-56 sm:h-64 w-full rounded-xl border border-white/5 bg-[#050507] overflow-hidden flex items-center justify-center">
          {/* Subtle Grid Matrix */}
          <div
            className="absolute inset-0 opacity-15"
            style={{
              backgroundImage: "linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />

          {/* SVG Waveform Visualization */}
          <svg
            viewBox="0 0 800 200"
            className="w-full h-full relative z-1 p-2"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="humanWaveGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#ffc53d" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#ffd080" stopOpacity="1" />
                <stop offset="100%" stopColor="#ffc53d" stopOpacity="0.8" />
              </linearGradient>
              <linearGradient id="aiWaveGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.8" />
              </linearGradient>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* AI Rigid Step Path */}
            <path
              d={data.aiCurvePath}
              fill="none"
              stroke="url(#aiWaveGradient)"
              strokeWidth="2.5"
              strokeDasharray="4 4"
              opacity="0.75"
            />

            {/* Human Fluid Harmonic Path */}
            <path
              d={data.humanCurvePath}
              fill="none"
              stroke="url(#humanWaveGradient)"
              strokeWidth="3.5"
              filter="url(#glow)"
              className="transition-all duration-700 ease-out"
            />
          </svg>

          {/* Status HUD Overlays */}
          <div className="absolute bottom-3 left-4 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
            Hz Frequency: 124.8 · Phase Inversion Active
          </div>
          <div className="absolute top-3 right-4 font-mono text-[10px] uppercase tracking-widest text-[#ffc53d] bg-[#ffc53d]/10 px-2.5 py-1 rounded-full border border-[#ffc53d]/20">
            AI Disruption Confirmed
          </div>
        </div>

        {/* Diagnostics & Impact Metrics */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 text-zinc-400 font-mono text-xs uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-[#ffc53d]" />
              <span>Semantic Entropy</span>
            </div>
            <div className="mt-2 text-2xl font-serif text-[#f4f4f5]">{data.entropy}</div>
            <p className="mt-1 text-xs text-zinc-400 leading-relaxed">{data.humanSignalDesc}</p>
          </div>

          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 text-zinc-400 font-mono text-xs uppercase tracking-wider">
              <Cpu className="w-3.5 h-3.5 text-[#3b82f6]" />
              <span>AI Blindspot Probability</span>
            </div>
            <div className="mt-2 text-2xl font-serif text-[#f4f4f5]">{data.aiConfusionRate}</div>
            <p className="mt-1 text-xs text-zinc-400 leading-relaxed">{data.aiFailureMode}</p>
          </div>

          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-zinc-400 font-mono text-xs uppercase tracking-wider">
                <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />
                <span>Replacement Value</span>
              </div>
              <div className="mt-2 text-2xl font-serif text-[#f4f4f5]">$12.00 / bit</div>
              <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
                Quorum-verified bits are archived into the Joke Vault for AI alignment licensing.
              </p>
            </div>
            <Link
              href="/vault/method"
              className="mt-3 inline-flex items-center gap-1 text-xs font-mono uppercase tracking-wider text-[#ffc53d] hover:text-white transition-colors"
            >
              <span>Audit Methodology</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
