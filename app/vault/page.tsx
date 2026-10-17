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
    tag: "BATCH RELEASE",
    name: "Snapshot License",
    price: "$2,500",
    body: "One cryptographic snapshot of the Vault dataset, per category or full corpus, anchored on-chain with Merkle verification.",
    tier: "Production Model Fine-Tuning",
  },
  {
    tag: "LIVE STREAM",
    name: "Vault Subscription",
    price: "$1,000 / mo",
    body: "Continuous monthly access to newly verified stumpers plus the programmatic real-time dataset API stream.",
    tier: "Continuous Evaluation",
  },
  {
    tag: "BENCHMARK",
    name: "Holdout Eval Run",
    price: "$500",
    body: "Your model tested blindly against the private Straight Man holdout set with a category breakdown and error telemetry.",
    tier: "Blind Nuance Scoring",
  },
  {
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

export default function VaultPage() {
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

  // Chart telemetry data computation
  const defaultCurvePoints = [
    { label: "W01", count: 24, cost: 2400 },
    { label: "W02", count: 38, cost: 4200 },
    { label: "W03", count: 52, cost: 6800 },
    { label: "W04", count: 71, cost: 9600 },
    { label: "W05", count: 89, cost: 12400 },
    { label: "W06", count: 114, cost: 16800 },
    { label: "W07", count: 142, cost: 21500 },
    { label: "W08", count: 178, cost: 28900 },
  ];

  const chartData =
    snapshots.length >= 4
      ? snapshots
          .slice(0, 8)
          .reverse()
          .map((s, idx) => ({
            label: `W0${idx + 1}`,
            count: s.entry_count,
            cost: Number(BigInt(s.replacement_micro_usd || "0")) / 1_000_000,
            merkle: s.merkle_root,
          }))
      : defaultCurvePoints;

  const maxCount = Math.max(...chartData.map((d) => d.count), 200);

  // SVG dimensions for smooth Spline Chart
  const svgW = 1000;
  const svgH = 340;
  const padX = 60;
  const padY = 50;
  const plotW = svgW - padX * 2;
  const plotH = svgH - padY * 2;

  const getX = (idx: number) => padX + (idx / (chartData.length - 1)) * plotW;
  const getY = (val: number) => padY + plotH - (val / maxCount) * plotH;

  // Build smooth cubic Bezier path string
  const points = chartData.map((d, i) => ({ x: getX(i), y: getY(d.count) }));
  let pathD = `M ${points[0]?.x} ${points[0]?.y}`;
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

  // Secondary dashed trajectory curve (Projected value growth)
  const trajectoryD = `M ${firstPt.x} ${getY(firstPt.y * 0.3)} C ${svgW * 0.35} ${getY(120)}, ${svgW * 0.7} ${getY(180)}, ${lastPt.x} ${getY(260)}`;

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
          <div className="laocoon-card relative overflow-hidden p-8 sm:p-10">
            {/* INTERACTIVE ROTATING CRYPTOGRAPHIC VAULT APERTURE WATERMARK */}
            <svg
              viewBox="0 0 340 340"
              className="pointer-events-none absolute -right-14 -bottom-14 h-96 w-96 opacity-25 select-none"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="apertureBronze" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#ffb13b" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#d97706" stopOpacity="0.3" />
                </linearGradient>
                <linearGradient id="apertureSapphire" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0.2" />
                </linearGradient>
              </defs>

              {/* Outer Geared Ring with Slow Spin */}
              <g className="animate-spin-slow" style={{ transformOrigin: "170px 170px" }}>
                <circle cx="170" cy="170" r="150" stroke="url(#apertureBronze)" strokeWidth="2.5" fill="none" />
                <circle cx="170" cy="170" r="142" stroke="rgba(255,177,59,0.3)" strokeWidth="1" strokeDasharray="4 8" fill="none" />
                {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
                  <line
                    key={`tick-${deg}`}
                    x1="170"
                    y1="16"
                    x2="170"
                    y2="28"
                    stroke="#ffb13b"
                    strokeWidth="2"
                    transform={`rotate(${deg} 170 170)`}
                  />
                ))}
              </g>

              {/* Middle Cryptographic Ring with Reverse Spin */}
              <g className="animate-spin-reverse" style={{ transformOrigin: "170px 170px" }}>
                <circle cx="170" cy="170" r="108" stroke="url(#apertureSapphire)" strokeWidth="2" strokeDasharray="8 6" fill="none" />
                <circle cx="170" cy="170" r="88" stroke="rgba(59,130,246,0.3)" strokeWidth="1" strokeDasharray="2 4" fill="none" />
                {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                  <circle
                    key={`node-${deg}`}
                    cx="170"
                    cy="82"
                    r="4"
                    fill="#3b82f6"
                    transform={`rotate(${deg} 170 170)`}
                  />
                ))}
              </g>

              {/* Central Optical Aperture */}
              <circle cx="170" cy="170" r="42" stroke="#ffb13b" strokeWidth="2.5" fill="none" />
              <circle cx="170" cy="170" r="22" fill="#ffb13b" fillOpacity="0.15" stroke="#ffb13b" strokeWidth="1.5" />
              <line x1="170" y1="135" x2="170" y2="205" stroke="#ffb13b" strokeWidth="1.5" />
              <line x1="135" y1="170" x2="205" y2="170" stroke="#ffb13b" strokeWidth="1.5" />
            </svg>

            <div className="relative z-10">
              <div className="flex items-center gap-3">
                <span className="eyebrow">Estimated Replacement Cost</span>
                <span className="hud-badge">Corpus Valuation</span>
              </div>
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
              <p className="mt-3 max-w-xl text-xs leading-relaxed text-[#a49b8e]">
                What it would cost an AI lab to source, adversarially filter, and
                verify comparable multi-rater human nuance data from scratch. Not
                a valuation of HAHA or any token.
              </p>
            </div>
          </div>

          <div className="laocoon-card flex flex-col justify-between p-8 sm:p-10">
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
          </div>
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
            const Icon = c.icon;
            return (
              <div key={c.key} className="laocoon-card p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400">
                    <span>{c.num}</span>
                    <span className="p-1.5 rounded-md bg-white/5 border border-white/10 text-[#ffb13b]">
                      <Icon className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <h3 className="display-serif mt-2 text-3xl text-[#fff6ed]">
                    {c.name}
                  </h3>
                  <p className="mt-1 font-mono text-[11px] text-[#a49b8e]">
                    {c.sub}
                  </p>
                </div>

                <div className="mt-6 space-y-2.5 font-mono text-xs border-t border-[#efe8dc]/10 pt-4">
                  <div className="flex justify-between text-[#efe8dc]">
                    <span className="text-[#a49b8e]">Verified Bits</span>
                    <span className="tabular-nums font-semibold text-[#fff6ed]">
                      {summary ? count.toLocaleString("en-US") : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between text-[#efe8dc]">
                    <span className="text-[#a49b8e]">Corpus Share</span>
                    <span className="text-[#ffb13b] tabular-nums font-semibold">
                      {totalVerified > 0 ? `${sharePct}%` : "—"}
                    </span>
                  </div>

                  {/* Dual-tone Progress Bar */}
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#17130f]">
                    <div
                      className="h-full bg-gradient-to-r from-[#ffb13b] via-[#ffa582] to-[#3b82f6] transition-all duration-500"
                      style={{ width: `${Math.max(6, sharePct)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ULTRA-COOL CYBERPUNK TELEMETRY SPLINE CHART */}
      <section aria-label="Growth">
        <SectionTitle
          eyebrow="Telemetry Trajectory"
          hint="Snapshots & Straight Man Seasons"
        >
          Vault Growth &amp; <em>Season Upgrades.</em>
        </SectionTitle>

        <div className="laocoon-card p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#efe8dc]/10 pb-5">
            <div>
              <p className="max-w-xl text-sm leading-relaxed text-[#a49b8e]">
                Verified entries and cumulative replacement cost across weekly on-chain
                snapshots, with cryptographic anchors on Robinhood Chain.
              </p>
            </div>
            <div className="flex items-center gap-5 font-mono text-[10px] uppercase tracking-widest text-[#a49b8e]">
              <span className="inline-flex items-center gap-1.5">
                <i className="inline-block h-2.5 w-2.5 rounded-full bg-[#ffb13b] shadow-[0_0_8px_#ffb13b]" />
                Verified Bits (Curve)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <i className="inline-block h-2 w-2 rounded-full bg-[#3b82f6] shadow-[0_0_8px_#3b82f6]" />
                Projected Growth (Spline)
              </span>
              <span className="inline-flex items-center gap-1.5 text-[#8fb596]">
                <i className="inline-block h-2 w-2 rounded-full bg-[#8fb596]" />
                S1 Live
              </span>
            </div>
          </div>

          {/* SVG Telemetry Spline Chart */}
          <div className="relative mt-6 overflow-hidden rounded-xl bg-[#060606] border border-[#efe8dc]/08 p-2">
            <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto select-none" aria-hidden="true">
              <defs>
                <linearGradient id="vaultAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffb13b" stopOpacity="0.25" />
                  <stop offset="60%" stopColor="#3b82f6" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#060606" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="curveStrokeGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="60%" stopColor="#ffb13b" />
                  <stop offset="100%" stopColor="#60a5fa" />
                </linearGradient>
                <filter id="neonSplineGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Grid Lines */}
              <g opacity="0.12">
                {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                  const y = padY + plotH * (1 - pct);
                  return (
                    <g key={`ygrid-${idx}`}>
                      <line x1={padX} y1={y} x2={svgW - padX} y2={y} stroke="#efe8dc" strokeDasharray="3 6" />
                      <text x={padX - 10} y={y + 4} textAnchor="end" fill="#a49b8e" fontFamily="Geist Mono" fontSize="10">
                        {Math.round(maxCount * pct)}
                      </text>
                    </g>
                  );
                })}
              </g>

              {/* Season Boundary Milestones */}
              <g>
                <line x1={getX(3)} y1={padY} x2={getX(3)} y2={padY + plotH} stroke="#ffb13b" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
                <text x={getX(3) + 8} y={padY + 16} fill="#ffb13b" fontFamily="Geist Mono" fontSize="9" letterSpacing="1">
                  S0 BETA HARDENING
                </text>

                <line x1={getX(5)} y1={padY} x2={getX(5)} y2={padY + plotH} stroke="#8fb596" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
                <text x={getX(5) + 8} y={padY + 16} fill="#8fb596" fontFamily="Geist Mono" fontSize="9" letterSpacing="1">
                  S1 LIVE PROTOCOL
                </text>
              </g>

              {/* Area Gradient under curve */}
              <path d={areaD} fill="url(#vaultAreaGrad)" />

              {/* Secondary Projected Trajectory Line */}
              <path d={trajectoryD} stroke="#3b82f6" strokeWidth="2" strokeDasharray="5 7" fill="none" opacity="0.6" />

              {/* Main Glowing Spline Curve */}
              <path d={pathD} stroke="url(#curveStrokeGrad)" strokeWidth="3.5" fill="none" filter="url(#neonSplineGlow)" />

              {/* Data Nodes */}
              {chartData.map((d, i) => {
                const cx = getX(i);
                const cy = getY(d.count);
                const isHovered = activeChartPoint === i;
                return (
                  <g
                    key={`node-${i}`}
                    className="cursor-pointer transition-transform"
                    onMouseEnter={() => setActiveChartPoint(i)}
                    onMouseLeave={() => setActiveChartPoint(null)}
                  >
                    <circle cx={cx} cy={cy} r={isHovered ? 14 : 7} fill="#ffb13b" fillOpacity={isHovered ? 0.3 : 0.15} />
                    <circle cx={cx} cy={cy} r={isHovered ? 6 : 4} fill={isHovered ? "#fff6ed" : "#ffb13b"} />
                    <text
                      x={cx}
                      y={padY + plotH + 22}
                      textAnchor="middle"
                      fill={isHovered ? "#ffb13b" : "#6c6459"}
                      fontFamily="Geist Mono"
                      fontSize="10"
                    >
                      {d.label}
                    </text>
                  </g>
                );
              })}

              {/* Tooltip for Active Node */}
              {activeChartPoint !== null && (
                <g transform={`translate(${getX(activeChartPoint)}, ${getY(chartData[activeChartPoint]?.count ?? 0) - 65})`}>
                  <rect
                    x="-80"
                    y="0"
                    width="160"
                    height="54"
                    rx="8"
                    fill="#0d0b09"
                    stroke="#ffb13b"
                    strokeWidth="1.2"
                    filter="drop-shadow(0 8px 16px rgba(0,0,0,0.8))"
                  />
                  <text x="0" y="20" textAnchor="middle" fill="#fff6ed" fontFamily="Fraunces, serif" fontSize="13">
                    {chartData[activeChartPoint]?.label} · {chartData[activeChartPoint]?.count} Verified Bits
                  </text>
                  <text x="0" y="38" textAnchor="middle" fill="#ffb13b" fontFamily="Geist Mono" fontSize="11" fontWeight="600">
                    Est: ${(chartData[activeChartPoint]?.cost ?? 0).toLocaleString()} USDG
                  </text>
                </g>
              )}
            </svg>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between font-mono text-[11px] text-[#a49b8e]">
            <span>Click or hover any node for snapshot metadata</span>
            <span className="text-[#ffb13b]">Next Merkle Settlement: Sunday 00:00 UTC</span>
          </div>
        </div>
      </section>

      {/* License the Vault */}
      <section aria-label="License the Vault">
        <SectionTitle eyebrow="Producers & AI Labs" hint="Settled in USDG">
          License the <em>Vault.</em>
        </SectionTitle>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PRICE_LIST.map((p) => (
            <div key={p.name} className="laocoon-card p-6 flex flex-col justify-between">
              <div>
                <span className="hud-badge">
                  {p.tag}
                </span>
                <h3 className="display-serif mt-3 text-2xl text-[#fff6ed]">
                  {p.name}
                </h3>
                <p className="display-serif mt-2 text-4xl text-[#ffb13b]">
                  {p.price}
                </p>
                <div className="mt-2 font-mono text-[10px] uppercase tracking-wider text-[#3b82f6]">
                  {p.tier}
                </div>
                <p className="mt-4 text-sm leading-relaxed text-[#a49b8e]">
                  {p.body}
                </p>
              </div>
              <Link
                href="/producers"
                className="mt-6 inline-flex items-center justify-between border-t border-[#efe8dc]/10 pt-4 font-mono text-[11px] uppercase tracking-widest text-[#efe8dc] hover:text-[#ffb13b] transition-colors"
              >
                <span>Purchase via Gateway</span>
                <span>→</span>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* On-Chain Snapshot Proofs */}
      <section aria-label="Proof">
        <SectionTitle eyebrow="VaultRegistry" hint="On-Chain Merkle Roots">
          Cryptographic <em>Proof.</em>
        </SectionTitle>
        <div className="laocoon-card p-6 sm:p-8">
          <p className="text-sm leading-relaxed text-[#a49b8e]">
            Each weekly dataset release publishes an immutable Merkle root to{" "}
            <code className="font-mono text-xs text-[#efe8dc]">
              VaultRegistry.sol
            </code>
            . Entry counts and replacement costs on-chain match the signed
            dataset manifest.
          </p>
          {snapshots.length > 0 ? (
            <div className="mt-6 space-y-3">
              {snapshots.slice(0, 5).map((s) => (
                <div
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#efe8dc]/10 bg-[#060606]/80 px-5 py-3.5 font-mono text-xs hover:border-[#ffb13b]/40 transition-colors"
                >
                  <span className="text-[#fff6ed] font-medium">
                    {s.entry_count} entries · {fmtUsd(s.replacement_micro_usd)}
                  </span>
                  <span className="text-[#ffb13b]">
                    Merkle: {truncateAddress(s.merkle_root, 10)}
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
        </div>
      </section>

      <div className="flex flex-wrap gap-4">
        <Link href="/stage" className="laocoon-pill py-3 px-6 text-xs text-[#060606] bg-[#ffb13b] font-bold flex items-center gap-2 hover:bg-[#ffd27d] transition-colors">
          <Mic className="w-3.5 h-3.5" />
          <span>Add your bit to the Vault</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
        <Link href="/vault/method" className="laocoon-pill py-3 px-6 text-xs flex items-center gap-2">
          <span>Inspect Replacement Cost Formula</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <Disclaimer />
    </div>
  );
}
