"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, Disclaimer, PageHero, SectionTitle, Stamp } from "@/components/ui";
import { truncateAddress } from "@/lib/wallets";

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
      className="border-b border-[#efe8dc]/10 text-sm text-[#a49b8e]"
    >
      <td className="py-3.5 pr-4 font-mono text-xs text-[#ffb13b]">0{i}</td>
      <td className="py-3.5 pr-4 font-serif text-lg text-[#fff6ed]">
        {label} #{i}{" "}
        <span className="font-mono text-xs text-[#6c6459]">· 0x…</span>
      </td>
      <td className="py-3.5 text-right font-mono text-xs text-[#a49b8e]">—</td>
    </tr>
  ));
}

export default function LeaderboardPage() {
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
    <div className="mx-auto max-w-[1440px] px-[clamp(20px,4vw,56px)] pt-28 pb-16 space-y-14">
      <PageHero
        kicker="Club Standings · Season 01"
        title={
          <>
            The sharpest humans <em>in the room.</em>
          </>
        }
        lede="Top comedians ranked by verified stumpers that beat the Straight Man, and top Crowd jurors ranked by blind consensus accuracy."
        rightMeta={
          <div className="space-y-2 font-mono text-xs text-[#a49b8e]">
            <div className="text-[#ffb13b]">SETTLEMENT CADENCE</div>
            <p className="leading-relaxed">
              Standings update automatically as Crowd quorums settle and daily
              Tip Jar epochs finalize.
            </p>
          </div>
        }
      />

      <div className="grid gap-8 lg:grid-cols-2">
        <section aria-label="Top comedians">
          <SectionTitle eyebrow="Headliners" hint="By Verified Stumpers">
            Top <em>Comedians.</em>
          </SectionTitle>
          <Card>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#efe8dc]/15 font-mono text-[10px] uppercase tracking-[0.18em] text-[#a49b8e]">
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
                        className="border-b border-[#efe8dc]/10 text-sm transition hover:bg-[#ffb13b]/5"
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
                          <span className="ml-1 font-mono text-[11px] text-[#6c6459]">
                            {truncateAddress(c.wallet)}
                          </span>
                        </td>
                        <td className="py-3.5 text-right">
                          <Stamp>
                            ★ {c.killed_it_count} · {c.comedian_rep} rep
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
                <tr className="border-b border-[#efe8dc]/15 font-mono text-[10px] uppercase tracking-[0.18em] text-[#a49b8e]">
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
                        className="border-b border-[#efe8dc]/10 text-sm transition hover:bg-[#ffb13b]/5"
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
                          <span className="ml-1 font-mono text-[11px] text-[#6c6459]">
                            {truncateAddress(j.wallet)}
                          </span>
                        </td>
                        <td className="py-3.5 text-right font-mono text-xs text-[#8fb596]">
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
