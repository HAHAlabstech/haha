"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, Activity, Cpu, ArrowUpRight } from "lucide-react";
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
  fftBars: number[];
}

const SCENARIOS: Record<ScenarioMode, ScenarioData> = {
  irony: {
    title: "Irony & Tone Inversion",
    tag: "Subtext Inversion",
    humanSignalDesc:
      "Literal statement deliberately contradicts true emotional valence. Human audience immediately detects deadpan acoustic drop.",
    aiFailureMode:
      "Classifies as genuine sentiment; Straight Man replies with earnest, helpful literal advice.",
    entropy: "4.82 bits",
    ambiguity: "96.4%",
    aiConfusionRate: "89.2%",
    punchlineSetup:
      "“I just love spending three hours on hold with airline customer support. It's really how I unwind.”",
    humanCurvePath:
      "M 0 130 C 50 130, 90 20, 150 20 C 210 20, 240 170, 310 170 C 370 170, 420 35, 490 35 C 560 35, 600 150, 680 150 C 740 150, 770 90, 800 90",
    aiCurvePath:
      "M 0 100 L 150 100 L 150 95 L 310 95 L 310 100 L 490 100 L 490 95 L 680 95 L 680 100 L 800 100",
    fftBars: [
      12, 18, 25, 34, 48, 62, 85, 74, 92, 88, 65, 42, 38, 55, 78, 96, 82, 60,
      44, 30, 26, 38, 52, 70, 64, 48, 36, 28, 22, 35, 48, 42, 30, 22, 18, 14,
      12, 10, 8, 6,
    ],
  },
  innuendo: {
    title: "Innuendo & Layered Reading",
    tag: "Dual Resonance",
    humanSignalDesc:
      "Simultaneous surface innocence and taboo implication. Brain resolves dual semantics in parallel harmonic layers.",
    aiFailureMode:
      "Collapses onto the G-rated surface interpretation, missing the double meaning entirely.",
    entropy: "5.14 bits",
    ambiguity: "98.7%",
    aiConfusionRate: "93.5%",
    punchlineSetup:
      "“My roomba has seen things in this apartment it refuses to clean up.”",
    humanCurvePath:
      "M 0 110 C 60 170, 110 30, 180 30 C 250 30, 290 180, 370 180 C 450 180, 490 25, 570 25 C 640 25, 690 160, 750 160 C 780 160, 790 100, 800 100",
    aiCurvePath:
      "M 0 110 L 220 110 L 220 115 L 440 115 L 440 110 L 660 110 L 660 115 L 800 115",
    fftBars: [
      20, 28, 40, 58, 76, 94, 88, 64, 50, 42, 48, 66, 84, 98, 92, 70, 52, 38,
      32, 44, 62, 80, 95, 86, 68, 50, 38, 28, 24, 32, 46, 58, 50, 36, 26, 18,
      14, 12, 10, 8,
    ],
  },
  absurdist: {
    title: "Absurdist Non-Sequitur",
    tag: "Broken Expectation",
    humanSignalDesc:
      "Violates syllogistic logic with high subjective surprise, triggering pattern rupture and sudden explosive punchline.",
    aiFailureMode:
      "Attempts logical deduction and hallucinates causal links that were never intended.",
    entropy: "6.21 bits",
    ambiguity: "99.1%",
    aiConfusionRate: "97.8%",
    punchlineSetup:
      "“I asked the fortune cookie what the future holds, and it just said 'Stop looking at me with your teeth'.”",
    humanCurvePath:
      "M 0 115 C 80 115, 160 110, 240 112 C 320 114, 380 110, 440 110 C 470 110, 490 15, 530 190 C 560 15, 610 180, 670 40 C 730 160, 770 50, 800 100",
    aiCurvePath:
      "M 0 112 L 360 112 L 360 108 L 480 108 L 480 112 L 640 112 L 640 108 L 800 108",
    fftBars: [
      10, 14, 16, 18, 20, 22, 24, 25, 26, 28, 26, 24, 28, 30, 32, 30, 28, 32,
      38, 44, 98, 92, 85, 100, 78, 90, 64, 45, 30, 22, 18, 15, 14, 12, 10, 8,
      7, 6, 5, 4,
    ],
  },
};

