"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, Disclaimer, SectionTitle, Stamp } from "@/components/ui";
import WalletModal from "@/components/WalletModal";
import { CheckCircle2, XCircle, ArrowUpRight, Users, ShieldCheck } from "lucide-react";
import {
  authHeaders,
  ensureSiweSession,
  getSharedWalletState,
  subscribeWalletState,
  truncateAddress,
} from "@/lib/wallets";

const TIERS = [
  { num: "TIER 01", name: "Walk-in", votes: "15 votes / day", weight: "1.00×" },
  { num: "TIER 02", name: "Regular", votes: "30 votes / day", weight: "1.15×" },
  {
    num: "TIER 03",
    name: "Front Row",
    votes: "50 votes / day",
    weight: "1.30×",
  },
  {
    num: "TIER 04",
    name: "Critic",
    votes: "80 votes / day",
    weight: "1.50× max",
  },
];

interface AssignmentPayload {
  assignmentId: string;
  bitId: string;
  category: string;
  scenario: string;
  question: string;
  isRetrial: boolean;
  round: number;
  options: { A: string; B: string };
  expiresAt: string;
}

interface StakeCheckInfo {
  mode: string;
  stake_wei?: string;
  staked_enough?: boolean;
  crowd_tier?: string;
  onboarding_passed?: boolean;
}

type VoteOpt = "A" | "B" | "both_right" | "both_wrong";
type FairOpt = "fair" | "unfair";

