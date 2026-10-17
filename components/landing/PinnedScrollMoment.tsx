"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, ArrowRight, Activity, AlertTriangle, ShieldCheck } from "lucide-react";

export default function PinnedScrollMoment() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrubProgress, setScrubProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const totalScrollable = rect.height - window.innerHeight;
      if (totalScrollable <= 0) return;
      const current = -rect.top;
      const k = Math.max(0, Math.min(1, current / totalScrollable));
      setScrubProgress(k);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Determine active phase based on scrub progress k [0 -> 1]
  const k = scrubProgress;
  const isPhase1 = k < 0.35;
  const isPhase2 = k >= 0.35 && k < 0.70;
  const isPhase3 = k >= 0.70;

  // Normalized phase progress
  const p1 = Math.max(0, Math.min(1, k / 0.35));
  const p2 = Math.max(0, Math.min(1, (k - 0.35) / 0.35));
  const p3 = Math.max(0, Math.min(1, (k - 0.70) / 0.30));

  return (
    <section
      ref={containerRef}
      id="scrub"
      className="relative w-full h-[320vh] bg-[#060606] text-[#f4f4f5] border-y border-white/10"
      aria-label="Pinned Scroll Signature Moments"
    >
      {/* =========================================================================
          STICKY PINNED VIEWPORT (100vh pinned while scrolling 320vh)
          ========================================================================= */}
      <div className="sticky top-0 h-screen w-full flex flex-col justify-between p-[clamp(20px,4vw,56px)] overflow-hidden">
        {/* Top HUD: Label, Active Phase, and Real-time Scrub Indicator */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-[#ffb13b] animate-ping" />
            <span className="font-mono text-xs uppercase tracking-[0.22em] text-[#ffb13b] font-semibold">
              Pinned Scroll Scrub
            </span>
            <span className="text-zinc-600">|</span>
            <span className="font-mono text-xs uppercase tracking-wider text-zinc-400">
              {isPhase1 && "Chapter 01 · The Pronoun Trap"}
              {isPhase2 && "Chapter 02 · The Subtext Translator"}
              {isPhase3 && "Chapter 03 · IRL Physics Dynamics"}
            </span>
          </div>

          <div className="flex items-center gap-4 font-mono text-xs text-zinc-400">
            <span className="hidden sm:inline">Scrub progress:</span>
            <div className="w-32 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-[#ffb13b] transition-all duration-75 shadow-[0_0_8px_#ffb13b]"
                style={{ width: `${(k * 100).toFixed(1)}%` }}
              />
            </div>
            <span className="text-zinc-200 tabular-nums font-semibold w-10 text-right">
              {Math.round(k * 100)}%
            </span>
          </div>
        </div>

        {/* Center Canvas: Dynamic Phase Transitions Driven by Scrub */}
        <div className="relative z-10 my-auto w-full max-w-5xl mx-auto">
          {/* ================= PHASE 1: THE PRONOUN TRAP ================= */}
          {isPhase1 && (
            <div className="transition-all duration-300">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 font-mono text-[10px] uppercase tracking-widest text-[#ffb13b] mb-4">
                <Sparkles className="w-3 h-3" />
                <span>Expectation Flip</span>
              </div>

              <h3 className="display-serif text-3xl sm:text-5xl lg:text-6xl text-white font-normal leading-tight mb-8">
                “My therapist told me to write letters to the people I'm angry at and then burn{" "}
                <span
                  className={`inline-block px-2 py-0.5 rounded transition-all duration-300 ${
                    p1 > 0.3
                      ? "text-[#ffb13b] bg-[#ffb13b]/15 border border-[#ffb13b]/40 font-semibold"
                      : "text-zinc-400"
                  }`}
                >
                  them
                </span>
                . I did it. Now I have no letters and I'm still angry at{" "}
                <span
                  className={`inline-block px-2 py-0.5 rounded transition-all duration-300 ${
                    p1 > 0.65
                      ? "text-rose-400 bg-rose-500/15 border border-rose-500/40 font-semibold shadow-[0_0_16px_rgba(244,63,94,0.3)]"
                      : "text-zinc-500 opacity-40"
                  }`}
                >
                  the people I burned.
                </span>
                ”
              </h3>

              {/* Scrubbed Live Metrics Panel */}
              <div className="grid gap-4 sm:grid-cols-2 rounded-2xl border border-white/10 bg-[#09090c]/90 p-6 backdrop-blur-md">
                <div>
                  <div className="flex justify-between font-mono text-xs uppercase text-zinc-400 mb-2">
                    <span>Straight Man Literal Confidence</span>
                    <span className="text-[#3b82f6] tabular-nums font-semibold">
                      {Math.max(12, Math.round(98 - p1 * 86))}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-[#3b82f6] transition-all duration-100"
                      style={{ width: `${Math.max(12, Math.round(98 - p1 * 86))}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-zinc-400">
                    AI collapses from 98% confidence to deadpan confusion as pronoun antecedent flips from 'letters' to 'people'.
                  </p>
                </div>

                <div>
                  <div className="flex justify-between font-mono text-xs uppercase text-zinc-400 mb-2">
                    <span>Crowd Quorum Laugh Consensus</span>
                    <span className="text-emerald-400 tabular-nums font-semibold">
                      {Math.min(94, Math.round(18 + p1 * 76))}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 transition-all duration-100 shadow-[0_0_8px_#34d399]"
                      style={{ width: `${Math.min(94, Math.round(18 + p1 * 76))}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-zinc-400">
                    Human jury consensus triggers the 'Killed It' quorum settlement threshold (&ge;60%).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ================= PHASE 2: THE SUBTEXT TRANSLATOR ================= */}
          {isPhase2 && (
            <div className="transition-all duration-300">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 font-mono text-[10px] uppercase tracking-widest text-[#ffb13b] mb-4">
                <Activity className="w-3 h-3" />
                <span>The Subtext Translator</span>
              </div>

              <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4 max-w-xl font-mono text-xs text-zinc-400">
                SCENARIO: You cancelled dinner for the third time this week. They reply:
              </div>

              {/* Chat Split Comparison */}
              <div className="grid gap-6 md:grid-cols-2 mb-8">
                {/* Surface Polite Text */}
                <div className="rounded-2xl border border-white/10 bg-[#09090c] p-6">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 block mb-2">
                    Surface Text (What Was Said)
                  </span>
                  <div className="rounded-2xl rounded-tl-sm bg-white/10 p-4 text-lg font-serif text-white">
                    “No worries at all!! Totally get it 😊 Maybe next year haha.”
                  </div>
                  <div className="mt-4 font-mono text-xs text-[#3b82f6]">
                    AI Sentiment Analysis: Positive / Understanding (+0.84)
                  </div>
                </div>

                {/* Subtext Real Meaning */}
                <div
                  className={`rounded-2xl border transition-all duration-300 p-6 ${
                    p2 > 0.4
                      ? "border-[#ffb13b]/40 bg-[#0c0c10] shadow-[0_0_24px_rgba(255,177,59,0.15)]"
                      : "border-white/5 bg-[#09090c]/40 opacity-40"
                  }`}
                >
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#ffb13b] block mb-2">
                    Subtext Reality (What Was Meant)
                  </span>
                  <div className="rounded-2xl rounded-tl-sm bg-[#ffb13b]/10 border border-[#ffb13b]/20 p-4 text-lg font-serif text-[#f4f4f5] italic">
                    “I have already emotionally archived your existence.”
                  </div>
                  <div className="mt-4 font-mono text-xs text-rose-400">
                    Human Quorum Consensus: Sarcastic Inversion (-0.95)
                  </div>
                </div>
              </div>

              <div className="font-mono text-xs text-zinc-400 flex items-center gap-2">
                <span className="text-[#ffb13b]">&rarr;</span>
                <span>Scrub deeper to reveal the physical dynamics experiment below...</span>
              </div>
            </div>
          )}

          {/* ================= PHASE 3: IRL PHYSICAL DYNAMICS ================= */}
          {isPhase3 && (
            <div className="transition-all duration-300">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 font-mono text-[10px] uppercase tracking-widest text-[#ffb13b] mb-4">
                <AlertTriangle className="w-3 h-3 text-[#ffb13b]" />
                <span>Physical World Understanding</span>
              </div>

              <div className="grid gap-8 md:grid-cols-[1.2fr_1fr] items-center">
                <div>
                  <h3 className="display-serif text-3xl sm:text-5xl text-white font-normal leading-tight mb-4">
                    Hard brake at a <em className="italic text-[#ffb13b]">red light.</em>
                  </h3>
                  <p className="text-base text-zinc-300 leading-relaxed mb-6">
                    A full glass of water sitting loosely on a car dashboard. The driver slams on the brakes.
                  </p>

                  <div className="space-y-3 font-mono text-xs">
                    <div className="rounded-xl border border-white/10 bg-[#09090c] p-3.5">
                      <span className="text-zinc-500 uppercase block text-[10px]">Straight Man AI Output:</span>
                      <span className="text-zinc-300">
                        “The vehicle decelerates smoothly. Surface friction maintains the glass's center of gravity.”
                      </span>
                    </div>

                    <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/5 p-3.5">
                      <span className="text-emerald-400 uppercase block text-[10px]">Human Reality:</span>
                      <span className="text-white font-serif italic text-sm">
                        “The water is now dripping out of your air conditioning vents and hazard light button.”
                      </span>
                    </div>
                  </div>
                </div>

                {/* Interactive SVG Water Glass Tipping on Scrub */}
                <div className="relative h-64 w-full rounded-2xl border border-white/10 bg-[#09090c] p-6 flex flex-col items-center justify-center overflow-hidden">
                  <div
                    className="transition-transform duration-100 ease-out flex flex-col items-center"
                    style={{
                      transform: `rotate(${p3 * 28}deg)`,
                      transformOrigin: "bottom center",
                    }}
                  >
                    {/* Glass Container */}
                    <div className="w-24 h-32 border-2 border-white/40 border-t-0 rounded-b-xl relative overflow-hidden bg-white/5 backdrop-blur-sm">
                      {/* Water Level */}
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#3b82f6] to-[#60a5fa] opacity-80 transition-all duration-75"
                        style={{
                          height: `${Math.max(20, 75 - p3 * 45)}%`,
                          transform: `rotate(${-p3 * 15}deg)`,
                        }}
                      />
                    </div>
                    <div className="w-20 h-1 bg-white/20 mt-1 rounded-full" />
                  </div>

                  {/* Water Slosh Drops on High Tilt */}
                  {p3 > 0.4 && (
                    <div
                      className="absolute top-16 right-16 font-mono text-xs text-[#60a5fa] animate-pulse"
                      style={{ opacity: p3 }}
                    >
                      *SLOSH*
                    </div>
                  )}

                  <div className="absolute bottom-3 left-4 font-mono text-[10px] text-zinc-500 uppercase tracking-widest">
                    Tilt Angle: {Math.round(p3 * 28)}°
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Navigation Indicators for the 3 Pinned Chapters */}
        <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-4 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
          <div className="flex items-center gap-6">
            <span className={isPhase1 ? "text-[#ffb13b] font-semibold" : "text-zinc-600"}>
              01 Pronoun
            </span>
            <span className={isPhase2 ? "text-[#ffb13b] font-semibold" : "text-zinc-600"}>
              02 Subtext
            </span>
            <span className={isPhase3 ? "text-[#ffb13b] font-semibold" : "text-zinc-600"}>
              03 Physical IRL
            </span>
          </div>

          <span className="hidden sm:inline">Keep scrolling to advance chapters</span>
        </div>
      </div>
    </section>
  );
}
