"use client";

import { useEffect, useState } from "react";
import { Card, Disclaimer, PageHero, SectionTitle, Stamp } from "@/components/ui";

interface SeasonEntry {
  id: string;
  name: string;
  kind: string;
  base_model?: string;
  holdout_n?: number;
  holdout_score: number | null;
  is_active: boolean;
  body: string;
}

const DEFAULT_SEASONS: SeasonEntry[] = [
  {
    id: "S1",
    name: "Straight Man S1",
    kind: "mimo_playbook_max",
    base_model: "mimo-v2.6-pro",
    holdout_n: 0,
    holdout_score: null,
    is_active: true,
    body: "The inaugural playbook. Open Mic bits face a weakened setup; Pro Stage bits face the full model and retrieval playbook.",
  },
];

export default function SeasonsPage() {
  const [seasons, setSeasons] = useState<SeasonEntry[]>(DEFAULT_SEASONS);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/seasons")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (
          !cancelled &&
          Array.isArray(data?.seasons) &&
          data.seasons.length > 0
        ) {
          setSeasons(data.seasons as SeasonEntry[]);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-[1440px] px-[clamp(20px,4vw,56px)] pt-28 pb-16 space-y-14">
      <PageHero
        kicker="Straight Man Evolution · Seasons"
        title={
          <>
            Every season, <em>harder to fool.</em>
          </>
        }
        lede="Each season the Straight Man studies the verified bits that stumped it. Human win-rates are benchmarked on a blind private holdout set — verifiable progress, never marketing fluff."
      />

      <section aria-label="How the Straight Man learns">
        <SectionTitle
          eyebrow="Architecture"
          hint="mimo_playbook_max + pgvector retrieval"
        >
          How the Straight Man <em>learns.</em>
        </SectionTitle>
        <Card hot>
          <p className="text-base leading-relaxed text-zinc-300">
            <code className="font-mono text-sm text-[#ffb13b]">
              mimo_playbook_max:
            </code>{" "}
            The Straight Man upgrades by compiling a structured playbook of
            blindspot patterns plus k-NN retrieved examples from{" "}
            <b className="text-white">The Joke Vault</b>. Every verified miss teaches the next Season
            playbook what to watch out for.
          </p>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-[#09090c] p-5 shadow-lg">
              <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">
                Tier 01 · 1.0× Weight
              </span>
              <h3 className="display-serif mt-2 text-2xl text-[#f4f4f5]">
                Open Mic — Weakened AI
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                Fast, literal baseline setup without playbook retrieval. Easier
                to stump and ideal for testing new premises.
              </p>
            </div>
            <div className="rounded-xl border border-[#ffb13b]/40 bg-[#ffb13b]/10 p-5 shadow-lg">
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#ffb13b]">
                Tier 02 · 2.5× Weight
              </span>
              <h3 className="display-serif mt-2 text-2xl text-[#f4f4f5]">
                Pro Stage — Full Playbook
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                Full chain-of-thought reasoning armed with the complete Season
                playbook and similar Vault bits. Worth 2.5× reward weight.
              </p>
            </div>
          </div>
        </Card>
      </section>

      <section aria-label="Season history">
        <SectionTitle eyebrow="Lineage" hint="Holdout-scored · Blind-judged">
          Season <em>History.</em>
        </SectionTitle>
        <div className="grid gap-5">
          {seasons.map((s) => (
            <Card key={s.id || s.name}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  <h3 className="display-serif text-3xl text-[#f4f4f5]">
                    {s.name}
                  </h3>
                  <Stamp tone={s.is_active ? "amber" : "green"}>
                    {s.is_active ? "● Current Season" : "Archived"}
                  </Stamp>
                </div>
                <p className="font-mono text-xs uppercase tracking-widest text-zinc-400">
                  {s.kind}
                  {s.base_model ? ` · ${s.base_model}` : ""}
                </p>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-zinc-300">
                {s.body}
              </p>
              <p className="mt-4 font-mono text-xs uppercase tracking-widest text-[#ffb13b]">
                Holdout Accuracy:{" "}
                {s.holdout_score != null && s.holdout_score > 0
                  ? `${(s.holdout_score * 100).toFixed(1)}%`
                  : "Calibrating on Season 01 holdout"}
              </p>
            </Card>
          ))}
        </div>
      </section>

      <Disclaimer />
    </div>
  );
}
