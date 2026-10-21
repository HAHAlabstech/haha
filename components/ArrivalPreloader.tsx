"use client";

import React, { useEffect, useRef, useState } from "react";

export const ArrivalPreloader: React.FC = () => {
  const [progress, setProgress] = useState(0);
  const [exiting, setExiting] = useState(false);
  const [removed, setRemoved] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const finishedRef = useRef(false);

  useEffect(() => {
    // Respect reduced motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRemoved(true);
      return;
    }

    // Lock body scroll & hide navbar while preloader covers screen
    document.body.classList.add("haha-preloader-pending");

    // Fast, smooth ticker (0% -> 100% over ~1.2s)
    const startTime = performance.now();
    const duration = 1200;
    let animId = 0;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);

      if (pct < 100 && !finishedRef.current) {
        animId = requestAnimationFrame(tick);
      } else if (!finishedRef.current) {
        finish();
      }
    };
    animId = requestAnimationFrame(tick);

    const finish = () => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      cancelAnimationFrame(animId);
      setProgress(100);
      setExiting(true);
      document.body.classList.remove("haha-preloader-pending");

      // Smooth curtain exit duration: 820ms
      window.setTimeout(() => {
        setRemoved(true);
      }, 820);
    };

    // Keyboard skip (Escape or Space)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === " ") {
        finish();
      }
    };
    window.addEventListener("keydown", onKey);

    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) finish();
    };
    window.addEventListener("pageshow", onPageShow);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pageshow", onPageShow);
      document.body.classList.remove("haha-preloader-pending");
    };
  }, []);

  const handleSkip = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setProgress(100);
    setExiting(true);
    document.body.classList.remove("haha-preloader-pending");
    window.setTimeout(() => setRemoved(true), 820);
  };

  if (removed) return null;

  return (
    <div
      ref={rootRef}
      role="status"
      aria-label="Loading HAHA"
      className={`haha-manifesto-preloader${exiting ? " is-exiting" : ""}`}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100000,
        background: "#070709",
      }}
      onClick={handleSkip}
      title="Click anywhere or press ESC to enter stage"
      aria-hidden="true"
    >
      <div className="haha-manifesto-paper font-sans">
        {/* Top Masthead */}
        <header className="flex justify-between items-center w-full font-mono text-[11px] tracking-[0.16em] uppercase text-zinc-400 border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/logo-transparent.webp"
              className="h-7 w-auto object-contain"
              alt="HAHA Logo"
            />
            <span className="font-bold tracking-[0.22em] text-white text-sm">
              HAHA
            </span>
            <span className="text-zinc-600 hidden sm:inline">/</span>
            <span className="hidden sm:inline text-zinc-300">
              HUMANS ARE HARD TO AUTOMATE
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-[10px] text-[#ffc53d] px-2.5 py-1 rounded bg-[#ffc53d]/10 border border-[#ffc53d]/25">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ffc53d] animate-pulse" />
              <span>STAGE 01 · LIVE</span>
            </span>
          </div>
        </header>

        {/* Central Typographic Manifesto */}
        <main className="my-auto py-8 sm:py-12 flex flex-col items-start w-full max-w-6xl">
          <p className="font-mono text-[10px] sm:text-xs tracking-[0.26em] uppercase text-[#ffc53d] mb-4 sm:mb-6 font-semibold">
            THE ADVERSARIAL BENCHMARK FOR HUMAN NUANCE
          </p>

          <div className="haha-manifesto-statement font-display text-5xl sm:text-7xl md:text-8xl lg:text-9xl tracking-tight leading-[0.98] text-white font-extrabold flex flex-col items-start select-none">
            <span className="haha-manifesto-line-1">
              HUMANS ARE
            </span>
            <span className="haha-manifesto-line-2 flex items-center flex-wrap gap-x-3 sm:gap-x-5 my-1 sm:my-2">
              <span>HARD TO</span>
              <span className="haha-seal-badge inline-flex items-center gap-2 px-3 sm:px-5 py-1 sm:py-1.5 bg-[#ffc53d] text-[#070709] rounded-md font-mono text-xs sm:text-xl md:text-2xl font-black tracking-widest uppercase">
                AUTOMATE ↗
              </span>
            </span>
            <span className="haha-manifesto-line-3 text-[#ffc53d]">
              GET PAID.
            </span>
          </div>

          {/* Caption & Thesis Statement */}
          <div className="mt-6 sm:mt-8 flex items-start gap-4 text-zinc-400 font-mono text-xs sm:text-sm max-w-2xl">
            <span className="w-8 h-[1px] bg-[#ffc53d]/50 mt-2.5 shrink-0" />
            <p className="leading-relaxed">
              Tell a joke that stumps the Straight Man AI. Verified by blind crowd consensus on-chain.
              <br className="hidden sm:inline" />
              USDG rewards settle on Robinhood Chain at midnight UTC.
            </p>
          </div>
        </main>

        {/* Bottom Colophon & Progress Readout */}
        <footer className="w-full border-t border-white/[0.08] pt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 font-mono text-[10px] tracking-[0.16em] uppercase text-zinc-500">
          <div className="flex items-center gap-3">
            <span className="text-zinc-300">THE STRAIGHT MAN · JOKE VAULT</span>
            <span className="text-zinc-700 hidden sm:inline">|</span>
            <span className="hidden sm:inline text-zinc-400">
              ROBINHOOD CHAIN TESTNET 46630
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-zinc-400">CALIBRATING</span>
              <div className="w-20 sm:w-28 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#ffc53d] transition-all duration-75 ease-out rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-[#ffc53d] font-bold tabular-nums">
                {progress}%
              </span>
            </div>

            <span className="text-zinc-700 hidden sm:inline">|</span>

            <button
              type="button"
              onClick={handleSkip}
              className="text-zinc-400 hover:text-[#ffc53d] transition-colors cursor-pointer"
            >
              ENTER STAGE ↗
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default ArrivalPreloader;
