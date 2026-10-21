"use client";

import React, { useEffect, useState, useRef } from "react";

export const ArrivalPreloader: React.FC = () => {
  const [stage, setStage] = useState<"pending" | "ready" | "hidden">("pending");
  const [progress, setProgress] = useState(0);
  const skippedRef = useRef(false);

  useEffect(() => {
    // Check reduced motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStage("hidden");
      return;
    }

    // Lock scrolling while preloader is active
    document.body.classList.add("haha-preloader-pending");

    // Fast progress ticker (0 -> 100%)
    const startTime = Date.now();
    const duration = 1200; // 1.2s calibration

    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(progressInterval);
      }
    }, 25);

    // Curtain opens at 1.4s
    const timer1 = setTimeout(() => {
      document.body.classList.remove("haha-preloader-pending");
      setStage("ready");
    }, 1400);

    // Preloader unmounts after curtain animation finishes (at 2.25s)
    const timer2 = setTimeout(() => {
      setStage("hidden");
    }, 2250);

    // Absolute failsafe
    const failsafe = setTimeout(() => {
      document.body.classList.remove("haha-preloader-pending");
      setStage("hidden");
    }, 3200);

    // Handle skip on keypress (Escape or Space)
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "Escape" || e.key === " ") && !skippedRef.current) {
        skippedRef.current = true;
        document.body.classList.remove("haha-preloader-pending");
        setStage("ready");
        setTimeout(() => setStage("hidden"), 600);
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
    setTimeout(() => setStage("hidden"), 600);
  };

  if (stage === "hidden") return null;

  return (
    <div
      className={`haha-preloader ${stage === "ready" ? "haha-preloader-ready" : ""}`}
      onClick={handleSkip}
      title="Click anywhere to enter stage"
      aria-hidden="true"
    >
      <div className="haha-preloader-curtain font-sans">
        {/* Subtle Ambient Soundstage Spotlight in the background */}
        <div className="haha-preloader-spotlight" />

        {/* Top Masthead */}
        <header className="flex justify-between items-center w-full z-10 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/logo-transparent.webp"
              className="h-8 w-auto object-contain filter drop-shadow-[0_0_12px_rgba(255,197,61,0.6)]"
              alt="HAHA Logo"
            />
            <div className="flex flex-col">
              <span className="font-bold tracking-[0.2em] text-sm text-white font-mono flex items-center gap-2">
                HAHA PROTOCOL
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#ffc53d] animate-ping" />
              </span>
              <span className="text-[10px] tracking-[0.14em] uppercase text-[#ffc53d]/80 font-mono">
                Season 01 · Showtime Stage
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-right">
            <span className="hidden sm:inline font-mono text-[10px] tracking-[0.18em] uppercase text-zinc-400">
              AI COMEDY BENCHMARK · CHAIN 46630
            </span>
            <span className="text-[10px] font-mono tracking-widest text-[#ffc53d] px-2.5 py-1 rounded bg-[#ffc53d]/10 border border-[#ffc53d]/25">
              LIVE
            </span>
          </div>
        </header>

        {/* Center Stage: Standup Arena Calibration */}
        <main className="my-auto py-6 sm:py-10 z-10 w-full max-w-5xl mx-auto flex flex-col justify-center">
          <div className="inline-flex items-center gap-2.5 mb-5 text-[11px] font-mono tracking-[0.26em] uppercase text-[#ffc53d]">
            <span className="w-2 h-2 rounded-full bg-[#ffc53d] shadow-[0_0_8px_#ffc53d]" />
            <span>Calibrating The Straight Man AI</span>
          </div>

          {/* Clean, Non-Overlapping Editorial Headline */}
          <h1 className="font-serif font-black tracking-tight text-4xl sm:text-6xl md:text-7xl lg:text-8xl text-white leading-[1.08] flex flex-col gap-1 sm:gap-2">
            <span className="block text-zinc-100">
              Tell a Joke.
            </span>
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#ffc53d] via-[#ffd875] to-[#f59e0b] italic font-serif">
              Fool the AI.
            </span>
            <span className="block text-white">
              Get Paid.
            </span>
          </h1>

          {/* Acoustic Equalizer + Calibration Bar */}
          <div className="mt-8 sm:mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            {/* Soundstage FFT Equalizer Visualizer */}
            <div className="flex items-center gap-4">
              <div className="flex items-end gap-1.5 h-8 px-2 py-1 bg-black/40 border border-white/10 rounded-md">
                {[45, 80, 60, 95, 30, 75, 100, 50, 85, 40, 70, 90, 65, 35].map((height, i) => (
                  <span
                    key={i}
                    className="haha-eq-bar w-1 bg-gradient-to-t from-[#f59e0b] to-[#ffc53d] rounded-full"
                    style={{
                      height: `${height}%`,
                      animationDelay: `${(i * 0.08).toFixed(2)}s`,
                    }}
                  />
                ))}
              </div>
              <div className="flex flex-col">
                <span className="font-mono text-xs font-semibold text-white tracking-wider">
                  ACOUSTIC SENSORS ACTIVE
                </span>
                <span className="font-mono text-[10px] text-zinc-400 tracking-wider">
                  Acoustic laugh detection armed
                </span>
              </div>
            </div>

            {/* Percentage Counter */}
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-3xl sm:text-4xl font-bold text-[#ffc53d] tracking-tight tabular-nums">
                {progress.toString().padStart(2, "0")}%
              </span>
              <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-zinc-400">
                {progress < 100 ? "Tuning Neural Weights..." : "Stage Ready"}
              </span>
            </div>
          </div>
        </main>

        {/* Bottom Colophon */}
        <footer className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 w-full z-10 pt-4 border-t border-white/10 font-mono text-[10px] tracking-[0.16em] uppercase text-zinc-500">
          <div className="flex items-center gap-3">
            <span>THE STRAIGHT MAN · JOKE VAULT</span>
            <span className="text-zinc-700 hidden sm:inline">|</span>
            <span className="hidden sm:inline text-zinc-400">USDG SETTLEMENT AT MIDNIGHT UTC</span>
          </div>

          <div className="flex items-center gap-2 text-zinc-400 hover:text-[#ffc53d] transition-colors cursor-pointer">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-zinc-600" />
            <span>CLICK ANYWHERE OR ESC TO SKIP ↗</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default ArrivalPreloader;

