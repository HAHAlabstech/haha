"use client";

import React, { useEffect, useState, useRef } from "react";

const CALIBRATION_LOGS = [
  { at: 0, text: "INIT: Booting Straight Man v2.4 neural deadpan core..." },
  { at: 22, text: "ACOUSTIC: Sampling 4.8M punchline vectors & sarcasm dataset..." },
  { at: 48, text: "SENSORS: High-frequency laugh detection calibrated (-0.02 dB)..." },
  { at: 74, text: "ORACLE: Syncing Robinhood Chain Testnet 46630..." },
  { at: 92, text: "CONSENSUS: Blind crowd jury armed · USDG Vault unlocked..." },
  { at: 100, text: "STAGE READY: Welcome to the Adversarial Comedy Arena." },
];

export const ArrivalPreloader: React.FC = () => {
  const [stage, setStage] = useState<"pending" | "ready" | "hidden">("pending");
  const [progress, setProgress] = useState(0);
  const [dbLevel, setDbLevel] = useState("-18.4");
  const skippedRef = useRef(false);

  useEffect(() => {
    // Respect reduced motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStage("hidden");
      return;
    }

    // Lock scrolling & hide navbar while preloader is active
    document.body.classList.add("haha-preloader-pending");

    // Dynamic dB fluctuation for audio feel
    const dbInterval = setInterval(() => {
      const val = (-14 - Math.random() * 8).toFixed(1);
      setDbLevel(val);
    }, 120);

    // Fast, smooth progress ticker (0 -> 100% over ~1.35s)
    const startTime = Date.now();
    const duration = 1350;

    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(progressInterval);
      }
    }, 20);

    // Curtain slides up at 1.55s
    const timer1 = setTimeout(() => {
      document.body.classList.remove("haha-preloader-pending");
      setStage("ready");
    }, 1550);

    // Unmount after curtain completely lifts (2.4s)
    const timer2 = setTimeout(() => {
      setStage("hidden");
    }, 2400);

    // Failsafe guarantees release
    const failsafe = setTimeout(() => {
      document.body.classList.remove("haha-preloader-pending");
      setStage("hidden");
    }, 3500);

    // Skip on Escape or Space
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "Escape" || e.key === " ") && !skippedRef.current) {
        skippedRef.current = true;
        document.body.classList.remove("haha-preloader-pending");
        setStage("ready");
        setTimeout(() => setStage("hidden"), 550);
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        document.body.classList.remove("haha-preloader-pending");
        setStage("hidden");
      }
    };
    window.addEventListener("pageshow", onPageShow);

    return () => {
      clearInterval(dbInterval);
      clearInterval(progressInterval);
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(failsafe);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("pageshow", onPageShow);
      document.body.classList.remove("haha-preloader-pending");
    };
  }, []);

  const handleSkip = () => {
    if (skippedRef.current) return;
    skippedRef.current = true;
    document.body.classList.remove("haha-preloader-pending");
    setStage("ready");
    setTimeout(() => setStage("hidden"), 550);
  };

  if (stage === "hidden") return null;

  // Active calibration text
  const currentLog =
    [...CALIBRATION_LOGS].reverse().find((l) => progress >= l.at)?.text ??
    CALIBRATION_LOGS[0]?.text ??
    "STAGE READY";

  return (
    <div
      className={`haha-preloader ${stage === "ready" ? "haha-preloader-ready" : ""}`}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100000,
        background: "#08080c",
      }}
      onClick={handleSkip}
      title="Click anywhere to enter stage (ESC to skip)"
      aria-hidden="true"
    >
      <div className="haha-preloader-curtain font-sans">
        {/* Subtle Ambient Background Laser & Radar Grid */}
        <div className="haha-preloader-spotlight" />
        <div className="haha-laser-scanline" />

        {/* Ambient Acoustic Rings in Background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none w-[600px] h-[600px] sm:w-[800px] sm:h-[800px] -z-10 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-[#ffc53d]/10 haha-radar-ring-1" />
          <div className="absolute inset-0 rounded-full border border-[#ffc53d]/10 haha-radar-ring-2" />
          <div className="absolute inset-0 rounded-full border border-[#ffc53d]/10 haha-radar-ring-3" />
        </div>

        {/* Top Soundstage Banner */}
        <header className="flex justify-between items-center w-full z-20 border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/logo-transparent.webp"
              className="h-8 w-auto object-contain filter drop-shadow-[0_0_14px_rgba(255,197,61,0.7)]"
              alt="HAHA Logo"
            />
            <div className="flex flex-col">
              <span className="font-bold tracking-[0.22em] text-xs sm:text-sm text-white font-mono flex items-center gap-2">
                HAHA PROTOCOL
                <span className="inline-block w-2 h-2 rounded-full bg-[#ffc53d] animate-ping" />
              </span>
              <span className="text-[10px] tracking-[0.16em] uppercase text-[#ffc53d]/90 font-mono">
                Season 01 · Soundstage Live
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden md:inline font-mono text-[10px] tracking-[0.2em] uppercase text-zinc-400">
              ROBINHOOD CHAIN TESTNET [46630]
            </span>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ffc53d]/10 border border-[#ffc53d]/30 text-[#ffc53d] font-mono text-[10px] tracking-widest font-semibold shadow-[0_0_12px_rgba(255,197,61,0.25)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ffc53d] animate-pulse" />
              <span>STAGE ARMED</span>
            </div>
          </div>
        </header>

        {/* Center Arena Headline: Kinetic Typography & Slogan */}
        <main className="my-auto py-4 sm:py-8 z-20 w-full max-w-5xl mx-auto flex flex-col justify-center">
          {/* Status Kicker */}
          <div className="haha-reveal-1 inline-flex items-center gap-2.5 mb-4 text-[11px] sm:text-xs font-mono tracking-[0.28em] uppercase text-[#ffc53d]">
            <span className="w-2 h-2 rounded-full bg-[#ffc53d] shadow-[0_0_10px_#ffc53d]" />
            <span>THE ADVERSARIAL BENCHMARK FOR HUMAN NUANCE</span>
          </div>

          {/* Kinetic Big Headline (Clean, Zero Overlap, High Production Polish) */}
          <h1 className="font-serif font-black tracking-tight text-4xl sm:text-6xl md:text-7xl lg:text-8xl text-white leading-[1.08] flex flex-col gap-1 sm:gap-2 select-none">
            <span className="haha-reveal-1 block text-zinc-100">
              Tell a Joke.
            </span>
            <span className="haha-reveal-2 block haha-gold-shimmer italic font-serif py-0.5">
              Fool the AI.
            </span>
            <span className="haha-reveal-3 block text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.8)]">
              Get Paid.
            </span>
          </h1>

          {/* Real-time Dynamic Acoustic Equalizer + Telemetry Unit */}
          <div className="mt-8 sm:mt-10 pt-6 border-t border-white/[0.08] flex flex-col gap-5">
            {/* Top row: Equalizer Bars + dB Meter + Counter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {/* Dual-Channel 28-Band Stereo Equalizer */}
              <div className="flex items-center gap-4">
                <div className="flex items-end gap-1 h-9 px-3 py-1 bg-black/60 border border-white/10 rounded-lg shadow-inner">
                  {[
                    30, 60, 45, 85, 100, 70, 90, 50, 40, 80, 95, 65, 45, 80,
                    85, 55, 95, 75, 40, 65, 90, 100, 70, 50, 85, 60, 40, 30,
                  ].map((h, i) => (
                    <span
                      key={i}
                      className="haha-eq-bar w-[3px] bg-gradient-to-t from-[#f59e0b] via-[#ffd875] to-[#ffc53d] rounded-full shadow-[0_0_6px_rgba(255,197,61,0.5)]"
                      style={{
                        height: `${h}%`,
                        animationDelay: `${(i * 0.05).toFixed(2)}s`,
                      }}
                    />
                  ))}
                </div>

                <div className="flex flex-col font-mono text-[11px]">
                  <span className="font-semibold text-white tracking-wider flex items-center gap-2">
                    ACOUSTIC SENSORS
                    <span className="text-[#ffc53d] text-[10px] px-1.5 py-0.2 rounded bg-[#ffc53d]/15 border border-[#ffc53d]/30">
                      {dbLevel} dBFS
                    </span>
                  </span>
                  <span className="text-zinc-400 text-[10px] tracking-wider">
                    Laugh threshold detector live
                  </span>
                </div>
              </div>

              {/* Progress Counter */}
              <div className="flex items-baseline gap-3 sm:text-right">
                <span className="font-mono text-4xl sm:text-5xl font-black text-[#ffc53d] tracking-tight tabular-nums drop-shadow-[0_0_18px_rgba(255,197,61,0.6)]">
                  {progress.toString().padStart(2, "0")}%
                </span>
                <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-zinc-300">
                  {progress < 100 ? "Calibrating..." : "Stage Ready ✓"}
                </span>
              </div>
            </div>

            {/* Glowing Laser Progress Bar */}
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden relative">
              <div
                className="h-full bg-gradient-to-r from-[#f59e0b] via-[#ffd875] to-[#ffc53d] transition-all duration-75 ease-out rounded-full shadow-[0_0_16px_#ffc53d]"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Live Terminal Telemetry Log */}
            <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-400 bg-black/40 border border-white/[0.06] rounded-md px-3.5 py-2">
              <span className="text-[#ffc53d] font-bold animate-pulse">&gt;</span>
              <span className="text-zinc-300 truncate tracking-wide">
                {currentLog}
              </span>
            </div>
          </div>
        </main>

        {/* Bottom Colophon with Skip Cue */}
        <footer className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 w-full z-20 pt-4 border-t border-white/[0.08] font-mono text-[10px] tracking-[0.16em] uppercase text-zinc-500">
          <div className="flex items-center gap-3">
            <span className="text-zinc-300">THE STRAIGHT MAN · JOKE VAULT</span>
            <span className="text-zinc-700 hidden sm:inline">|</span>
            <span className="hidden sm:inline text-zinc-400">
              DAILY USDG SETTLEMENT AT 00:00 UTC
            </span>
          </div>

          <div className="flex items-center gap-2 text-zinc-400 hover:text-[#ffc53d] transition-colors cursor-pointer group">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#ffc53d] group-hover:scale-125 transition-transform" />
            <span className="tracking-widest font-semibold">
              CLICK ANYWHERE OR PRESS ESC TO SKIP ↗
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default ArrivalPreloader;
