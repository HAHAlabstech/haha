"use client";

import React, { useEffect, useState } from "react";

export const ArrivalPreloader: React.FC = () => {
  const [stage, setStage] = useState<"pending" | "ready" | "hidden">("pending");

  useEffect(() => {
    // Check reduced motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStage("hidden");
      return;
    }

    // Lock body scroll & hide floating navbar while preloader covers screen
    document.body.classList.add("haha-preloader-pending");

    const timer1 = setTimeout(() => {
      document.body.classList.remove("haha-preloader-pending");
      setStage("ready");
    }, 1450);

    const timer2 = setTimeout(() => {
      setStage("hidden");
    }, 2350);

    // Absolute failsafe guarantees body scroll release
    const failsafe = setTimeout(() => {
      document.body.classList.remove("haha-preloader-pending");
      setStage("hidden");
    }, 3200);

    // Skip on Escape or Space
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === " ") {
        document.body.classList.remove("haha-preloader-pending");
        setStage("ready");
        setTimeout(() => setStage("hidden"), 850);
      }
    };
    window.addEventListener("keydown", onKey);

    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        document.body.classList.remove("haha-preloader-pending");
        setStage("hidden");
      }
    };
    window.addEventListener("pageshow", onPageShow);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(failsafe);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pageshow", onPageShow);
      document.body.classList.remove("haha-preloader-pending");
    };
  }, []);

  const handleSkip = () => {
    document.body.classList.remove("haha-preloader-pending");
    setStage("ready");
    setTimeout(() => setStage("hidden"), 850);
  };

  if (stage === "hidden") return null;

  return (
    <div
      className={`arrival ${stage === "ready" ? "arrival-ready" : ""}`}
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
      <div className="arrival-paper font-sans">
        {/* Top Masthead */}
        <div className="arrival-masthead flex justify-between items-center text-[10px] sm:text-xs tracking-[0.18em] uppercase text-zinc-400 font-mono">
          <span className="arrival-brand flex items-center gap-2.5 font-bold tracking-[0.24em] text-sm text-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/logo-transparent.webp"
              className="h-7 w-auto object-contain"
              alt="HAHA Logo"
            />
            <span>HAHA</span>
            <span className="text-zinc-600 hidden sm:inline">/</span>
            <span className="text-zinc-400 font-normal hidden sm:inline text-xs tracking-widest">
              HUMANS ARE HARD TO AUTOMATE
            </span>
          </span>
          <span className="flex items-center gap-2 text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ffc53d] animate-pulse" />
            <span className="hidden sm:inline">AI COMEDY LAB · ROBINHOOD TESTNET 46630</span>
            <span className="sm:hidden text-[#ffc53d]">STAGE 01</span>
          </span>
        </div>

        {/* Central Editorial Statement with Golden Stamped Redaction */}
        <div className="arrival-composition my-auto py-6 sm:py-8">
          <p className="arrival-kicker font-mono text-[10px] sm:text-xs tracking-[0.24em] uppercase text-[#ffc53d] mb-4 sm:mb-6 font-semibold">
            THE ADVERSARIAL BENCHMARK FOR HUMAN NUANCE
          </p>

          <div className="arrival-statement font-display text-5xl sm:text-7xl md:text-8xl lg:text-9xl tracking-tight text-white flex flex-col items-start font-black select-none">
            <span>Tell a joke.</span>
            <span className="arrival-redacted relative">
              fool the AI.
              <span className="arrival-redaction">
                <i className="not-italic text-xs sm:text-sm font-mono tracking-[0.28em] text-[#08080c] uppercase font-black">
                  HUMAN WINS
                </i>
                <b className="text-2xl sm:text-3xl font-light text-[#08080c]">↗</b>
              </span>
            </span>
            <span className="text-[#ffc53d]">get paid.</span>
          </div>

          <div className="arrival-caption mt-6 sm:mt-8 flex gap-4 items-center text-zinc-400 font-mono">
            <span className="arrival-caption-rule w-10 h-[1.5px] bg-[#ffc53d] shrink-0" />
            <p className="text-xs sm:text-sm leading-relaxed">
              Tell a joke that stumps the Straight Man AI. Verified by blind crowd consensus on-chain.
              <br className="hidden sm:inline" />
              Daily USDG rewards settle on Robinhood Chain at midnight UTC.
            </p>
          </div>
        </div>

        {/* Bottom Colophon */}
        <div className="arrival-colophon flex justify-between items-center gap-4 border-t border-white/10 pt-4 font-mono text-[10px] tracking-[0.16em] uppercase text-zinc-500">
          <div className="flex items-center gap-3">
            <span className="text-zinc-300">THE STRAIGHT MAN · JOKE VAULT</span>
            <span className="text-zinc-700 hidden sm:inline">|</span>
            <span className="hidden sm:inline text-zinc-400">
              ROBINHOOD CHAIN TESTNET 46630
            </span>
          </div>

          <button
            type="button"
            onClick={handleSkip}
            className="text-zinc-400 hover:text-[#ffc53d] transition-colors cursor-pointer tracking-widest text-[10px]"
          >
            ENTER STAGE ↗
          </button>
        </div>
      </div>
    </div>
  );
};

export default ArrivalPreloader;
