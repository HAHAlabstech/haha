"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Bot, Users, ArrowUpRight, Sparkles } from "lucide-react";
import Link from "next/link";

type FeedEntry = {
  id: string;
  category: string;
  stage: string;
  status: string;
  setup: string;
  question: string;
  straightManResponse: string;
  jurySplit: string;
  tipEarned: string;
  isLiveBit: boolean;
};

const SAMPLE_BATTLES: FeedEntry[] = [
  {
    id: "bit-101",
    category: "Punchline",
    stage: "Pro Stage · 2.5×",
    status: "killed_it",
    setup:
      "I told my smart thermostat I was shivering, and it sent me a push notification linking to an article on thermal resilience.",
    question: "Why is the smart thermostat's reaction funny?",
    straightManResponse:
      "Thermal resilience practices reduce residential energy consumption by 14.2%. Proper layering maintains homeostasis efficiently.",
    jurySplit: "6/7 Jurors · 86% Quorum",
    tipEarned: "$36.50 USDG",
    isLiveBit: false,
  },
  {
    id: "bit-102",
    category: "Subtext",
    stage: "Open Mic · 1.0×",
    status: "killed_it",
    setup:
      "My boss said 'Take as much time off as you need,' which is corporate Latin for 'We have already archived your Slack account.'",
    question: "What is the real meaning behind the boss's offer?",
    straightManResponse:
      "Unlimited PTO policies foster employee autonomy and work-life harmony under modern agile talent frameworks.",
    jurySplit: "5/5 Jurors · 100% Quorum",
    tipEarned: "$18.20 USDG",
    isLiveBit: false,
  },
  {
    id: "bit-103",
    category: "Double Meaning",
    stage: "Open Mic · 1.0×",
    status: "killed_it",
    setup:
      "My therapist told me time heals all wounds, so I waited in the lobby for three hours and refused to pay the copay.",
    question: "How did the patient twist the therapist's advice?",
    straightManResponse:
      "Psychological recovery occurs over longitudinal intervals rather than acute waiting-room durations. Copayments remain contractually due.",
    jurySplit: "5/5 Jurors · 100% Quorum",
    tipEarned: "$24.00 USDG",
    isLiveBit: false,
  },
];

function formatCategory(cat?: string): string {
  if (!cat) return "Punchline";
  const cleaned = cat.replace(/_/g, " ").trim();
  if (cleaned.toLowerCase() === "irl") return "IRL Nuance";
  return cleaned.replace(/\b\w/g, (c) => c.toUpperCase());
}

