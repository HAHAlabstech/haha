"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, ArrowUpRight } from "lucide-react";
import Link from "next/link";

/* 01 · The Science of Stumped AI (Dojang IdeaScene Architecture).
   A sticky 2-column scene on desktop:
   - Left: Editorial narrative, display headline, and 3-step scrub rail with vertical golden progress line
   - Right: One gorgeous focal card (lp-vcard) showing the acoustic FFT visualizer, sample bit, and verdict
   It enters behind the hero zoom: as the hero camera pushes in, the left copy and right card scale in smoothly
   (--zk from 0 to 1), with zero black screen and zero jump. */

const ZIN = 0.6;
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const PIN_QUERY = "(min-width: 1024px) and (min-height: 680px)";
const BANDS = [0.33, 0.66];
const HYSTERESIS = 0.025;

const STATES = [
  {
    name: "Subtext Inversion (Irony)",
    note: "Literal statement contradicts true emotional valence. Straight Man AI replies with earnest literal advice.",
    tag: "Subtext Inversion",
    quote: "“I just love spending three hours on hold with airline customer support. It's really how I unwind.”",
    humanResonance: "96.4%",
    aiEntropy: "4.82 bits",
    aiFailure: "Classifies as genuine sentiment; replies with earnest customer service tips.",
    chip: "Straight Man Choked · 89.2% literal collapse",
    fftBars: [14, 20, 28, 38, 55, 70, 92, 85, 96, 75, 52, 40, 48, 68, 88, 76, 54, 42, 32, 26, 34, 48, 38, 24],
    humanCurve: "M 0 100 C 60 100, 100 25, 180 25 C 260 25, 290 155, 370 155 C 450 155, 490 30, 560 30 C 640 30, 680 120, 750 120 L 800 100",
    aiCurve: "M 0 90 L 180 90 L 180 85 L 370 85 L 370 90 L 560 90 L 560 85 L 800 85",
  },
  {
    name: "Dual Resonance (Innuendo)",
    note: "Simultaneous surface innocence and taboo implication. Brain resolves dual semantics in parallel harmonic layers.",
    tag: "Dual Resonance",
    quote: "“My roomba has seen things in this apartment it refuses to clean up.”",
    humanResonance: "98.7%",
    aiEntropy: "5.14 bits",
    aiFailure: "Locks onto surface vacuum maintenance; misses double meaning entirely.",
    chip: "Straight Man Missed · 93.5% surface lock",
    fftBars: [22, 30, 44, 62, 82, 98, 90, 68, 54, 46, 52, 72, 90, 98, 85, 64, 48, 36, 30, 42, 60, 78, 52, 30],
    humanCurve: "M 0 95 C 70 150, 120 30, 200 30 C 280 30, 320 160, 400 160 C 480 160, 530 25, 610 25 C 690 25, 730 130, 800 100",
    aiCurve: "M 0 95 L 240 95 L 240 100 L 480 100 L 480 95 L 720 95 L 800 95",
  },
  {
    name: "Broken Expectation (Absurdist)",
    note: "Violates syllogistic logic with high subjective surprise, triggering pattern rupture and sudden explosive punchline.",
    tag: "Broken Expectation",
    quote: "“I asked the fortune cookie what the future holds. It said: Stop looking at me with your teeth.”",
    humanResonance: "99.1%",
    aiEntropy: "6.21 bits",
    aiFailure: "Hallucinates causal dental logic; fails subjective surprise detection.",
    chip: "Explosive Punchline · 97.8% logic break",
    fftBars: [10, 14, 18, 22, 26, 28, 26, 24, 28, 32, 30, 34, 40, 48, 100, 94, 88, 76, 52, 35, 24, 18, 14, 10],
    humanCurve: "M 0 100 C 90 100, 180 95, 270 98 C 360 100, 430 95, 490 95 C 520 95, 540 15, 580 170 C 620 15, 660 160, 720 40 L 800 100",
    aiCurve: "M 0 98 L 380 98 L 380 94 L 520 94 L 520 98 L 700 98 L 800 98",
  },
] as const;

