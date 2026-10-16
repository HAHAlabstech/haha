"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, Disclaimer, SectionTitle, Stamp } from "@/components/ui";
import { truncateAddress } from "@/lib/wallets";

interface VaultSummary {
  verified: number;
  byCategory: Record<string, number>;
  replacementMicroUsd: string;
  revenueMicroUsd: string;
}

interface SnapshotItem {
  id: string;
  entry_count: number;
  replacement_micro_usd: string;
  merkle_root: string;
  tx_hash?: string | null;
  created_at: string;
}

const CATEGORY_META = [
  {
    key: "punchline",
    num: "SET 01",
    name: "Punchline",
    sub: "Expectation Flip",
  },
  {
    key: "subtext",
    num: "SET 02",
    name: "Subtext",
    sub: "Polite vs. Real",
  },
  {
    key: "irl",
    num: "SET 03",
    name: "IRL",
    sub: "Physical World",
  },
  {
    key: "double_meaning",
    num: "SET 04",
    name: "Double Meaning",
    sub: "Two Readings",
  },
];

const PRICE_LIST = [
  {
    tag: "BATCH RELEASE",
    name: "Snapshot License",
    price: "$2,500",
    body: "One cryptographic snapshot of the Vault dataset, per category or full corpus, anchored on-chain.",
  },
  {
    tag: "LIVE STREAM",
    name: "Vault Subscription",
    price: "$1,000 / mo",
    body: "Continuous monthly access to newly verified stumpers plus the dataset API.",
  },
  {
    tag: "BENCHMARK",
    name: "Holdout Eval Run",
    price: "$500",
    body: "Your model tested blindly against the private Straight Man holdout set with a category breakdown.",
  },
  {
    tag: "CUSTOM SET",
    name: "Sponsored Theme Night",
    price: "from $500",
    body: "Commission a custom comedy/nuance category for your domain with dedicated Crowd verification.",
  },
];

