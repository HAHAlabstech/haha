"use client";

import { useEffect, useState } from "react";

interface StraightManLiveEngineProps {
  stage: "prescreen" | "straightman" | "crowd";
  category?: string;
}

const PRESCREEN_LOGS = [
  "TOKENIZING SCENARIO CADENCE & SEMANTIC VECTORS...",
  "CHECKING PGVECTOR EMBEDDING COSINE DISTANCE (< 0.88)...",
  "VERIFYING CLARITY & HOUSE SAFETY INVARIANTS...",
];

const STRAIGHTMAN_LOGS = [
  "LOADING S1 STRAIGHT MAN LITERAL PLAYBOOK (OPUS 5.5)...",
  "STRIPPING SUBTEXT, IRONY & EXPECTATION INVERSION...",
  "SYNTHESIZING DEADPAN LITERAL INTERPRETATION...",
  "COMPUTING CONFIDENCE INTERVAL & SHA-256 RESPONSE HASH...",
];

const CROWD_LOGS = [
  "NORMALIZING A/B CADENCE TO PREVENT STYLE LEAKAGE...",
  "SEATING 5 BLIND HUMAN JURORS (ANTI-COLLUSION FILTER)...",
  "AWAITING QUORUM CONSENSUS VOTES...",
];

export function StraightManLiveEngine({
  stage,
  category = "punchline",
}: StraightManLiveEngineProps) {
  const [stepIdx, setStepIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const logs =
    stage === "prescreen"
      ? PRESCREEN_LOGS
      : stage === "straightman"
        ? STRAIGHTMAN_LOGS
        : CROWD_LOGS;

  useEffect(() => {
    setStepIdx(0);
    const stepTimer = window.setInterval(() => {
      setStepIdx((prev) => (prev + 1) % logs.length);
    }, 2200);
    const secTimer = window.setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => {
      window.clearInterval(stepTimer);
      window.clearInterval(secTimer);
    };
  }, [stage, logs.length]);

  const bars = [0.35, 0.7, 0.5, 0.95, 0.6, 0.85, 0.4, 0.9, 0.55, 0.75, 0.45, 0.8, 0.65, 0.5, 0.9, 0.4];

  return (
    <div className="relative overflow-hidden rounded-xl border border-[#ffc53d]/30 bg-gradient-to-b from-[#13121a] to-[#08080c] p-5 shadow-[0_0_40px_-15px_rgba(255,197,61,0.2)]">
      {/* Scanning Laser Line */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#ffc53d] to-transparent opacity-70 animate-hahaScan"
      />

      {/* Top Telemetry Bar */}
      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3 font-mono text-[10px] uppercase tracking-[0.18em]">
        <span className="text-[#ffc53d] font-semibold">
          {stage === "prescreen"
            ? "STAGE 01 · SEMANTIC PRESCREEN"
            : stage === "straightman"
              ? "STAGE 02 · STRAIGHT MAN ENGINE"
              : "STAGE 03 · BLIND QUORUM DISPATCH"}
        </span>
        <span className="text-zinc-400 tabular-nums">
          {category.replace(/_/g, " ").toUpperCase()} · T+{elapsed}S
        </span>
      </div>

      {/* Animated Equalizer / Neural Waveform */}
      <div className="my-5 flex h-12 items-center justify-center gap-1.5 px-2" aria-hidden>
        {bars.map((h, i) => (
          <span
            key={i}
            style={{
              height: `${Math.round(h * 100)}%`,
              animationDelay: `${i * 90}ms`,
            }}
            className="w-1.5 rounded-full bg-gradient-to-t from-[#f59e0b]/40 via-[#ffc53d] to-[#ffd875] animate-hahaWave"
          />
        ))}
      </div>

      {/* Live Terminal Step */}
      <div className="space-y-2 rounded-lg border border-white/[0.07] bg-[#050508]/90 p-3.5 font-mono text-[11px]">
        <div className="flex items-center justify-between text-[10px] text-zinc-500">
          <span>NEURAL TELEMETRY STREAM</span>
          <span className="text-[#ffc53d]">LIVE</span>
        </div>
        <p className="text-xs leading-relaxed text-zinc-200 transition-all duration-300">
          &gt; {logs[stepIdx]}
        </p>
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-[#ffc53d]/30 via-[#ffc53d] to-[#ffd875] animate-hahaProgress" />
        </div>
      </div>
    </div>
  );
}
