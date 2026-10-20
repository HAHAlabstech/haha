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
    <section id="telemetry" className="relative py-24 px-[clamp(20px,4vw,56px)] max-w-[1440px] mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-6 mb-16">
        <div>
          <span className="font-mono text-xs uppercase tracking-[0.24em] text-[#ffc53d] font-semibold block mb-3">
            Live Stage Feed
          </span>
          <h2 className="display-serif text-3xl sm:text-5xl text-[#f4f4f5] tracking-tight">
            Recent Battles in <em>the Room.</em>
          </h2>
          <p className="mt-3 text-base text-zinc-400 max-w-xl">
            Live snippets from comedians putting bits in front of the Straight Man and the blind Crowd jury.
          </p>
        </div>

        <Link
          href="/stage"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-[#ffc53d]/30 bg-[#ffc53d]/10 font-mono text-xs uppercase tracking-widest text-[#ffc53d] hover:bg-[#ffc53d]/20 hover:text-white transition-all shadow-[0_0_12px_rgba(255,177,59,0.2)]"
        >
          <span>Take The Stage</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Battle Cards Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {battles.map((b) => (
          <div
            key={b.id}
            className="rounded-2xl border border-white/10 bg-[#0c0c12] shadow-xl transition-all duration-300 hover:border-white/20 overflow-hidden flex flex-col"
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
              <div className="p-6">
                {/* Card Meta Top */}
                <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">
                    {b.category} · {b.stage}
                  </span>
                  {b.status === "killed_it" ? (
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-[#ffc53d] bg-[#ffc53d]/10 px-2 py-0.5 rounded-full border border-[#ffc53d]/30 font-semibold">
                      <CheckCircle2 className="w-3 h-3 text-[#ffc53d]" />
                      Killed It
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-zinc-300 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
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
                  <p className="font-serif text-base text-[#f4f4f5] italic leading-relaxed">
                    {b.setup}
                  </p>
                </div>
              </div>
            )}

            {!b.cardUrl && (
              <div className="px-6 pb-6">
                {/* Straight Man Response */}
                <div className="rounded-xl border border-white/5 bg-[#050507] p-3.5 mb-5 font-mono text-xs text-zinc-400 leading-relaxed">
                  <div className="flex items-center gap-1.5 text-zinc-500 mb-1">
                    <Bot className="w-3 h-3 text-zinc-400" />
                    <span className="text-[10px] uppercase tracking-wider">The Straight Man:</span>
                  </div>
                  {b.straightManResponse}
                </div>
              </div>
            )}

            {/* Bottom Jury Split & Action */}
            <div className="mt-auto px-6 py-4 border-t border-white/10 flex items-center justify-between font-mono text-[10px]">
              <div className="flex items-center gap-1.5 text-zinc-400">
                <Users className="w-3 h-3 text-zinc-500" />
                <span>{b.jurySplit}</span>
              </div>
              {b.cardUrl ? (
                <Link href={`/bit/${b.id}`} className="text-[#ffc53d] font-semibold hover:text-[#ffa71a]">
                  View Bit →
                </Link>
              ) : (
                <span className="text-[#ffc53d] font-semibold">{b.tipEarned}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