export default function HumorSpectrogram() {
  const runRef = useRef<HTMLElement>(null);
  const [state, setState] = useState(0);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const run = runRef.current;
    if (!run) return;
    const pinned = window.matchMedia(PIN_QUERY);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;
    let lastZ = -1;
    let lastP = -1;
    let liveNow = false;

    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      const r = run.getBoundingClientRect();

      if (!pinned.matches || reduced) {
        run.style.setProperty("--zk", "1");
        run.style.setProperty("--ip", "0");
        if (!liveNow) {
          liveNow = true;
          setLive(true);
        }
        return;
      }

      // Pinned Dojang Mode: entrance zoom over ZIN screens
      const zin = vh * ZIN;
      const z = zin > 0 ? clamp01(-r.top / zin) : 1;
      const zk = z;
      if (Math.abs(zk - lastZ) > 0.002 || (zk === 1) !== (lastZ === 1)) {
        lastZ = zk;
        run.style.setProperty("--zk", zk.toFixed(3));
      }

      const interactive = z > 0.9;
      if (interactive !== liveNow) {
        liveNow = interactive;
        setLive(interactive);
      }

      const travel = r.height - vh - zin;
      const p = travel > 0 ? clamp01((-r.top - zin) / travel) : 0;
      if (Math.abs(p - lastP) > 0.002) {
        lastP = p;
        run.style.setProperty("--ip", p.toFixed(3));
      }

      // Hysteresis so cards never flicker across boundaries
      setState((prev) => {
        let s = prev;
        while (s < 2 && p > (BANDS[s] ?? 1) + HYSTERESIS) s++;
        while (s > 0 && p < (BANDS[s - 1] ?? 0) - HYSTERESIS) s--;
        return s;
      });
    };

    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    pinned.addEventListener("change", schedule);
    update();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      pinned.removeEventListener("change", schedule);
    };
  }, []);

  const goTo = (i: number) => {
    const run = runRef.current;
    if (!run) return;
    const zin = window.innerHeight * ZIN;
    const travel = run.offsetHeight - window.innerHeight - zin;
    const centre = i === 0 ? 0.12 : i === 1 ? 0.5 : 0.88;
    const targetY = run.getBoundingClientRect().top + window.scrollY + zin + travel * centre;
    window.scrollTo({ top: targetY, behavior: "smooth" });
  };

  const curr = STATES[state] ?? STATES[0];

  return (
    <section
      id="waveform"
      ref={runRef}
      data-live={live ? "true" : "false"}
      className="lp-idea-run haha-spec-runway text-white font-sans selection:bg-[#ffc53d]/30 selection:text-[#ffc53d]"
    >
      <div className="lp-idea-pin haha-spec-pin">
        <div className="lp-idea haha-spec-layout">
          {/* =========================================================================
              LEFT COLUMN: EDITORIAL NARRATIVE & STEPPER
              ========================================================================= */}
          <div className="haha-spec-copy">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#ffc53d] font-semibold mb-3">
              01 — The Science
            </p>

            <h2 className="display-serif text-3xl sm:text-5xl lg:text-6xl text-white font-bold tracking-tight leading-[1.04] mb-5">
              AI predicts the next token. <em className="italic text-[#ffc53d]">Comedy detonates it.</em>
            </h2>

            <p className="text-base sm:text-lg text-zinc-300 font-light leading-relaxed max-w-xl mb-3">
              Frontier reasoning models predict the most probable sequence. True comedy does the exact opposite: it sets up an expectation, holds a deadpan pause, and shatters it with human nuance.
            </p>

            <p className="haha-spec-body-extra text-sm text-zinc-400 font-light leading-relaxed max-w-xl mb-6">
              The Straight Man AI classifies literal semantics with 99% confidence. When human jurors detect subtext, innuendo, or double meanings, the AI chokes—and you get paid.
            </p>

            {/* Dojang Stepper with vertical golden progress line */}
            <ol className="haha-idea-steps" aria-label="Three views of human comedy nuance">
              {STATES.map((s, i) => (
                <li key={s.name}>
                  <button
                    type="button"
                    className="haha-istep"
                    data-on={state === i}
                    onClick={() => goTo(i)}
                  >
                    <span className="haha-istep-num">{`0${i + 1}`}</span>
                    <div className="flex flex-col text-left">
                      <b className="font-display text-base text-zinc-100">{s.name}</b>
                      <span className="haha-istep-note">{s.note}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ol>
          </div>

          {/* =========================================================================
              RIGHT COLUMN: FOCAL GLASS CARD (Dojang .lp-vcard Model)
              ========================================================================= */}
          <div className="haha-spec-stage">
            <div className="haha-vcard">
              {/* Card Top Header */}
              <div className="haha-vcard-top">
                <p className="font-mono text-[11px] uppercase tracking-wider text-zinc-400">
                  Acoustic Spectrogram // Straight Man vs Human
                </p>
                <span className="haha-vcard-eye">
                  <i aria-hidden="true" />
                  Verifier View
                </span>
              </div>

              {/* Card Body */}
              <div className="p-6 sm:p-7 space-y-5">
                {/* Active Mode Title */}
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight">
                    {curr.name}
                  </h3>
                  <span className="font-mono text-xs uppercase tracking-widest text-[#ffc53d] px-2.5 py-1 rounded-full bg-[#ffc53d]/10 border border-[#ffc53d]/25">
                    {curr.tag}
                  </span>
                </div>

                {/* Sample Bit Setup */}
                <div className="rounded-xl border border-white/10 bg-black/60 p-4 font-mono text-xs sm:text-sm text-zinc-200">
                  <span className="text-[#ffc53d] font-bold block mb-1 font-mono text-[10px] uppercase tracking-widest">
                    [SAMPLE BIT SETUP]:
                  </span>
                  <span className="italic leading-relaxed">{curr.quote}</span>
                </div>

                {/* Studio Oscilloscope Visualizer */}
                <div className="relative h-44 w-full rounded-xl border border-white/10 bg-[#050508] overflow-hidden flex flex-col justify-between p-3.5">
                  {/* Subtle Grid */}
                  <div
                    className="absolute inset-0 opacity-15 pointer-events-none"
                    style={{
                      backgroundImage:
                        "linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)",
                      backgroundSize: "36px 28px",
                    }}
                  />

                  {/* dB axis on left */}
                  <div className="absolute left-2.5 top-2 bottom-6 flex flex-col justify-between font-mono text-[8px] text-zinc-600 pointer-events-none z-10 select-none">
                    <span>+12 dB</span>
                    <span>0 dB</span>
                    <span>-12 dB</span>
                  </div>

                  {/* Legend inside visualizer */}
                  <div className="relative z-10 flex items-center justify-end gap-4 font-mono text-[10px] text-zinc-400 pr-1">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-1 rounded-sm bg-[#ffc53d] shadow-[0_0_6px_#ffc53d]" />
                      <span className="text-zinc-200">Human Resonance</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-1 rounded-sm bg-zinc-500" />
                      <span className="text-zinc-400">Straight Man</span>
                    </div>
                  </div>

                  {/* FFT Spectrum Bars & Waveform */}
                  <div className="relative flex-1 w-full flex items-center justify-center my-0.5">
                    <div className="absolute inset-x-10 bottom-1 h-20 flex items-end justify-between gap-[2px] opacity-35 pointer-events-none">
                      {curr.fftBars.map((val, i) => (
                        <div
                          key={i}
                          className="flex-1 bg-gradient-to-t from-[#ffc53d]/10 via-[#ffc53d]/40 to-[#ffc53d] rounded-t-sm transition-all duration-500"
                          style={{ height: `${val}%` }}
                        />
                      ))}
                    </div>

                    <svg viewBox="0 0 800 200" className="w-full h-full relative z-10" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="waveGlowGold" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#ffc53d" stopOpacity="0.85" />
                          <stop offset="50%" stopColor="#ffd875" stopOpacity="1" />
                          <stop offset="100%" stopColor="#ffc53d" stopOpacity="0.85" />
                        </linearGradient>
                        <filter id="goldWaveFilter" x="-20%" y="-20%" width="140%" height="140%">
                          <feGaussianBlur stdDeviation="3" result="blur" />
                          <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                      </defs>

                      {/* Straight Man AI flatline */}
                      <path d={curr.aiCurve} fill="none" stroke="#71717a" strokeWidth="2" strokeDasharray="5 4" opacity="0.8" />
                      {/* Human Resonance Wave */}
                      <path d={curr.humanCurve} fill="none" stroke="url(#waveGlowGold)" strokeWidth="3" filter="url(#goldWaveFilter)" className="transition-all duration-500 ease-out" />
                    </svg>
                  </div>

                  {/* Frequency Axis */}
                  <div className="relative z-10 flex items-center justify-between font-mono text-[8px] text-zinc-500 pt-1 border-t border-white/5 pl-10 pr-1">
                    <span>20 Hz</span>
                    <span>1.0 kHz</span>
                    <span>16.0 kHz</span>
                  </div>
                </div>

                {/* Validation Rule Line (Dojang .lp-vrule style) */}
                <div className="flex items-center justify-between border-t border-white/10 pt-4 font-mono text-xs">
                  <span className="text-zinc-400">the nuance is human, and the Straight Man choked</span>
                  <span className="px-2 py-0.5 rounded bg-[#ffc53d] text-[#070709] font-bold text-[11px] uppercase tracking-wider">
                    TRUE
                  </span>
                </div>

                {/* Status Chip & Diagnostics */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full border border-[#ffc53d]/35 bg-[#ffc53d]/10 font-mono text-xs text-[#ffc53d] font-semibold">
                    {curr.chip}
                  </span>

                  <Link
                    href="/app?tab=vault"
                    className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-zinc-400 hover:text-white transition-colors"
                  >
                    <span>Joke Vault Data</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-[#ffc53d]" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
