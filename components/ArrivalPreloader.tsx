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

    // Set arrival-pending so hero/headings are paused behind the sheet
    document.body.classList.add("arrival-pending");

    const timer1 = setTimeout(() => {
      document.body.classList.remove("arrival-pending");
      setStage("ready");
    }, 1450);

    const timer2 = setTimeout(() => {
      setStage("hidden");
    }, 2300);

    // Absolute failsafe: guarantees body is released and preloader hidden even if delayed
    const failsafe = setTimeout(() => {
      document.body.classList.remove("arrival-pending");
      setStage("hidden");
    }, 3200);

    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        document.body.classList.remove("arrival-pending");
        setStage("hidden");
      }
    };
    window.addEventListener("pageshow", onPageShow);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(failsafe);
      window.removeEventListener("pageshow", onPageShow);
      document.body.classList.remove("arrival-pending");
    };
  }, []);

  if (stage === "hidden") return null;

  return (
    <div
      className={`arrival ${stage === "ready" ? "arrival-ready" : ""}`}
      aria-hidden="true"
    >
      <div className="arrival-paper font-sans">
        {/* Masthead */}
        <div className="arrival-masthead flex justify-between items-center text-[10px] tracking-[0.18em] uppercase text-[#18191c]/70 font-mono">
          <span className="arrival-brand flex items-center gap-2.5 font-bold tracking-[0.24em] text-sm text-[#18191c]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/logo-transparent.webp"
              className="h-7 w-auto object-contain filter drop-shadow-[0_0_8px_rgba(255,197,61,0.5)]"
              alt="HAHA Logo"
            />
            <span>HAHA PROTOCOL</span>
          </span>
          <span className="hidden sm:inline">AI COMEDY LAB · ROBINHOOD CHAIN</span>
        </div>

        {/* Composition: Editorial Hero Redacted Statement */}
        <div className="arrival-composition my-auto py-8">
          <p className="arrival-kicker font-mono text-[10px] tracking-[0.24em] uppercase text-[#18191c]/65 mb-6 font-semibold">
            THE ADVERSARIAL BENCHMARK FOR HUMAN NUANCE
          </p>
          <div className="arrival-statement display-serif text-5xl sm:text-7xl md:text-8xl lg:text-9xl tracking-tight leading-[0.95] text-[#18191c] flex flex-col items-start font-bold">
            <span>Humans are</span>
            <span className="arrival-redacted relative">
              hard to
              <span className="arrival-redaction">
                <i className="not-italic text-xs sm:text-sm font-mono tracking-[0.28em] text-[#fae8a4] uppercase font-bold">
                  AUTOMATE
                </i>
                <b className="text-2xl sm:text-3xl font-light text-[#fae8a4]">↗</b>
              </span>
            </span>
            <span>get paid.</span>
          </div>
          <div className="arrival-caption mt-6 flex gap-4 items-center text-[#18191c]/70 font-mono">
            <span className="arrival-caption-rule w-10 h-[1.5px] bg-[#18191c]/40" />
            <p className="text-xs leading-relaxed">
              Tell a joke that stumps the AI. Verified by blind crowd consensus.<br className="hidden sm:inline" />
              USDG rewards settle on Robinhood Chain at midnight UTC.
            </p>
          </div>
        </div>

        {/* Colophon */}
        <div className="arrival-colophon flex justify-between gap-6 border-t border-[#18191c]/15 pt-4 font-mono text-[10px] tracking-[0.16em] uppercase text-[#18191c]/70">
          <span>THE STRAIGHT MAN · JOKE VAULT</span>
          <span>SEASON 01 · TESTNET 46630</span>
        </div>
      </div>
    </div>
  );
};

export default ArrivalPreloader;