function fmtUsd(microStr?: string): string {
  if (!microStr) return "$0.00";
  try {
    const val = Number(BigInt(microStr)) / 1_000_000;
    return `$${val.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  } catch {
    return "$0.00";
  }
}

export default function VaultPage() {
  const [summary, setSummary] = useState<VaultSummary | null>(null);
  const [snapshots, setSnapshots] = useState<SnapshotItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/vault/summary").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/vault/snapshots").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([sum, snaps]) => {
        if (cancelled) return;
        if (sum && !sum.error) setSummary(sum as VaultSummary);
        if (snaps?.snapshots && Array.isArray(snaps.snapshots)) {
          setSnapshots(snaps.snapshots as SnapshotItem[]);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const totalVerified = summary?.verified ?? 0;

  return (
    <div className="mx-auto max-w-[1440px] px-[clamp(20px,4vw,56px)] pt-28 pb-16 space-y-16">
      {/* Header */}
      <div className="grid gap-10 border-b border-[#efe8dc]/12 pb-12 lg:grid-cols-[1.3fr_1fr] lg:items-end">
        <div>
          <span className="eyebrow">The Joke Vault · Provenance Corpus</span>
          <h1 className="display-serif mt-4 text-5xl text-[#fff6ed] md:text-7xl">
            Every laugh becomes <em>permanent record.</em>
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#a49b8e]">
            Each bit that fools the Straight Man and passes a 7–9 human Crowd
            quorum is hashed into The Joke Vault — a cryptographically anchored
            corpus of human wit, subtext, physical common sense, and ambiguity.
          </p>
        </div>

        <dl className="case-meta-grid">
          <div>
            <dt>Verified Entries</dt>
            <dd className="font-mono text-xl text-[#fff6ed] tabular-nums">
              {summary ? totalVerified.toLocaleString("en-US") : "—"}
            </dd>
          </div>
          <div>
            <dt>On-Chain Registry</dt>
            <dd>Weekly Merkle roots published to VaultRegistry</dd>
          </div>
          <div>
            <dt>Deduplication</dt>
            <dd>384-dim pgvector HNSW cosine threshold</dd>
          </div>
          <div>
            <dt>Methodology</dt>
            <dd>
              <Link
                href="/vault/method"
                className="font-mono text-xs uppercase tracking-widest text-[#ffb13b] underline"
              >
                Inspect Formula →
              </Link>
            </dd>
          </div>
        </dl>
      </div>

      {/* Giant Replacement Cost + Actual Revenue Dual Cards */}
      <section aria-label="Vault meter">
        <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
          <Card hot className="relative overflow-hidden">
            {/* Subtle Vault Door Watermark SVG */}
            <svg
              viewBox="0 0 220 220"
              className="pointer-events-none absolute -right-10 -bottom-10 h-64 w-64 opacity-10"
              aria-hidden="true"
            >
              <circle
                cx="110"
                cy="110"
                r="92"
                stroke="#ffb13b"
                strokeWidth="3"
                fill="none"
              />
              <circle
                cx="110"
                cy="110"
                r="68"
                stroke="#ffb13b"
                strokeWidth="1.5"
                strokeDasharray="6 6"
                fill="none"
              />
              <circle
                cx="110"
                cy="110"
                r="22"
                stroke="#ffb13b"
                strokeWidth="3"
                fill="none"
              />
              <line
                x1="110"
                y1="18"
                x2="110"
                y2="202"
                stroke="#ffb13b"
                strokeWidth="2"
              />
              <line
                x1="18"
                y1="110"
                x2="202"
                y2="110"
                stroke="#ffb13b"
                strokeWidth="2"
              />
            </svg>

            <span className="eyebrow">Estimated Replacement Cost</span>
            <p className="display-serif mt-4 text-5xl text-[#fff6ed] tabular-nums md:text-7xl">
              {summary ? fmtUsd(summary.replacementMicroUsd) : "—"}
            </p>
            <p className="mt-4 font-mono text-xs uppercase tracking-[0.15em] text-[#a49b8e]">
              {totalVerified} verified entries · Multi-rater human quorum ·{" "}
              <Link
                href="/vault/method"
                className="text-[#ffb13b] underline hover:text-[#ffd27d]"
              >
                Read methodology →
              </Link>
            </p>
            <p className="mt-3 max-w-xl text-xs leading-relaxed text-[#6c6459]">
              What it would cost an AI lab to source, adversarially filter, and
              verify comparable multi-rater human nuance data from scratch. Not
              a valuation of HAHA or any token.
            </p>
          </Card>

          <Card className="flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="eyebrow">Licensing &amp; Eval Revenue</span>
                <Stamp tone="green">Actual</Stamp>
              </div>
              <p className="display-serif mt-4 text-5xl text-[#8fb596] tabular-nums md:text-6xl">
                {summary ? fmtUsd(summary.revenueMicroUsd) : "—"}
              </p>
              <p className="mt-4 text-sm leading-relaxed text-[#a49b8e]">
                Real on-chain USDG payments received via{" "}
                <code className="font-mono text-xs text-[#efe8dc]">
                  ProducerGateway
                </code>{" "}
                and{" "}
                <code className="font-mono text-xs text-[#efe8dc]">
                  FeeSplitter
                </code>{" "}
                from dataset snapshots, subscriptions, and eval runs.
              </p>
            </div>
            <div className="mt-6 border-t border-[#efe8dc]/10 pt-4 font-mono text-[11px] uppercase tracking-[0.15em] text-[#a49b8e]">
              60% Comics · 30% Crowd · 10% House Split
            </div>
          </Card>
        </div>
      </section>

      {/* Inside the Vault by Category */}
      <section aria-label="Vault contents by category">
        <SectionTitle
          eyebrow="Corpus Breakdown"
          hint="Verified stumpers only"
        >
          Inside the <em>Vault.</em>
        </SectionTitle>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORY_META.map((c) => {
            const count = summary?.byCategory?.[c.key] ?? 0;
            const sharePct =
              totalVerified > 0 ? Math.round((count / totalVerified) * 100) : 0;
            return (
              <Card key={c.key}>
                <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-[#a49b8e]">
                  <span>{c.num}</span>
                  <span>{c.sub}</span>
                </div>
                <h3 className="display-serif mt-3 text-3xl text-[#fff6ed]">
                  {c.name}
                </h3>
                <div className="mt-5 space-y-2 font-mono text-xs">
                  <div className="flex justify-between text-[#efe8dc]">
                    <span className="text-[#a49b8e]">Verified Bits</span>
                    <span className="tabular-nums">
                      {summary ? count.toLocaleString("en-US") : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between text-[#efe8dc]">
                    <span className="text-[#a49b8e]">Corpus Share</span>
                    <span className="text-[#ffb13b] tabular-nums">
                      {totalVerified > 0 ? `${sharePct}%` : "—"}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#efe8dc]/10">
                    <div
                      className="h-full bg-[#ffb13b]"
                      style={{ width: `${Math.max(4, sharePct)}%` }}
                    />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Weekly Growth & Season Markers */}
      <section aria-label="Growth">
        <SectionTitle
          eyebrow="Trajectory"
          hint="Snapshots & Straight Man Seasons"
        >
          Vault Growth &amp; <em>Season Upgrades.</em>
        </SectionTitle>
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="max-w-xl text-sm leading-relaxed text-[#a49b8e]">
              Verified entries and replacement cost across weekly on-chain
              snapshots, with markers for each Season upgrade of the Straight
              Man AI.
            </p>
            <div className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-widest text-[#a49b8e]">
              <span className="inline-flex items-center gap-1.5">
                <i className="inline-block h-2 w-2 rounded-full bg-[#ffb13b]" />
                S0 · Beta
              </span>
              <span className="inline-flex items-center gap-1.5">
                <i className="inline-block h-2 w-2 rounded-full bg-[#8fb596]" />
                S1 · Live
              </span>
            </div>
          </div>

          <div
            aria-hidden
            className="mt-6 flex h-44 items-end gap-3 rounded-xl border border-[#efe8dc]/10 bg-[#0c0a08] p-6"
          >
            {(snapshots.length > 0
              ? snapshots
                  .slice(0, 8)
                  .reverse()
                  .map((s) => Math.min(100, Math.max(18, s.entry_count * 5)))
              : [28, 42, 48, 62, 58, 76, 84, 96]
            ).map((h, i) => (
              <div
                key={i}
                className="group relative flex h-full w-full flex-col justify-end"
              >
                <div
                  style={{ height: `${h}%` }}
                  className="w-full rounded-t bg-gradient-to-t from-[#ffb13b]/20 to-[#ffb13b]/75 transition-all group-hover:to-[#ffd27d]"
                />
                <span className="mt-2 text-center font-mono text-[10px] text-[#6c6459]">
                  W0{i + 1}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </section>

      {/* License the Vault */}
      <section aria-label="License the Vault">
        <SectionTitle eyebrow="Producers & AI Labs" hint="Settled in USDG">
          License the <em>Vault.</em>
        </SectionTitle>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PRICE_LIST.map((p) => (
            <Card key={p.name} className="flex flex-col justify-between">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#ffb13b]">
                  {p.tag}
                </span>
                <h3 className="display-serif mt-2 text-2xl text-[#fff6ed]">
                  {p.name}
                </h3>
                <p className="display-serif mt-3 text-4xl text-[#ffb13b]">
                  {p.price}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-[#a49b8e]">
                  {p.body}
                </p>
              </div>
              <Link
                href="/producers"
                className="mt-6 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-[#efe8dc] hover:text-[#ffb13b]"
              >
                <span>Purchase via ProducerGateway →</span>
              </Link>
            </Card>
          ))}
        </div>
      </section>

      {/* On-Chain Snapshot Proofs */}
      <section aria-label="Proof">
        <SectionTitle eyebrow="VaultRegistry" hint="On-Chain Merkle Roots">
          Cryptographic <em>Proof.</em>
        </SectionTitle>
        <Card>
          <p className="text-sm leading-relaxed text-[#a49b8e]">
            Each weekly dataset release publishes an immutable Merkle root to{" "}
            <code className="font-mono text-xs text-[#efe8dc]">
              VaultRegistry.sol
            </code>
            . Entry counts and replacement costs on-chain match the signed
            dataset manifest.
          </p>
          {snapshots.length > 0 ? (
            <div className="mt-5 space-y-3">
              {snapshots.slice(0, 5).map((s) => (
                <div
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#efe8dc]/10 bg-[#0c0a08] px-4 py-3 font-mono text-xs"
                >
                  <span className="text-[#fff6ed]">
                    {s.entry_count} entries · {fmtUsd(s.replacement_micro_usd)}
                  </span>
                  <span className="text-[#ffb13b]">
                    Root: {truncateAddress(s.merkle_root, 10)}
                  </span>
                  <span className="text-[#6c6459]">
                    {new Date(s.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 font-mono text-xs uppercase tracking-widest text-[#6c6459]">
              No published snapshots yet · Next Merkle root anchors on weekly
              settlement.
            </p>
          )}
        </Card>
      </section>

      <div className="flex flex-wrap gap-4">
        <Link href="/stage" className="pill-btn hot">
          <span>🎤 Add your bit to the Vault →</span>
        </Link>
        <Link href="/vault/method" className="pill-btn">
          <span>Inspect Replacement Cost Formula →</span>
        </Link>
      </div>

      <Disclaimer />
    </div>
  );
}
