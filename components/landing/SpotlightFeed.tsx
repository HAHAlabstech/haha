"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Bot, Users, ArrowUpRight, Flame } from "lucide-react";
import Link from "next/link";

const SAMPLE_BATTLES = [
  {
    id: "bit-101",
    category: "Irony",
    stage: "Pro Stage",
    status: "killed_it",
    setup: "I told my smart thermostat I was shivering, and it sent me a push notification linking to an article on thermal resilience.",
    straightManResponse: "Thermal resilience practices reduce residential energy consumption by 14.2%. Proper layering maintains homeostasis efficiently.",
    comedianRep: "+24 REP",
    jurySplit: "6/7 Voted Human (85.7% Quorum)",
    tipEarned: "$36.50 USDG",
    cardUrl: null,
  },
  {
    id: "bit-102",
    category: "Subtext",
    stage: "Open Mic",
    status: "killed_it",
    setup: "My boss said 'Take as much time off as you need,' which is corporate Latin for 'We have already archived your Slack account.'",
    straightManResponse: "Unlimited PTO policies foster employee autonomy and work-life harmony under modern agile talent frameworks.",
    comedianRep: "+18 REP",
    jurySplit: "5/5 Voted Human (100% Quorum)",
    tipEarned: "$18.20 USDG",
    cardUrl: null,
  },
  {
    id: "bit-103",
    category: "Absurdism",
    stage: "Open Mic",
    status: "bombed",
    setup: "Why did the scarecrow win an award? Because he had prior convictions in international maritime arbitration.",
    straightManResponse: "The traditional punchline relies on standing outstanding in a field. Maritime law has no jurisdiction over agricultural avian deterrents.",
    comedianRep: "Safe Stake",
    jurySplit: "2/5 Voted Human (AI Won - 60%)",
    tipEarned: "Archived to Holdout",
    cardUrl: null,
  },
];

type FeedEntry = {
  id: string;
  category: string;
  stage: string;
  status: string;
  setup: string;
  straightManResponse: string;
  comedianRep: string;
  jurySplit: string;
  tipEarned: string;
  cardUrl: string | null;
};

// Live spotlight (GET /api/bits) falls back to fixture copy.
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
          setFeed([]); // keep fixtures when nothing verified yet
          return;
        }
        setFeed(
          spot.map(
            (s: {
              id: string;
              category: string;
              stage: string;
              scenario: string;
              question: string;
              card_url: string | null;
            }): FeedEntry => ({
              id: s.id,
              category: (s.category ?? "punchline").replace(/_/g, " "),
              stage: "Open Mic",
              status: "killed_it",
              setup: s.scenario,
              straightManResponse: s.question,
              comedianRep: "Season 01",
              jurySplit: "Crowd Verified · On Chain",
              tipEarned: "Killed It",
              cardUrl: s.card_url ?? null,
            }),
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
  const battles = live === null || live.length === 0 ? SAMPLE_BATTLES : live;

  return (
    <section id="telemetry" className="relative haha-sec-divider bg-[#050508] py-28 px-[clamp(20px,4vw,56px)] text-white overflow-hidden">
      {/* Ambient Stage Spotlight Background Texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-45 mix-blend-screen"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/landing/bg-spotlight.jpg"
          alt=""
          loading="lazy"
          className="w-full h-full object-cover object-center filter saturate-[1.15] contrast-[1.1]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#050508] via-transparent via-transparent to-[#050508]" />
      </div>

      {/* Ambient Stage Spotlight */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/3 left-1/3 w-[700px] h-[400px] bg-radial from-[#ffc53d]/05 via-transparent to-transparent blur-[140px]"
      />

      <div className="max-w-[1440px] mx-auto relative z-10">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-6 mb-16">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#ffc53d] font-semibold flex items-center gap-2 mb-3">
              <span className="w-1.5 h-1.5 rotate-45 bg-[#ffc53d] inline-block" />
              05 — Live Stage Feed
            </p>
            <h2 className="display-serif text-3xl sm:text-5xl lg:text-6xl text-white font-bold tracking-tight leading-[1.04]">
              Recent Battles in <em className="italic text-[#ffc53d]">the Room.</em>
            </h2>
            <p className="mt-4 text-base sm:text-lg text-zinc-400 font-light leading-relaxed max-w-xl">
              Live snippets from comedians putting bits in front of the Straight Man and the blind Crowd jury.
            </p>
          </div>

          <Link
            href="/stage"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-[#ffc53d]/40 bg-[#ffc53d]/10 font-mono text-xs uppercase tracking-widest text-[#ffc53d] hover:bg-[#ffc53d] hover:text-[#070709] transition-all shadow-[0_0_20px_rgba(255,197,61,0.2)] font-bold"
          >
            <span>Take The Stage</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Battle Cards Grid */}
        <div className="grid gap-6 md:grid-cols-3">
          {battles.map((b) => (
            <div
              key={b.id}
              className="haha-glass-panel rounded-2xl shadow-2xl flex flex-col hover:-translate-y-1 relative overflow-hidden"
            >
              {b.cardUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <a href={b.cardUrl} target="_blank" rel="noopener noreferrer" className="block">
                  <img
                    src={b.cardUrl}
                    alt={`Crowd verdict card for bit ${b.id}`}
                    loading="lazy"
                    className="w-full aspect-[16/9] object-cover hover:opacity-90 transition-opacity"
                  />
                </a>
              ) : (
                <div className="p-7">
                  {/* Card Meta Top */}
                  <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">
                      {b.category} · {b.stage}
                    </span>
                    {b.status === "killed_it" ? (
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-[#ffc53d] bg-[#ffc53d]/10 px-2.5 py-0.5 rounded-full border border-[#ffc53d]/30 font-semibold">
                        <CheckCircle2 className="w-3 h-3 text-[#ffc53d]" />
                        Killed It
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-zinc-400 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/10">
                        <Bot className="w-3 h-3 text-zinc-400" />
                        AI Won
                      </span>
                    )}
                  </div>

                  {/* Comedian Bit Setup */}
                  <div className="mb-5">
                    <span className="font-mono text-[9px] uppercase tracking-widest text-[#ffc53d] block mb-1">
                      Comedian Bit:
                    </span>
                    <p className="font-serif text-base text-white italic leading-relaxed font-light">
                      {b.setup}
                    </p>
                  </div>
                </div>
              )}

              {!b.cardUrl && (
                <div className="px-7 pb-7">
                  {/* Straight Man Response */}
                  <div className="rounded-xl border border-white/10 bg-black/60 p-4 mb-5 font-mono text-xs text-zinc-400 leading-relaxed">
                    <div className="flex items-center gap-1.5 text-zinc-400 mb-1.5">
                      <Bot className="w-3.5 h-3.5 text-[#ffc53d]" />
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-300">The Straight Man:</span>
                    </div>
                    {b.straightManResponse}
                  </div>
                </div>
              )}

              {/* Bottom Jury Split & Action */}
              <div className="mt-auto px-7 py-4 border-t border-white/10 flex items-center justify-between font-mono text-[10px]">
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <Users className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{b.jurySplit}</span>
                </div>
                {b.cardUrl ? (
                  <Link href={`/bit/${b.id}`} className="text-[#ffc53d] font-semibold hover:text-[#ffd875]">
                    View Bit →
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