interface HumorSpectrogramProps {
  dailyPoolUSDG?: string;
  bitsTotal?: string;
  winRate?: string;
}

const MODES: ScenarioMode[] = ["irony", "innuendo", "absurdist"];
const ZIN_VH = 0.56;
const PIN_QUERY = "(min-width: 1024px) and (min-height: 680px)";

export default function HumorSpectrogram({
  dailyPoolUSDG = "2,840",
  bitsTotal = "8,120",
  winRate = "38.4%",
}: HumorSpectrogramProps) {
  const [activeMode, setActiveMode] = useState<ScenarioMode>("irony");
  const [userClicked, setUserClicked] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const runwayRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const data = SCENARIOS[activeMode];

  useEffect(() => {
    const runway = runwayRef.current;
    if (!runway) return;

    const media = window.matchMedia(PIN_QUERY);

    const onScroll = () => {
      const rect = runway.getBoundingClientRect();
      const vh = window.innerHeight;

      if (!media.matches) {
        runway.style.setProperty("--zk", "1");
        setIsLive(true);
        if (userClicked) return;
        const sectionCenter = rect.top + rect.height / 2;
        const screenCenter = vh / 2;
        const normalized = (screenCenter - sectionCenter) / (vh * 0.55);
        if (normalized < -0.2) setActiveMode("irony");
        else if (normalized >= -0.2 && normalized < 0.25) setActiveMode("innuendo");
        else setActiveMode("absurdist");
        return;
      }

      // Pinned Dojang Mode:
      const zin = vh * ZIN_VH;
      const zk = Math.max(0, Math.min(1, -rect.top / zin));
      runway.style.setProperty("--zk", zk.toFixed(4));
      setIsLive(zk > 0.88);

      const travel = rect.height - vh - zin;
      const p = travel > 0 ? Math.max(0, Math.min(1, (-rect.top - zin) / travel)) : 0;
      runway.style.setProperty("--p", p.toFixed(4));
      setScrollProgress(p);

      if (userClicked) return;

      // Scrub taxonomy mode continuously across the 3 states
      if (p < 0.33) {
        setActiveMode("irony");
      } else if (p < 0.66) {
        setActiveMode("innuendo");
      } else {
        setActiveMode("absurdist");
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [userClicked]);

  return (
    <section
      id="waveform"
      ref={runwayRef}
      data-live={isLive ? "true" : "false"}
      className="haha-spec-runway text-white font-sans selection:bg-[#ffc53d]/30 selection:text-[#ffc53d]"
    >
      <div ref={stageRef} className="haha-spec-stage">
        {/* Subtle Ambient Golden Bloom */}
        <div
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[360px] bg-[#ffc53d]/5 blur-[140px] rounded-full"
        />

        <div className="haha-spec-content max-w-[1440px] w-full mx-auto px-[clamp(20px,4vw,56px)]">
          {/* =========================================================================
              INTEGRATED PROTOCOL TELEMETRY HUD BAR
              ========================================================================= */}
          <div className="mb-4 rounded-xl border border-white/[0.08] bg-[#0c0c12]/90 backdrop-blur-xl py-3 px-5 shadow-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-center">
              <div className="flex flex-col">
                <span className="font-mono text-[9px] uppercase tracking-widest text-zinc-500">
                  24h Tip Jar Pool
                </span>
                <span className="font-display font-bold text-lg sm:text-xl text-white tabular-nums">
                  ${dailyPoolUSDG} <span className="text-xs font-mono text-[#ffc53d]">USDG</span>
                </span>
              </div>

              <div className="flex flex-col">
                <span className="font-mono text-[9px] uppercase tracking-widest text-zinc-500">
                  Verified Performances
                </span>
                <span className="font-display font-bold text-lg sm:text-xl text-white tabular-nums">
                  {bitsTotal} <span className="text-xs font-mono text-zinc-400">Bits</span>
                </span>
              </div>

              <div className="flex flex-col">
                <span className="font-mono text-[9px] uppercase tracking-widest text-zinc-500">
                  Human Win Rate
                </span>
                <span className="font-display font-bold text-lg sm:text-xl text-[#ffc53d] tabular-nums">
                  {winRate}
                </span>
              </div>

              <div className="flex flex-col">
                <span className="font-mono text-[9px] uppercase tracking-widest text-zinc-500">
                  AI Contestant
                </span>
                <span className="font-display font-bold text-lg sm:text-xl text-zinc-200">
                  Straight Man <span className="text-xs font-mono text-[#ffc53d]">S1</span>
                </span>
              </div>
            </div>
          </div>

          {/* =========================================================================
              SECTION HEADER
              ========================================================================= */}
          <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
            <div>
              <span className="font-mono text-xs uppercase tracking-[0.24em] text-[#ffc53d] font-semibold block mb-1">
                The Science of Stumped AI
              </span>
              <h2 className="display-serif text-2xl sm:text-4xl text-[#f4f4f5] tracking-tight">
                Why LLMs choke on <em className="italic text-[#ffc53d]">human nuance.</em>
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 font-light max-w-md hidden lg:block">
              Frontier models predict the next most probable token. Great comedy sets up a probable trajectory and detonates it with an acoustic human twist.
            </p>
          </div>

          {/* =========================================================================
              STUDIO ACOUSTIC SPECTROGRAM CONSOLE
              ========================================================================= */}
          <div className="relative z-1 rounded-2xl border border-white/10 bg-gradient-to-b from-[#111116] via-[#0c0c12] to-[#070709] p-5 sm:p-7 shadow-2xl overflow-hidden">
            {/* Top Console Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs uppercase tracking-widest text-zinc-400">
                  Taxonomy:
                </span>
                <div className="flex flex-wrap gap-2">
                  {MODES.map((mode, i) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        setActiveMode(mode);
                        setUserClicked(true);
                      }}
                      className={`px-3.5 py-1.5 rounded-full font-mono text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                        activeMode === mode
                          ? "bg-[#ffc53d] text-[#070709] font-bold shadow-[0_0_16px_rgba(255,197,61,0.4)]"
                          : "text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5"
                      }`}
                    >
                      0{i + 1} / {SCENARIOS[mode].title.split(" & ")[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Strict 2-Color Legend */}
              <div className="flex items-center gap-5 font-mono text-xs text-zinc-400">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-1 rounded-sm bg-[#ffc53d] shadow-[0_0_8px_rgba(255,197,61,0.6)]" />
                  <span className="text-zinc-200">Human Resonance</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-1 rounded-sm bg-zinc-500" />
                  <span className="text-zinc-400">Straight Man Linear</span>
                </div>
              </div>
            </div>

            {/* Live Setup Quote Display */}
            <div className="mt-4 rounded-xl border border-white/10 bg-black/60 p-3 px-4 font-mono text-xs sm:text-sm text-zinc-200 flex items-start gap-2.5">
              <span className="text-[#ffc53d] font-bold shrink-0">[SAMPLE BIT]:</span>
              <span className="italic">{data.punchlineSetup}</span>
            </div>

            {/* Studio Oscilloscope & Acoustic Spectrum Analyzer */}
            <div className="relative mt-4 h-52 sm:h-60 w-full rounded-xl border border-white/10 bg-[#050508] overflow-hidden flex flex-col justify-between p-3 sm:p-4">
              {/* Subtle Studio Oscilloscope Grid */}
              <div
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)",
                  backgroundSize: "40px 32px",
                }}
              />

              {/* Decibel Reference Lines on Left */}
              <div className="absolute left-3 top-3 bottom-7 flex flex-col justify-between font-mono text-[9px] text-zinc-600 pointer-events-none z-10 select-none">
                <span>+12 dB</span>
                <span>+0 dB</span>
                <span>-12 dB</span>
                <span>-24 dB</span>
              </div>

              {/* Studio HUD Status Bar on Top Right */}
              <div className="relative z-10 flex items-center justify-between font-mono text-[10px] text-zinc-500 uppercase tracking-widest pl-12 pr-1">
                <span className="hidden sm:inline">Acoustic Spectrum // 40-Band FFT</span>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-[#ffc53d]/30 bg-[#ffc53d]/10 text-[#ffc53d] font-bold">
                  <span>Entropy Shift Confirmed</span>
                </div>
              </div>

              {/* Center Visualizer Layer: SVG Waveforms + Background FFT Equalizer Bars */}
              <div className="relative flex-1 w-full flex items-center justify-center my-1">
                {/* Real-time styled 40-bar FFT Graphic */}
                <div className="absolute inset-x-12 bottom-1 h-24 flex items-end justify-between gap-[2px] opacity-35 pointer-events-none">
                  {data.fftBars.map((val, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-gradient-to-t from-[#ffc53d]/10 via-[#ffc53d]/45 to-[#ffc53d] rounded-t-sm transition-all duration-500"
                      style={{ height: `${val}%` }}
                    />
                  ))}
                </div>

                {/* Precision Harmonic Curve Paths */}
                <svg
                  viewBox="0 0 800 200"
                  className="w-full h-full relative z-10"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="humanWaveGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#ffc53d" stopOpacity="0.85" />
                      <stop offset="50%" stopColor="#ffd875" stopOpacity="1" />
                      <stop offset="100%" stopColor="#ffc53d" stopOpacity="0.85" />
                    </linearGradient>
                    <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="3.5" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>

                  {/* AI Rigid Step Path (Monochrome Silver/Zinc) */}
                  <path
                    d={data.aiCurvePath}
                    fill="none"
                    stroke="#71717a"
                    strokeWidth="2"
                    strokeDasharray="6 4"
                    opacity="0.85"
                  />

                  {/* Human Harmonic Resonance Curve (Signature Gold) */}
                  <path
                    d={data.humanCurvePath}
                    fill="none"
                    stroke="url(#humanWaveGradient)"
                    strokeWidth="3.5"
                    filter="url(#goldGlow)"
                    className="transition-all duration-500 ease-out"
                  />
                </svg>
              </div>

              {/* Bottom Frequency Axis Bar */}
              <div className="relative z-10 flex items-center justify-between font-mono text-[9px] text-zinc-500 tracking-wider pt-1.5 border-t border-white/5 pl-12">
                <span>20 Hz</span>
                <span>250 Hz</span>
                <span>1.0 kHz</span>
                <span>4.0 kHz</span>
                <span>16.0 kHz</span>
              </div>
            </div>

            {/* Diagnostics & Impact Metrics (Strict 2-Color Palette) */}
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
                <div className="flex items-center gap-2 text-zinc-400 font-mono text-xs uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-[#ffc53d]" />
                  <span>Semantic Entropy</span>
                </div>
                <div className="mt-1 text-xl font-serif text-[#f4f4f5]">{data.entropy}</div>
                <p className="mt-1 text-xs text-zinc-400 leading-relaxed line-clamp-2">{data.humanSignalDesc}</p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
                <div className="flex items-center gap-2 text-zinc-400 font-mono text-xs uppercase tracking-wider">
                  <Cpu className="w-3.5 h-3.5 text-zinc-400" />
                  <span>AI Blindspot Probability</span>
                </div>
                <div className="mt-1 text-xl font-serif text-[#f4f4f5]">{data.aiConfusionRate}</div>
                <p className="mt-1 text-xs text-zinc-400 leading-relaxed line-clamp-2">{data.aiFailureMode}</p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-zinc-400 font-mono text-xs uppercase tracking-wider">
                    <Activity className="w-3.5 h-3.5 text-[#ffc53d]" />
                    <span>Replacement Value</span>
                  </div>
                  <div className="mt-1 text-xl font-serif text-[#f4f4f5]">$12.00 / bit</div>
                  <p className="mt-1 text-xs text-zinc-400 leading-relaxed line-clamp-2">
                    Verified bits archive into the Joke Vault for AI alignment licensing.
                  </p>
                </div>
                <Link
                  href="/app?tab=vault"
                  className="mt-2 inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-wider text-[#ffc53d] hover:text-white transition-colors"
                >
                  <span>Inspect Joke Vault</span>
                  <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
