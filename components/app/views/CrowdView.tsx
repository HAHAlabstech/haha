"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, Disclaimer, SectionTitle } from "@/components/ui";
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
  { name: "Walk-in", votes: "15 votes / day", weight: "1.00×" },
  { name: "Regular", votes: "30 votes / day", weight: "1.15×" },
  {
    name: "Front Row",
    votes: "50 votes / day",
    weight: "1.30×",
  },
  {
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
  extra_bit_stake_wei?: string;
  stake_verified?: boolean;
  juror_access_mode?: string;
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
  const [queueState, setQueueState] = useState<
    "idle" | "loading" | "ready" | "empty" | "error" | "locked" | "auth"
  >("idle");
  const [queueError, setQueueError] = useState<string | null>(null);
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
    setQueueError(null);
    setQueueState("loading");
    try {
      const scRes = await fetch(
        `/api/crowd/stake-check?wallet=${encodeURIComponent(wallet)}`,
        { cache: "no-store" },
      );
      let standing: StakeCheckInfo | null = null;
      if (scRes.ok) {
        standing = (await scRes.json()) as StakeCheckInfo;
        setStakeInfo(standing);
      } else {
        setStakeInfo(null);
        setAssignment(null);
        setQueueError("Could not verify your juror standing.");
        setQueueState("error");
        return;
      }

      // Never draw a ballot for an uncalibrated or unrecognized juror.
      if (standing.onboarding_passed !== true) {
        setAssignment(null);
        setQueueState("locked");
        return;
      }

      const nextRes = await fetch(
        `/api/crowd/next?wallet=${encodeURIComponent(wallet)}`,
        { cache: "no-store", headers: authHeaders() },
      );
      if (nextRes.status === 401) {
        setAssignment(null);
        setQueueState("auth");
        return;
      }
      if (nextRes.status === 403) {
        setAssignment(null);
        setQueueState("locked");
        return;
      }
      if (nextRes.status === 404) {
        setAssignment(null);
        setQueueState("empty");
        return;
      }
      if (!nextRes.ok) {
        const data = (await nextRes.json().catch(() => ({}))) as {
          error?: string;
        };
        setAssignment(null);
        setQueueError(
          nextRes.status >= 500
            ? "We could not load the jury queue. This is not an empty queue."
            : (data.error ?? `Jury queue unavailable (${nextRes.status}).`),
        );
        setQueueState("error");
        return;
      }
      const a = (await nextRes.json()) as AssignmentPayload;
      setAssignment(a);
      setSelectedVote(null);
      setSelectedFair(null);
      setQueueState("ready");
    } catch (e) {
      setAssignment(null);
      setQueueError(
        e instanceof Error ? e.message : "Jury queue unavailable.",
      );
      setQueueState("error");
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

  async function signInForQueue() {
    setError(null);
    const st = getSharedWalletState();
    if (!st.provider || !st.account) {
      setModalOpen(true);
      return;
    }
    setQueueState("loading");
    try {
      const siwe = await ensureSiweSession(st.provider, st.account);
      if (!siwe.ok) {
        setQueueError(siwe.error ?? "Sign-in failed. Try again.");
        setQueueState("error");
        return;
      }
      await loadQueue(st.account);
    } catch (e) {
      setQueueError(e instanceof Error ? e.message : "Sign-in failed.");
      setQueueState("error");
    }
  }

  return (
    <div className="mx-auto max-w-[1440px] px-[clamp(20px,4vw,56px)] py-8 space-y-12">
      {/* Editorial Header */}
      <div className="grid gap-8 border-b border-white/10 pb-8 lg:grid-cols-[1.3fr_1fr] lg:items-end">
        <div>
          <span className="eyebrow">The Crowd · Blind Human Quorum</span>
          <h1 className="display-serif mt-2 text-4xl text-white md:text-5xl">
            You be the <em>judge.</em>
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
            Bits where the comedian says the Straight Man missed go to a blind
            human jury. You see two answers (A and B) with randomized labels.
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
            <dd className="uppercase">
              {account ? (stakeInfo?.crowd_tier ?? "checking…") : "-"}
            </dd>
          </div>
          <div>
            <dt>Access</dt>
            <dd>
              {account && stakeInfo ? "Wallet + calibration" : "-"}
            </dd>
          </div>
          <div>
            <dt>Calibration</dt>
            <dd>
              {!account ? (
                <span className="font-mono text-xs text-zinc-400">-</span>
              ) : stakeInfo?.onboarding_passed ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-0.5 font-mono text-xs font-semibold text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  Passed (8+/10)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/10 px-2.5 py-0.5 font-mono text-xs text-rose-300">
                  <XCircle className="h-3.5 w-3.5 text-rose-400" />
                  Not passed
                </span>
              )}
            </dd>
          </div>
        </dl>
      </div>

      {/* Guided User Journey Stepper */}
      <section aria-label="Juror flow roadmap">
        <div className="haha-glass-panel rounded-2xl p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-3.5 mb-4">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#ffc53d] font-semibold">
              Jury Duty Lifecycle · 4 Steps
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-400">
              {!account
                ? "Status: Connect Wallet"
                : !stakeInfo?.onboarding_passed
                  ? "Status: Pass Juror Calibration Quiz"
                  : assignment
                    ? "Status: Cast Blind Consensus Vote"
                    : "Status: Waiting for Next Ballot"}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div
              className={`rounded-xl border p-3.5 transition-all ${
                !account
                  ? "border-[#ffc53d]/45 bg-[#ffc53d]/[0.07]"
                  : "border-emerald-500/30 bg-emerald-950/15"
              }`}
            >
              <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest">
                <span className="text-zinc-400">Step 1</span>
                <span className={account ? "text-emerald-400 font-semibold" : "text-zinc-500"}>
                  {account ? "Connected ✓" : "Required"}
                </span>
              </div>
              <p className="mt-1 font-serif text-base text-white">Connect &amp; Sign In</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-400">
                Robinhood Chain wallet session. Confirm the network before signing.
              </p>
            </div>

            <Link
              href="/crowd/join"
              className={`rounded-xl border p-3.5 transition-all hover:border-[#ffc53d]/40 ${
                account && !stakeInfo?.onboarding_passed
                  ? "border-[#ffc53d]/45 bg-[#ffc53d]/[0.07]"
                  : stakeInfo?.onboarding_passed
                    ? "border-emerald-500/30 bg-emerald-950/15"
                    : "border-white/10 bg-[#070709]/60"
              }`}
            >
              <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest">
                <span className="text-zinc-400">Step 2</span>
                <span
                  className={
                    stakeInfo?.onboarding_passed
                      ? "text-emerald-400 font-semibold"
                      : "text-[#ffc53d]"
                  }
                >
                  {stakeInfo?.onboarding_passed ? "Passed ✓" : "Quiz (8/10) →"}
                </span>
              </div>
              <p className="mt-1 font-serif text-base text-white">Calibrate Juror</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-400">
                Pass 10 cases to earn juror standing.
              </p>
            </Link>

            <div
              className={`rounded-xl border p-3.5 transition-all ${
                assignment
                  ? "border-[#ffc53d]/45 bg-[#ffc53d]/[0.07]"
                  : "border-white/10 bg-[#070709]/60"
              }`}
            >
              <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest">
                <span className="text-zinc-400">Step 3</span>
                <span className={assignment ? "text-[#ffc53d] font-semibold" : "text-zinc-500"}>
                  {assignment ? "Ballot Drawn" : "Queue Watch"}
                </span>
              </div>
              <p className="mt-1 font-serif text-base text-white">Cast Blind Vote</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-400">
                Pick A or B; call fairness objectively.
              </p>
            </div>

            <Link
              href="/app?tab=tipjar"
              className="rounded-xl border border-white/10 bg-[#070709]/60 p-3.5 transition-all hover:border-[#ffc53d]/40"
            >
              <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest">
                <span className="text-zinc-400">Step 4</span>
                <span className="text-zinc-300">Tip Jar →</span>
              </div>
              <p className="mt-1 font-serif text-base text-white">Earn USDG Share</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-400">
                May share funded USDG rewards after settlement; payouts are not guaranteed.
              </p>
            </Link>
          </div>
        </div>
      </section>

      {account && stakeInfo && !stakeInfo.onboarding_passed ? (
        <section aria-label="Calibration required">
          <Card hot>
            <div className="flex flex-wrap items-center justify-between gap-5 py-1">
              <div className="max-w-2xl">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#ffc53d]">
                  Juror access · Calibration required
                </p>
                <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                  Pass the 10-case blind quiz (8/10 required, ~5 minutes, retakes
                  allowed) to unlock juror ballots. A reward share is possible
                  only when verified USDG funding and an active settlement root
                  exist. Juror access does not require a HAHA balance.
                </p>
              </div>
              <Link
                href="/crowd/join"
                className="pill-btn hot"
                style={{ padding: "13px 26px", fontSize: "12px" }}
              >
                <span>Start Calibration Quiz →</span>
              </Link>
            </div>
          </Card>
        </section>
      ) : null}

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
          ) : loading || queueState === "idle" ? (
            <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#070709]/80 p-8 text-center backdrop-blur-md">
              {/* Radar pulse and spinning reticle */}
              <div className="relative mx-auto mb-4 flex h-20 w-20 items-center justify-center">
                <div className="absolute inset-0 rounded-full border border-[#ffc53d]/30 animate-hahaRadar" />
                <div className="absolute inset-2 rounded-full border border-dashed border-[#ffc53d]/40 animate-hahaSpinSlow" />
                <div className="absolute inset-4 rounded-full bg-radial from-[#ffc53d]/15 to-transparent" />
                <Users className="relative z-10 h-7 w-7 text-[#ffc53d]" />
              </div>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#ffc53d] font-semibold">
                Scanning Blind Juror Queue…
              </p>
              <p className="mt-1.5 text-xs text-zinc-400">
                Listening for unreviewed comedian vs. Straight Man bits requiring human consensus quorum.
              </p>
              <div className="mt-4 mx-auto max-w-xs h-0.5 bg-white/10 overflow-hidden rounded-full">
                <div className="h-full w-1/3 bg-gradient-to-r from-[#ffc53d] to-amber-200 animate-hahaProgress" />
              </div>
            </div>
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
                <p className="display-serif text-2xl leading-snug text-white md:text-3xl">
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
                        ? "border-[#ffc53d] bg-[#ffc53d]/12 text-white"
                        : "border-white/10 bg-[#070709] text-zinc-300 hover:border-white/30"
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
                  Is this a fair bit?
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
                      <span>{f === "fair" ? "Fair Bit" : "Unfair / Cheap Trick"}</span>
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
          ) : queueState === "error" ? (
            <div className="space-y-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-rose-300">
                Jury queue unavailable
              </p>
              <p className="text-base text-zinc-300">
                {queueError ??
                  "We could not load the jury queue. This is not an empty queue."}
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => void loadQueue(account)}
                  className="pill-btn hot cursor-pointer"
                >
                  <span>Retry Queue →</span>
                </button>
                <Link href="/crowd/join" className="pill-btn">
                  <span>Review Calibration</span>
                </Link>
              </div>
            </div>
          ) : queueState === "auth" ? (
            <div className="space-y-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#ffc53d]">
                Sign in to load ballots
              </p>
              <p className="text-base text-zinc-300">
                Your wallet is connected, but the signed session that protects
                blind ballots is missing or expired. Sign in again without
                losing your calibration.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => void signInForQueue()}
                  className="pill-btn hot cursor-pointer"
                >
                  <span>Sign In with Wallet →</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="pill-btn cursor-pointer"
                >
                  <span>Reconnect Wallet</span>
                </button>
              </div>
            </div>
          ) : queueState === "locked" ? (
            <div className="space-y-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#ffc53d]">
                Calibration required
              </p>
              <p className="text-base text-zinc-300">
                Pass the 10-case calibration quiz and save it to this wallet
                before drawing blind ballots.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Link href="/crowd/join" className="pill-btn hot">
                  <span>Start Calibration Quiz →</span>
                </Link>
                <button
                  type="button"
                  onClick={() => void loadQueue(account)}
                  className="pill-btn cursor-pointer"
                >
                  <span>↻ Check Again</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-base text-zinc-300">
                {stakeInfo?.onboarding_passed
                  ? "You're all set: no cases waiting right now. Fresh blind ballots land as comedians submit; check back in a few minutes."
                  : "Complete the calibration quiz above to unlock juror ballots."}
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                {stakeInfo?.onboarding_passed === true ? (
                  <Link href="/crowd/join" className="pill-btn cursor-pointer">
                    <span>Review Calibration Quiz →</span>
                  </Link>
                ) : (
                  <Link href="/crowd/join" className="pill-btn hot">
                    <span>Start Calibration Quiz →</span>
                  </Link>
                )}
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
            <p className="mt-4 font-mono text-xs text-[#ffc53d]" role="status">
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
                {t.votes}
              </span>
              <h3 className="display-serif mt-2 text-2xl text-white">
                {t.name}
              </h3>
              <p className="mt-2 font-mono text-base text-[#ffc53d]">
                {t.weight}
              </p>
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
