"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Layers,
  Orbit,
  Scale,
  Mic,
  ArrowUpRight,
  Database,
  Lock,
  Coins,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { Card, Disclaimer, SectionTitle, Stamp } from "@/components/ui";
import { truncateAddress } from "@/lib/wallets";
import { RobinhoodLogoMark } from "@/components/RobinhoodLogo";

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
    icon: Sparkles,
  },
  {
    key: "subtext",
    num: "SET 02",
    name: "Subtext",
    sub: "Polite vs. Real",
    icon: Layers,
  },
  {
    key: "irl",
    num: "SET 03",
    name: "IRL",
    sub: "Physical World",
    icon: Orbit,
  },
  {
    key: "double_meaning",
    num: "SET 04",
    name: "Double Meaning",
    sub: "Two Readings",
    icon: Scale,
  },
];

const PRICE_LIST = [
  {
    id: "snapshot",
    tag: "BATCH RELEASE",
    name: "Snapshot License",
    price: "$2,500",
    body: "One cryptographic snapshot of the Vault dataset, per category or full corpus, anchored on-chain with Merkle verification.",
    tier: "Production Model Fine-Tuning",
  },
  {
    id: "subscription",
    tag: "LIVE STREAM",
    name: "Vault Subscription",
    price: "$1,000 / mo",
    body: "Continuous monthly access to newly verified stumpers plus the programmatic real-time dataset API stream.",
    tier: "Continuous Evaluation",
  },
  {
    id: "eval",
    tag: "BENCHMARK",
    name: "Holdout Eval Run",
    price: "$500",
    body: "Your model tested blindly against the private Straight Man holdout set with a category breakdown and error telemetry.",
    tier: "Blind Nuance Scoring",
  },
  {
    id: "theme_night",
    tag: "CUSTOM SET",
    name: "Sponsored Theme Night",
    price: "from $500",
    body: "Commission a custom comedy/nuance category for your domain with dedicated Crowd verification and staking pool.",
    tier: "Targeted Alignment",
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

export default function VaultView() {
  const [summary, setSummary] = useState<VaultSummary | null>(null);
  const [snapshots, setSnapshots] = useState<SnapshotItem[]>([]);
  const [activeChartPoint, setActiveChartPoint] = useState<number | null>(null);

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

  // Real published snapshots only. Never draw a modeled/placeholder curve:
  // the Vault is a provenance product, not a growth-rate promise.
  const chartData = snapshots
    .slice(0, 8)
    .reverse()
    .map((s, idx) => ({
      label: `S${String(idx + 1).padStart(2, "0")}`,
      count: s.entry_count,
      cost: Number(BigInt(s.replacement_micro_usd || "0")) / 1_000_000,
      merkle: s.merkle_root,
    }));
  const hasChart = chartData.length >= 2;

  const maxCount = Math.max(...chartData.map((d) => d.count), 200);

  const svgW = 1000;
  const svgH = 340;
  const padX = 60;
  const padY = 50;
  const plotW = svgW - padX * 2;
  const plotH = svgH - padY * 2;

  const getX = (idx: number) => padX + (idx / (chartData.length - 1)) * plotW;
  const getY = (val: number) => padY + plotH - (val / maxCount) * plotH;

  const points = hasChart
    ? chartData.map((d, i) => ({ x: getX(i), y: getY(d.count) }))
    : [];
  let pathD = points[0] ? `M ${points[0].x} ${points[0].y}` : "";
  for (let i = 0; i < points.length - 1; i++) {
    const pCurrent = points[i];
    const pNext = points[i + 1];
    if (!pCurrent || !pNext) continue;
    const cpX1 = pCurrent.x + (pNext.x - pCurrent.x) * 0.45;
    const cpY1 = pCurrent.y;
    const cpX2 = pCurrent.x + (pNext.x - pCurrent.x) * 0.55;
    const cpY2 = pNext.y;
    pathD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${pNext.x} ${pNext.y}`;
  }
  const lastPt = points[points.length - 1] ?? { x: padX, y: padY };
  const firstPt = points[0] ?? { x: padX, y: padY };
  const areaD = `${pathD} L ${lastPt.x} ${padY + plotH} L ${firstPt.x} ${padY + plotH} Z`;

  return (
    <div className="mx-auto max-w-[1440px] px-[clamp(20px,4vw,56px)] py-8 space-y-12">
      {/* Header */}
      <div className="grid gap-8 border-b border-white/10 pb-8 lg:grid-cols-[1.3fr_1fr] lg:items-end">
        <div>
          <span className="eyebrow">The Joke Vault · Provenance Corpus</span>
          <h1 className="display-serif mt-2 text-4xl text-white md:text-5xl">
            Every laugh becomes <em>permanent record.</em>
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
            Each bit that fools the Straight Man and passes a human Crowd
            quorum — normally 5 blind judges, expanding to 7 when the result is
            thin — is hashed into The Joke Vault: a cryptographically anchored
            corpus of human wit, subtext, physical common sense, and ambiguity.
          </p>
        </div>

        <dl className="case-meta-grid">
          <div>
            <dt>Verified Entries</dt>
            <dd className="font-mono text-xl text-white tabular-nums">
              {summary ? totalVerified.toLocaleString("en-US") : "—"}
            </dd>
          </div>
          <div>
            <dt>On-Chain Registry</dt>
            <dd>Weekly Merkle roots published to VaultRegistry.sol</dd>
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
                className="font-mono text-xs uppercase tracking-widest text-[#ffc53d] underline"
              >
                Methodology &amp; Preliminary Pricing →
              </Link>
            </dd>
          </div>
        </dl>
      </div>

      {/* Dual Cards */}
      <section aria-label="Vault meter">
        <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
          <div className="laocoon-card relative overflow-hidden p-8 sm:p-10">
            <svg
              viewBox="0 0 340 340"
              className="pointer-events-none absolute -right-14 -bottom-14 h-96 w-96 opacity-25 select-none"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="apertureBronze" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#ffc53d" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#d97706" stopOpacity="0.3" />
                </linearGradient>
              </defs>
              <g className="animate-spin-slow" style={{ transformOrigin: "170px 170px" }}>
                <circle cx="170" cy="170" r="150" stroke="url(#apertureBronze)" strokeWidth="2.5" fill="none" />
                <circle cx="170" cy="170" r="142" stroke="rgba(255,177,59,0.3)" strokeWidth="1" strokeDasharray="4 8" fill="none" />
              </g>
              <circle cx="170" cy="170" r="42" stroke="#ffc53d" strokeWidth="2.5" fill="none" />
            </svg>

            <span className="font-mono text-xs uppercase tracking-[0.2em] text-[#ffc53d]">
              Estimated Replacement Value · Live Metric
            </span>
            <div className="mt-4 flex flex-wrap items-baseline gap-4">
              <span className="display-serif text-5xl font-light tracking-tight text-white sm:text-7xl">
                {summary ? fmtUsd(summary.replacementMicroUsd) : "$0.00"}
              </span>
              <span className="font-mono text-xs uppercase tracking-widest text-zinc-400">
                modeled cost to recreate — not revenue
              </span>
            </div>
            <p className="mt-5 border-t border-white/10 pt-4 font-mono text-xs text-zinc-400">
              Actual licensing revenue:{" "}
              <span className="text-[#ffc53d]">
                {summary ? fmtUsd(summary.revenueMicroUsd) : "$0.00"}
              </span>
            </p>
          </div>

          <div className="laocoon-card flex flex-col justify-between p-8">
            <div>
              <span className="font-mono text-xs uppercase tracking-[0.2em] text-[#ffc53d]">
                Vault Registry Status
              </span>
              <p className="display-serif mt-3 text-4xl text-white">
                {snapshots.length} Published Epochs
              </p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400 flex items-center gap-2">
                <RobinhoodLogoMark size={14} color="#ffc53d" />
                <span>Dataset releases are cryptographically anchored on Robinhood Chain Testnet every Sunday.</span>
              </p>
            </div>
            <div className="mt-6 border-t border-white/10 pt-4 font-mono text-xs text-[#ffc53d]">
              <span>Dataset Hash Verification Active</span>
            </div>
          </div>
        </div>
      </section>

      {/* Spline Growth Graph */}
      <section aria-label="Dataset trajectory">
        <SectionTitle
          eyebrow="Published Snapshots"
          hint="Real releases only · no modeled curve"
        >
          Dataset <em>Telemetry.</em>
        </SectionTitle>
        <div className="laocoon-card p-6 sm:p-8">
          {hasChart ? (
            <div className="w-full overflow-x-auto">
              <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full min-w-[700px] h-auto">
                <defs>
                  <linearGradient id="vaultSplineGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ffc53d" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#ffc53d" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={areaD} fill="url(#vaultSplineGrad)" />
                <path d={pathD} fill="none" stroke="#ffc53d" strokeWidth="3" />
                {points.map((pt, idx) => (
                  <circle
                    key={idx}
                    cx={pt.x}
                    cy={pt.y}
                    r={activeChartPoint === idx ? "7" : "4.5"}
                    fill={activeChartPoint === idx ? "#ffd27d" : "#ffc53d"}
                    className="cursor-pointer transition-all"
                    onMouseEnter={() => setActiveChartPoint(idx)}
                  />
                ))}
              </svg>
            </div>
          ) : (
            <p className="text-sm leading-relaxed text-zinc-400">
              {snapshots.length === 1
                ? "One snapshot has been published. A trend line will appear after the second real snapshot — we do not invent interim points."
                : "No Vault snapshots have been published yet. This chart stays empty until the first real weekly release; no placeholder curve is shown."}
            </p>
          )}
        </div>
      </section>

      {/* B2B Licensing Tiers + Producer Gateway Link */}
      <section aria-label="B2B Dataset Licensing">
        <SectionTitle
          eyebrow="ProducerGateway.sol · B2B Licensing"
          hint="Enforced on-chain in USDG · 40% Ops / 30% TipJar / 10% royalty / 20% MicDrop"
        >
          License the <em>Corpus.</em>
        </SectionTitle>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {PRICE_LIST.map((item) => (
            <Card key={item.name} className="flex flex-col justify-between">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#ffc53d]">
                  {item.tag}
                </span>
                <h3 className="display-serif mt-2 text-2xl text-white">
                  {item.name}
                </h3>
                <p className="display-serif mt-2 text-3xl text-[#ffc53d]">
                  {item.price}
                </p>
                <p className="mt-3 text-xs leading-relaxed text-zinc-400">
                  {item.body}
                </p>
              </div>
              <div className="mt-6 border-t border-white/10 pt-4 flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                  {item.tier}
                </span>
                <Link
                  href={`/producers?plan=${encodeURIComponent(item.id)}`}
                  className="inline-flex items-center gap-1 font-mono text-xs uppercase tracking-widest text-[#ffc53d] hover:underline"
                >
                  <span>Checkout</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <Disclaimer />
    </div>
  );
}
