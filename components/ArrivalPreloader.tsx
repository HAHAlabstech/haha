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

    // Smooth fast progress ticker (0% -> 100% over ~1.1s)
    const startTime = performance.now();
    const duration = 1100;
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

      // Curtain exit duration: 750ms
      window.setTimeout(() => {
        setRemoved(true);
      }, 750);
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
    window.setTimeout(() => setRemoved(true), 750);
  };

  if (removed) return null;

  return (
    <div
      ref={rootRef}
      role="status"
      aria-label="Loading HAHA"
      className={`haha-stage-preloader${exiting ? " is-exiting" : ""}`}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100000,
        background: "#08080c",
      }}
      onClick={handleSkip}
      title="Click anywhere or press ESC to enter stage"
      aria-hidden="true"
    >
      {/* Top Soundstage Broadcast Rail */}
      <header className="haha-stage-top">
        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo-transparent.webp"
            className="h-7 w-auto object-contain"
            alt="HAHA Logo"
          />
          <div className="flex flex-col">
            <span className="font-mono font-bold tracking-[0.18em] text-white text-xs">
              HAHA
            </span>
            <span className="text-[9px] font-mono tracking-[0.14em] text-zinc-400 uppercase">
              Humans Are Hard to Automate
            </span>
          </div>
        </div>

        {/* Vintage-Modern ON AIR Indicator */}
        <div className="flex items-center gap-3">
          <span className="haha-on-air-badge">
            <span className="haha-on-air-dot" />
            <span>ON AIR</span>
          </span>
          <span className="hidden sm:inline font-mono text-[10px] tracking-[0.16em] uppercase text-zinc-400">
            Showtime · Stage 01
          </span>
        </div>
      </header>

      {/* Center Comedy Stage */}
      <main className="haha-stage-center">
        {/* Ambient Top Spotlight Cone */}
        <div className="haha-spotlight-cone" />

        {/* Giant Punchy Wordmark */}
        <div className="haha-wordmark-wrap">
          <h1 className="haha-stage-title font-serif">HAHA</h1>
          <p className="haha-stage-tagline font-mono">
            HUMANS ARE HARD TO AUTOMATE
          </p>
        </div>

        {/* The Standup Premise */}
        <div className="haha-stage-premise">
          <span>Tell a Joke.</span>
          <span className="text-[#ffc53d] font-serif italic">Fool the AI.</span>
          <span>Get Paid.</span>
        </div>

        {/* Analog Soundstage VU-Meter / Laugh Frequency Sensor */}
        <div className="haha-vu-meter-box">
          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 tracking-wider mb-2">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#ffc53d]" />
              STRAIGHT MAN LAUGH SENSOR
            </span>
            <span className="text-[#ffc53d] font-bold tabular-nums">
              {progress}%
            </span>
          </div>

          {/* Continuous Smooth Progress Track */}
          <div className="haha-vu-track">
            <div
              className="haha-vu-fill"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[9px] font-mono text-zinc-400 tracking-widest mt-2 uppercase">
            <span>Deadpan AI Benchmark</span>
            <span>{progress === 100 ? "Stage Ready" : "Calibrating..."}</span>
          </div>
        </div>
      </main>

      {/* Bottom Editorial Colophon */}
      <footer className="haha-stage-bottom">
        <span className="text-zinc-400 font-mono text-[10px] tracking-[0.14em] uppercase hidden sm:inline">
          The Adversarial Comedy Lab · Robinhood Testnet 46630
        </span>
        <button
          type="button"
          onClick={handleSkip}
          className="haha-stage-skip"
        >
          Enter Stage ↗
        </button>
      </footer>
    </div>
  );
};

export default ArrivalPreloader;
