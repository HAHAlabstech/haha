"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ScrollReveal } from "@/components/ScrollReveal";

type FeedEntry = {
  id: string;
  category: string;
  stage: string;
  setup: string;
  straightManResponse: string;
  quorumText: string;
  rightMeta: string;
  href: string;
};

const CURATED_BATTLES: FeedEntry[] = [
  {
    id: "bit-101",
    category: "Subtext",
    stage: "Open Mic",
    setup:
      "My boss said “Take as much time off as you need,” which is corporate Latin for “We have already archived your Slack account.”",
    straightManResponse:
      "Unlimited PTO policies foster employee autonomy and work-life harmony under modern talent frameworks.",
    quorumText: "5/5 crowd quorum",
    rightMeta: "$18.20 USDG",
    href: "/app?tab=stage",
  },
  {
    id: "bit-102",
    category: "Punchline",
    stage: "Pro Stage",
    setup:
      "I told my smart thermostat I was shivering, and it sent me a push notification linking to an article on thermal resilience.",
    straightManResponse:
      "Thermal resilience practices reduce residential energy consumption by 14.2% while maintaining homeostasis.",
    quorumText: "6/7 crowd quorum",
    rightMeta: "$36.50 USDG",
    href: "/app?tab=stage",
  },
  {
    id: "bit-103",
    category: "Double Meaning",
    stage: "Open Mic",
    setup:
      "My therapist told me time heals all wounds, so I waited in the lobby for three hours and refused to pay the copay.",
    straightManResponse:
      "Psychological recovery occurs over longitudinal intervals rather than acute waiting-room durations.",
    quorumText: "5/5 crowd quorum",
    rightMeta: "$24.00 USDG",
    href: "/app?tab=stage",
  },
];

function formatCategory(cat?: string): string {
  if (!cat) return "Punchline";
  const cleaned = cat.replace(/_/g, " ").trim();
  if (cleaned.toLowerCase() === "irl") return "IRL";
  return cleaned.replace(/\b\w/g, (c) => c.toUpperCase());
}

function isSyntheticTestBit(text: string): boolean {
  return /^(photon|test|qa|e2e|seed|bit[-_])/i.test(text.trim());
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
        const cleanSpot = spot.filter(
          (s: { scenario?: string }) =>
            typeof s.scenario === "string" && !isSyntheticTestBit(s.scenario),
        );
        if (cleanSpot.length === 0) {
          setFeed([]);
          return;
        }
        setFeed(
          cleanSpot.slice(0, 3).map(
            (s: {
              id: string;
              category?: string;
              stage?: string;
              scenario: string;
              ai_answer?: { answer?: string } | null;
              outcome?: { win_strength?: number; juror_count?: number } | null;
            }): FeedEntry => {
              const jurors =
                typeof s.outcome?.juror_count === "number" && s.outcome.juror_count > 0
                  ? s.outcome.juror_count
                  : 5;
              const winPct =
                typeof s.outcome?.win_strength === "number"
                  ? Math.round(s.outcome.win_strength * 100)
                  : 100;
              return {
                id: s.id,
                category: formatCategory(s.category),
                stage: s.stage === "pro" ? "Pro Stage" : "Open Mic",
                setup: s.scenario,
                straightManResponse:
                  s.ai_answer?.answer ??
                  "Evaluated literal surface semantics and missed the intended comedic inversion.",
                quorumText: `${jurors} jurors · ${winPct}% quorum`,
                rightMeta: "View bit →",
                href: `/bit/${s.id}`,
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
      ? CURATED_BATTLES
      : [
          ...live,
          ...CURATED_BATTLES.slice(0, Math.max(0, 3 - live.length)),
        ].slice(0, 3);

  return (
    <section
      id="telemetry"
      className="relative haha-sec-divider bg-[#070709] py-28 px-[clamp(20px,4vw,56px)] text-white overflow-hidden"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-30 mix-blend-screen"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/landing/bg-spotlight.jpg"
          alt=""
          loading="lazy"
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#070709] via-transparent to-[#070709]" />
      </div>

      <div className="max-w-[1440px] mx-auto relative z-10">
        {/* Header */}
        <ScrollReveal className="flex flex-wrap items-end justify-between gap-6 mb-16">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#ffc53d] font-semibold mb-3">
              05 — Live Stage Feed
            </p>
            <h2 className="display-serif text-3xl sm:text-5xl lg:text-6xl text-white font-bold tracking-tight leading-[1.04]">
              Recent Battles in <em className="italic text-[#ffc53d]">the Room.</em>
            </h2>
            <p className="mt-4 text-base sm:text-lg text-zinc-400 font-light leading-relaxed max-w-xl">
              Real setups where human comedians stumped the Straight Man and passed a blind Crowd quorum.
            </p>
          </div>

          <Link
            href="/app?tab=stage"
            className="font-mono text-xs uppercase tracking-[0.2em] text-zinc-300 hover:text-[#ffc53d] transition-colors pb-1 border-b border-white/20 hover:border-[#ffc53d]"
          >
            Enter Stage Console &rarr;
          </Link>
        </ScrollReveal>

        {/* Minimal Editorial Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          {battles.map((b, idx) => (
            <ScrollReveal key={b.id} delayMs={idx * 110} className="h-full">
              <Link
                href={b.href}
                className="haha-glass-panel group h-full rounded-2xl p-8 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:border-white/20"
              >
                <div>
                  {/* Top Meta & Killed It Verdict Stamp */}
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 mb-6 font-mono text-[10px] uppercase tracking-[0.16em]">
                    <span className="text-zinc-400">
                      {b.category} · {b.stage}
                    </span>
                    <span className="inline-flex items-center rounded-md border border-[#ffc53d]/30 bg-gradient-to-r from-[#ffc53d]/15 via-[#ffc53d]/08 to-[#ffc53d]/02 px-2.5 py-1 text-[10px] font-semibold tracking-[0.2em] text-[#ffc53d] uppercase shadow-[inset_0_1px_0_rgba(255,197,61,0.25)]">
                      Killed It
                    </span>
                  </div>

                  {/* Human Bit Quote */}
                  <p className="display-serif text-xl sm:text-[22px] text-zinc-100 leading-[1.38] tracking-tight font-normal">
                    “{b.setup}”
                  </p>

                  {/* Straight Man Literal Miss */}
                  <div className="mt-6 pt-5 border-t border-white/[0.07]">
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500 block mb-2">
                      Straight Man literal read
                    </span>
                    <p className="text-[13px] text-zinc-400 leading-relaxed font-light line-clamp-3">
                      {b.straightManResponse}
                    </p>
                  </div>
                </div>

                {/* Quiet Footer */}
                <div className="mt-8 pt-4 border-t border-white/[0.07] flex items-center justify-between font-mono text-[11px]">
                  <span className="text-zinc-500">{b.quorumText}</span>
                  <span className="text-zinc-300 group-hover:text-[#ffc53d] transition-colors">
                    {b.rightMeta}
                  </span>
                </div>
              </Link>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