function useSpotlightFeed() {
  const [feed, setFeed] = useState<FeedEntry[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/bits")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return;
        const spot = Array.isArray(d.spotlight) ? d.spotlight : [];
        if (spot.length === 0) {
          setFeed([]);
          return;
        }
        setFeed(
          spot.slice(0, 3).map(
            (s: {
              id: string;
              category?: string;
              stage?: string;
              scenario: string;
              question: string;
              ai_answer?: { answer?: string } | null;
              outcome?: { win_strength?: number; juror_count?: number } | null;
            }): FeedEntry => {
              const winPct =
                typeof s.outcome?.win_strength === "number"
                  ? `${Math.round(s.outcome.win_strength * 100)}% Quorum`
                  : "100% Quorum";
              const jurors =
                typeof s.outcome?.juror_count === "number" && s.outcome.juror_count > 0
                  ? `${s.outcome.juror_count} Jurors`
                  : "5 Jurors";
              return {
                id: s.id,
                category: formatCategory(s.category),
                stage: s.stage === "pro" ? "Pro Stage · 2.5×" : "Open Mic · 1.0×",
                status: "killed_it",
                setup: s.scenario,
                question: s.question,
                straightManResponse:
                  s.ai_answer?.answer ??
                  "Literal chain-of-thought analysis failed to detect the comedic inversion in the human setup.",
                jurySplit: `${jurors} · ${winPct}`,
                tipEarned: "Inspect Bit",
                isLiveBit: true,
              };
            },
          ),
        );
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return feed;
}

export default function SpotlightFeed() {
  const live = useSpotlightFeed();
  const battles =
    live === null || live.length === 0
      ? SAMPLE_BATTLES
      : [
          ...live,
          ...SAMPLE_BATTLES.slice(0, Math.max(0, 3 - live.length)),
        ].slice(0, 3);

  return (
    <section
      id="telemetry"
      className="relative haha-sec-divider bg-[#070709] py-28 px-[clamp(20px,4vw,56px)] text-white overflow-hidden"
    >
      {/* Ambient Stage Spotlight Background Texture — matched tone & opacity with Section 04 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-35 mix-blend-screen"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/landing/bg-spotlight.jpg"
          alt=""
          loading="lazy"
          className="w-full h-full object-cover object-center filter saturate-[1.05] contrast-[1.1]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#070709] via-transparent to-[#070709]" />
      </div>

      {/* Subtle Warm Gold Radial Glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/3 left-1/3 w-[750px] h-[450px] bg-radial from-[#ffc53d]/06 via-transparent to-transparent blur-[140px]"
      />

      <div className="max-w-[1440px] mx-auto relative z-10">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-6 mb-16">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#ffc53d] font-semibold mb-3">
              05 — Live Stage Feed
            </p>
            <h2 className="display-serif text-3xl sm:text-5xl lg:text-6xl text-white font-bold tracking-tight leading-[1.04]">
              Recent Battles in <em className="italic text-[#ffc53d]">the Room.</em>
            </h2>
            <p className="mt-4 text-base sm:text-lg text-zinc-400 font-light leading-relaxed max-w-2xl">
              Verified bits where human comedians stumped the Straight Man and passed a blind Crowd quorum on Robinhood Chain.
            </p>
          </div>

          <Link
            href="/app?tab=stage"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full border border-[#ffc53d]/35 bg-[#ffc53d]/10 font-mono text-xs uppercase tracking-widest text-[#ffc53d] hover:bg-[#ffc53d] hover:text-[#070709] transition-all duration-200 shadow-[0_0_24px_rgba(255,197,61,0.18)] font-bold"
          >
            <span>Take The Stage</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Unified Obsidian & Amber Gold Glass Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          {battles.map((b, idx) => (
            <div
              key={b.id}
              className="haha-glass-panel group rounded-2xl p-7 backdrop-blur-md shadow-2xl flex flex-col justify-between hover:-translate-y-1 transition-all duration-300 relative"
            >
              <div>
                {/* Card Meta Top */}
                <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 rounded-xl bg-white/5 border border-white/10 text-[#ffc53d] group-hover:bg-[#ffc53d]/10 transition-colors">
                      <Sparkles className="w-3.5 h-3.5" />
                    </span>
                    <div>
                      <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-200 font-semibold block">
                        {b.category}
                      </span>
                      <span className="font-mono text-[9px] uppercase tracking-wider text-zinc-500 block">
                        {b.stage}
                      </span>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-[#ffc53d] bg-[#ffc53d]/10 px-3 py-1 rounded-full border border-[#ffc53d]/30 font-semibold">
                    <CheckCircle2 className="w-3 h-3 text-[#ffc53d]" />
                    <span>Killed It</span>
                  </span>
                </div>

                {/* Comedian Bit Setup */}
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-[#ffc53d] font-semibold">
                      0{idx + 1} // Comedian Setup
                    </span>
                    <span className="font-mono text-[10px] text-zinc-500">
                      Human Bit
                    </span>
                  </div>
                  <p className="display-serif text-lg text-white leading-relaxed font-normal line-clamp-4">
                    “{b.setup}”
                  </p>
                </div>

                {/* Straight Man AI Response Terminal */}
                <div className="rounded-xl border border-white/10 bg-[#070709]/80 p-4 font-mono text-xs text-zinc-300 leading-relaxed">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2">
                    <div className="flex items-center gap-1.5">
                      <Bot className="w-3.5 h-3.5 text-[#ffc53d]" />
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-200">
                        The Straight Man
                      </span>
                    </div>
                    <span className="text-[9px] uppercase tracking-widest text-zinc-500">
                      Stumped
                    </span>
                  </div>
                  <p className="text-zinc-400 text-[11px] leading-relaxed line-clamp-3">
                    {b.straightManResponse}
                  </p>
                </div>
              </div>

              {/* Bottom Jury Split & Action */}
              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between font-mono text-[11px]">
                <div className="flex items-center gap-2 text-zinc-400">
                  <Users className="w-3.5 h-3.5 text-[#ffc53d]" />
                  <span>{b.jurySplit}</span>
                </div>
                {b.isLiveBit ? (
                  <Link
                    href={`/bit/${b.id}`}
                    className="inline-flex items-center gap-1 text-[#ffc53d] font-semibold hover:text-white transition-colors"
                  >
                    <span>{b.tipEarned}</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                ) : (
                  <span className="text-[#ffc53d] font-semibold">{b.tipEarned}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