export default function CrowdView() {
  const [account, setAccount] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [stakeInfo, setStakeInfo] = useState<StakeCheckInfo | null>(null);
  const [assignment, setAssignment] = useState<AssignmentPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedVote, setSelectedVote] = useState<VoteOpt | null>(null);
  const [selectedFair, setSelectedFair] = useState<FairOpt | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const st = getSharedWalletState();
    if (st.account) setAccount(st.account);
    return subscribeWalletState((next) => setAccount(next.account));
  }, []);

  const loadQueue = useCallback(async (wallet: string) => {
    setLoading(true);
    setError(null);
    try {
      const [scRes, nextRes] = await Promise.all([
        fetch(`/api/crowd/stake-check?wallet=${encodeURIComponent(wallet)}`),
        fetch(`/api/crowd/next?wallet=${encodeURIComponent(wallet)}`),
      ]);
      if (scRes.ok) {
        setStakeInfo((await scRes.json()) as StakeCheckInfo);
      }
      if (nextRes.ok) {
        const a = (await nextRes.json()) as AssignmentPayload;
        setAssignment(a);
        setSelectedVote(null);
        setSelectedFair(null);
      } else {
        setAssignment(null);
      }
    } catch {
      setAssignment(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (account) void loadQueue(account);
  }, [account, loadQueue]);

  async function submitVote() {
    if (!assignment || !selectedVote || !selectedFair || submitting) return;
    setError(null);
    setStatusMsg(null);
    const st = getSharedWalletState();
    if (!st.account) {
      setModalOpen(true);
      return;
    }
    setSubmitting(true);
    try {
      const siwe = await ensureSiweSession(st.provider, st.account);
      if (!siwe.ok) {
        setError(siwe.error ?? "Sign-in required to vote.");
        return;
      }
      const res = await fetch(
        `/api/crowd/${encodeURIComponent(assignment.assignmentId)}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...authHeaders(siwe.sessionToken),
          },
          body: JSON.stringify({
            wallet: siwe.wallet ?? st.account,
            vote: selectedVote,
            fairness: selectedFair,
          }),
        },
      );
      const data = (await res.json().catch(() => ({}))) as {
        status?: string;
        outcome?: string;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? `Vote failed (${res.status})`);
        return;
      }
      setStatusMsg(
        data.outcome
          ? `Vote recorded! Bit settled as ${data.outcome.toUpperCase()}.`
          : "Vote recorded! Loading next case…",
      );
      await loadQueue(st.account);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Vote failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1440px] px-[clamp(16px,3vw,36px)] py-8 space-y-12">
      {/* Editorial Header */}
      <div className="grid gap-8 border-b border-white/10 pb-8 lg:grid-cols-[1.3fr_1fr] lg:items-end">
        <div>
          <span className="eyebrow">The Crowd · Blind Human Quorum</span>
          <h1 className="display-serif mt-2 text-4xl text-[#f4f4f5] md:text-5xl">
            You be the <em>judge.</em>
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
            Bits where the comedian says the Straight Man missed go to a blind
            human jury. You see two answers — A and B — with randomized labels.
            Pick the one that gets the joke, and call whether the bit is fair.
          </p>
        </div>

        <dl className="case-meta-grid">
          <div>
            <dt>Juror Wallet</dt>
            <dd className="font-mono text-xs text-[#ffc53d]">
              {account ? truncateAddress(account) : "Not connected"}
            </dd>
          </div>
          <div>
            <dt>Crowd Tier</dt>
            <dd className="uppercase">{stakeInfo?.crowd_tier ?? "walk_in"}</dd>
          </div>
          <div>
            <dt>Gate Mode</dt>
            <dd className="uppercase">{stakeInfo?.mode ?? "allowlist"}</dd>
          </div>
          <div>
            <dt>Calibration</dt>
            <dd>
              {stakeInfo?.onboarding_passed ? (
                <span className="text-emerald-400 flex items-center gap-1 font-mono text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Passed (8+/10)</span>
                </span>
              ) : (
                <Link
                  href="/crowd/join"
                  className="font-mono text-xs text-[#ffc53d] underline"
                >
                  Take Quiz →
                </Link>
              )}
            </dd>
          </div>
        </dl>
      </div>

      {/* Active Case */}
      <section aria-label="Current assignment">
        <SectionTitle
          eyebrow="Blind A/B Ballot"
          hint={
            account
              ? `Juror ${truncateAddress(account)}`
              : "Connect wallet to receive assignments"
          }
        >
          Your next <em>case.</em>
        </SectionTitle>
        <Card hot={Boolean(assignment)}>
          {!account ? (
            <div className="py-4">
              <p className="text-base text-zinc-300">
                Connect your wallet to verify your juror standing and draw
                blind A/B cases from the queue.
              </p>
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="pill-btn hot mt-5 cursor-pointer"
              >
                <span>Connect Wallet →</span>
              </button>
            </div>
          ) : loading ? (
            <p className="font-mono text-xs uppercase tracking-widest text-zinc-400">
              Scanning blind juror queue…
            </p>
          ) : assignment ? (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-4 font-mono text-xs uppercase tracking-widest text-zinc-400">
                <span className="text-[#ffc53d]">
                  Set: {assignment.category} · Round {assignment.round}
                </span>
                <span>
                  Expires {new Date(assignment.expiresAt).toLocaleTimeString()}
                </span>
              </div>

              <div>
                <p className="display-serif text-2xl leading-snug text-[#fff6ed] md:text-3xl">
                  “{assignment.scenario}”
                </p>
                <p className="mt-3 font-mono text-xs uppercase tracking-widest text-[#ffc53d]">
                  Question: {assignment.question}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {(["A", "B"] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setSelectedVote(opt)}
                    aria-pressed={selectedVote === opt}
                    className={`rounded-2xl border p-5 text-left transition cursor-pointer ${
                      selectedVote === opt
                        ? "border-[#ffc53d] bg-[#ffc53d]/12 text-[#fff6ed]"
                        : "border-white/10 bg-[#0c0a08] text-zinc-300 hover:border-white/30"
                    }`}
                  >
                    <div className="font-mono text-xs uppercase tracking-widest text-[#ffc53d]">
                      Option {opt}
                    </div>
                    <p className="mt-2 text-sm leading-relaxed">
                      {assignment.options[opt]}
                    </p>
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-2.5">
                {(
                  [
                    { id: "both_right", label: "Both Right (Sides with AI)" },
                    { id: "both_wrong", label: "Both Wrong" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedVote(opt.id)}
                    aria-pressed={selectedVote === opt.id}
                    className={`pill-btn cursor-pointer ${
                      selectedVote === opt.id ? "hot" : ""
                    }`}
                  >
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>

              <div className="border-t border-white/10 pt-5">
                <p className="font-mono text-xs uppercase tracking-widest text-zinc-400">
                  Step 02 · Is this a fair bit?
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {(["fair", "unfair"] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setSelectedFair(f)}
                      aria-pressed={selectedFair === f}
                      className={`pill-btn cursor-pointer ${selectedFair === f ? "hot" : ""}`}
                    >
                      <span className="flex items-center gap-1.5">
                        {f === "fair" ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Fair Bit</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Unfair / Cheap Trick</span>
                          </>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                disabled={!selectedVote || !selectedFair || submitting}
                onClick={() => void submitVote()}
                className="pill-btn hot disabled:opacity-40 cursor-pointer"
                style={{ padding: "13px 26px", fontSize: "12px" }}
              >
                <span>
                  {submitting ? "Submitting ballot…" : "Lock Blind Ballot →"}
                </span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-base text-zinc-300">
                No live assignment waiting in your queue right now. To receive
                blind ballots, make sure you have completed all three steps:
              </p>
              <ol className="list-decimal space-y-1.5 pl-5 text-sm text-zinc-400">
                <li>Sign in with your wallet via SIWE.</li>
                <li>
                  Hold the minimum <code className="text-[#efe8dc]">$HAHA</code>{" "}
                  stake in <code className="text-[#efe8dc]">CrowdStaking</code>{" "}
                  (or allowlist during beta).
                </li>
                <li>
                  Pass the 10-case calibration quiz (8/10 required){" "}
                  {stakeInfo?.onboarding_passed ? (
                    <Stamp tone="green">Passed</Stamp>
                  ) : null}
                </li>
              </ol>
              <div className="flex flex-wrap gap-3 pt-2">
                <Link href="/crowd/join" className="pill-btn hot">
                  <span>
                    {stakeInfo?.onboarding_passed
                      ? "Review Calibration Quiz →"
                      : "Start Calibration Quiz (8/10) →"}
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => void loadQueue(account)}
                  className="pill-btn cursor-pointer"
                >
                  <span>↻ Refresh Queue</span>
                </button>
              </div>
            </div>
          )}

          {statusMsg ? (
            <p className="mt-4 font-mono text-xs text-emerald-400" role="status">
              {statusMsg}
            </p>
          ) : null}
          {error ? (
            <p className="mt-4 font-mono text-xs text-rose-400" role="alert">
              {error}
            </p>
          ) : null}
        </Card>
      </section>

      {/* Jury Tiers */}
      <section aria-label="Jury tiers">
        <SectionTitle
          eyebrow="Reputation & Weight"
          hint="Vote weight capped at 1.50×"
        >
          Crowd Jury <em>Tiers.</em>
        </SectionTitle>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {TIERS.map((t) => (
            <Card key={t.name}>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400">
                {t.num}
              </span>
              <h3 className="display-serif mt-2 text-2xl text-[#fff6ed]">
                {t.name}
              </h3>
              <p className="mt-2 font-mono text-base text-[#ffc53d]">
                {t.weight}
              </p>
              <p className="mt-1 font-mono text-xs text-zinc-400">{t.votes}</p>
            </Card>
          ))}
        </div>
      </section>

      <WalletModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConnected={(accs) => setAccount(accs[0] ?? null)}
      />
      <Disclaimer />
    </div>
  );
}
