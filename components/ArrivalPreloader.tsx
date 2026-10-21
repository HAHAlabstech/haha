"use client";

import React, { useEffect, useRef, useState, CSSProperties } from "react";

const STAGES = [20, 40, 60, 80, 100];
const FALLBACK_TIMEOUT_MS = 1250;
const EXIT_MS = 900;
const HARD_DEADLINE_MS = 4000;

export const ArrivalPreloader: React.FC = () => {
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(20);
  const [exiting, setExiting] = useState(false);
  const [removed, setRemoved] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const finishedRef = useRef(false);

  useEffect(() => {
    // Check reduced motion
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setRemoved(true);
      return;
    }

    // Lock body scroll & hide navbar while preloader covers screen
    document.body.classList.add("haha-preloader-pending");

    const later = (fn: () => void, ms: number) => {
      const id = window.setTimeout(fn, ms);
      timers.current.push(id);
    };

    const finish = () => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      setProgress(100);
      setExiting(true);
      document.body.classList.remove("haha-preloader-pending");

      later(() => {
        setRemoved(true);
      }, EXIT_MS);
    };

    // Staged progress milestones
    later(() => setProgress(40), 180);
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => setProgress(60)).catch(() => {});
    } else {
      later(() => setProgress(60), 380);
    }
    later(() => setProgress(80), 680);
    later(() => setProgress(100), 950);
    later(finish, FALLBACK_TIMEOUT_MS);

    // Hard failsafe
    const hard = window.setTimeout(finish, HARD_DEADLINE_MS);
    timers.current.push(hard);

    // Keyboard navigation: Esc or Space to enter immediately
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === " ") {
        timers.current.forEach((t) => window.clearTimeout(t));
        finish();
      }
    };
    window.addEventListener("keydown", onKey);

    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) finish();
    };
    window.addEventListener("pageshow", onPageShow);

    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      timers.current.forEach((t) => window.clearTimeout(t));
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pageshow", onPageShow);
      document.body.classList.remove("haha-preloader-pending");
    };
  }, []);

  const handleSkip = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    timers.current.forEach((t) => window.clearTimeout(t));
    setProgress(100);
    setExiting(true);
    document.body.classList.remove("haha-preloader-pending");
    window.setTimeout(() => setRemoved(true), EXIT_MS);
  };

  if (!visible || removed) return null;

  const brandTitle = "HAHA";

  return (
    <div
      ref={rootRef}
      role="status"
      aria-label="Loading HAHA Protocol"
      className={`haha-preloader${exiting ? " is-exiting" : ""}`}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100000,
        background: "#07070a",
      }}
      onClick={handleSkip}
      title="Click anywhere or press ESC to enter stage"
      aria-hidden="true"
    >
      {/* 5-Column Staggered Venetian Wave Shutters */}
      <div className="haha-load-shutters" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <i key={i} style={{ "--i": i } as CSSProperties} />
        ))}
      </div>

      {/* Top Editorial Masthead Rail */}
      <div className="haha-load-top">
        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo-transparent.webp"
            className="h-6 w-auto object-contain filter drop-shadow-[0_0_8px_rgba(255,197,61,0.5)]"
            alt="HAHA Logo"
          />
          <span className="haha-load-brand font-mono font-bold tracking-[0.2em]">
            HAHA PROTOCOL
          </span>
          <span className="hidden sm:inline text-[#ffc53d]/50">/</span>
          <span className="hidden sm:inline text-zinc-400 text-[10px] tracking-widest font-mono">
            AI COMEDY LAB
          </span>
        </div>

        <div className="flex items-center gap-2 text-right">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#ffc53d] animate-pulse" />
          <span className="haha-load-edition font-mono text-[10px] tracking-[0.16em] uppercase">
            SEASON 01 · SHOWTIME STAGE
          </span>
        </div>
      </div>

      {/* Center Cinematic Stage Composition */}
      <div className="haha-load-center">
        {/* Orbiting Concentric Acoustic Diamond Rings + Floating Crest */}
        <div className="haha-load-mark" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo-transparent.webp"
            className="haha-load-logo"
            alt="HAHA Crest"
          />
        </div>

        {/* Massive 3D Perspective Character-by-Character Title */}
        <h1 className="haha-load-title" aria-label="HAHA">
          {brandTitle.split("").map((ch, i) => (
            <span key={i} style={{ "--i": i } as CSSProperties}>
              {ch}
            </span>
          ))}
        </h1>

        {/* Editorial Thesis Statement */}
        <p className="haha-load-subtitle font-mono">
          Humans Are Hard To Automate
        </p>

        {/* Secondary Mission Kicker */}
        <div className="haha-load-kicker font-mono">
          <span className="text-zinc-400">TELL A JOKE</span>
          <span className="text-[#ffc53d] px-2">·</span>
          <span className="text-[#ffc53d]">FOOL THE AI</span>
          <span className="text-[#ffc53d] px-2">·</span>
          <span className="text-zinc-400">GET PAID</span>
        </div>

        {/* 5-Step Segmented Amber Progress Track */}
        <div
          className="haha-load-track"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-hidden="true"
        >
          {[1, 2, 3, 4, 5].map((step) => (
            <i key={step} data-active={String(progress >= step * 20)} />
          ))}
        </div>

        {/* Precision Readout Bar */}
        <div className="haha-load-readout font-mono">
          <span>Robinhood Chain 46630</span>
          <span className="haha-load-percent">
            {String(progress).padStart(2, "0")} / 100
          </span>
        </div>
      </div>

      {/* Bottom Editorial Colophon Rail */}
      <div className="haha-load-bottom">
        <span className="text-zinc-500 font-mono tracking-wider hidden sm:inline">
          Adversarial Benchmark For Human Nuance · Midnight UTC Settle
        </span>
        <button
          type="button"
          onClick={handleSkip}
          className="haha-load-skip font-mono text-[10px] tracking-[0.18em] uppercase hover:text-[#ffc53d] transition-colors"
        >
          Enter Stage ↗
        </button>
      </div>
    </div>
  );
};

export default ArrivalPreloader;
