"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, Disclaimer, PageHero, SectionTitle, Stamp } from "@/components/ui";
import { truncateAddress } from "@/lib/wallets";
import { Trophy, Flame, CheckCircle2 } from "lucide-react";

interface ComedianRow {
  wallet: string;
  handle: string;
  comedian_tier: string;
  comedian_rep: number;
  killed_it_count: number;
}

interface JurorRow {
  wallet: string;
  handle: string;
  crowd_tier: string;
  crowd_rep: number;
  votes_cast: number;
}

function placeholderRows(label: string) {
  return [1, 2, 3, 4, 5].map((i) => (
    <tr
      key={i}
      className="border-b border-white/10 text-sm text-zinc-400"
    >
      <td className="py-3.5 pr-4 font-mono text-xs text-[#ffb13b]">0{i}</td>
      <td className="py-3.5 pr-4 font-serif text-lg text-[#fff6ed]">
        {label} #{i}{" "}
        <span className="font-mono text-xs text-zinc-500">· 0x…</span>
      </td>
      <td className="py-3.5 text-right font-mono text-xs text-zinc-400">—</td>
    </tr>
  ));
}

export default function LeaderboardView() {
  const [comedians, setComedians] = useState<ComedianRow[]>([]);
  const [jurors, setJurors] = useState<JurorRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/leaderboard")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        if (Array.isArray(data.comedians)) setComedians(data.comedians);
        if (Array.isArray(data.jurors)) setJurors(data.jurors);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-[1440px] px-[clamp(16px,3vw,36px)] py-8 space-y-12">
      <div className="border-b border-white/10 pb-8">
        <span className="eyebrow">Club Standings · Season 01</span>
        <h1 className="display-serif mt-2 text-4xl text-[#fff6ed] md:text-5xl">
          The sharpest humans <em>in the room.</em>
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
          Top comedians ranked by verified stumpers that beat the Straight Man, and top Crowd jurors ranked by blind consensus accuracy.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <section aria-label="Top comedians">
          <SectionTitle eyebrow="Headliners" hint="By Verified Stumpers">
            Top <em>Comedians.</em>
          </SectionTitle>
          <Card>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400">
                  <th className="py-3 pr-4">Rank</th>
                  <th className="py-3 pr-4">Performer</th>
                  <th className="py-3 text-right">Killed It</th>
                </tr>
              </thead>
              <tbody>
                {comedians.length > 0
                  ? comedians.map((c, i) => (
                      <tr
                        key={c.wallet}
                        className="border-b border-white/10 text-sm transition hover:bg-[#ffb13b]/5"
                      >
                        <td className="py-3.5 pr-4 font-mono text-xs text-[#ffb13b]">
                          {String(i + 1).padStart(2, "0")}
                        </td>
                        <td className="py-3.5 pr-4">
                          <Link
                            href={`/u/${encodeURIComponent(c.handle)}`}
                            className="font-serif text-xl text-[#fff6ed] hover:text-[#ffb13b]"
                          >
                            @{c.handle}
                          </Link>{" "}
                          <span className="ml-1 font-mono text-[11px] text-zinc-500">
                            {truncateAddress(c.wallet)}
                          </span>
                        </td>
                        <td className="py-3.5 text-right">
                          <Stamp>
                            <span className="flex items-center gap-1">
                              <Flame className="w-3 h-3 text-[#ffb13b]" />
                              <span>{c.killed_it_count} · {c.comedian_rep} rep</span>
                            </span>
                          </Stamp>
                        </td>
                      </tr>
                    ))
                  : placeholderRows("Comedian")}
              </tbody>
            </table>
          </Card>
        </section>

        <section aria-label="Top crowd">
          <SectionTitle eyebrow="Front Row Critics" hint="By Consensus Accuracy">
            Top <em>Crowd Jurors.</em>
          </SectionTitle>
          <Card>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400">
                  <th className="py-3 pr-4">Rank</th>
                  <th className="py-3 pr-4">Juror</th>
                  <th className="py-3 text-right">Consensus</th>
                </tr>
              </thead>
              <tbody>
                {jurors.length > 0
                  ? jurors.map((j, i) => (
                      <tr
                        key={j.wallet}
                        className="border-b border-white/10 text-sm transition hover:bg-[#ffb13b]/5"
                      >
                        <td className="py-3.5 pr-4 font-mono text-xs text-[#ffb13b]">
                          {String(i + 1).padStart(2, "0")}
                        </td>
                        <td className="py-3.5 pr-4">
                          <Link
                            href={`/u/${encodeURIComponent(j.handle)}`}
                            className="font-serif text-xl text-[#fff6ed] hover:text-[#ffb13b]"
                          >
                            @{j.handle}
                          </Link>{" "}
                          <span className="ml-1 font-mono text-[11px] text-zinc-500">
                            {truncateAddress(j.wallet)}
                          </span>
                        </td>
                        <td className="py-3.5 text-right font-mono text-xs text-emerald-400">
                          {j.crowd_rep} rep · {j.votes_cast} votes
                        </td>
                      </tr>
                    ))
                  : placeholderRows("Juror")}
              </tbody>
            </table>
          </Card>
        </section>
      </div>

      <Disclaimer />
    </div>
  );
}
