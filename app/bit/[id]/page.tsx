"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Disclaimer } from "@/components/ui";
import WalletModal from "@/components/WalletModal";
import { ArrowUpRight } from "lucide-react";
import {
  authHeaders,
  ensureSiweSession,
  getSharedWalletState,
  subscribeWalletState,
} from "@/lib/wallets";

interface BitPayload {
  id: string;
  category: string;
  stage: string;
  scenario: string;
  question: string;
  status: string;
  reject_reason?: string | null;
  retrial_round: number;
  created_at: string;
  user?: { wallet: string; handle: string; comedian_tier: string };
  ai_answer?: {
    answer: string;
    reasoning: string;
    confidence: number;
    model_version: string;
    latency_ms: number;
  } | null;
  comedian_reveal?: {
    answer: string;
    explanation: string;
  } | null;
  outcome?: {
    result: string;
    comedian_votes: number;
    ai_votes: number;
    juror_count: number;
    fair_ratio: number;
    win_strength: number;
    decided_at: string;
  } | null;
  crowd?: {
    assigned: number;
    voted: number;
    round: number;
  };
  share_card_url?: string | null;
}

const STAGES = [
  "Waiting for Straight Man",
  "Straight Man answered",
  "Blind Crowd Quorum",
  "Final Verdict Settled",
];

function stageIndexForStatus(status?: string): number {
  switch (status) {
    case "answered":
      return 1;
    case "in_crowd":
    case "disputed":
      return 2;
    case "killed_it":
    case "bombed":
    case "heckled_off":
      return 3;
    default:
      return 0;
  }
}

function formatStatusLabel(status?: string): string {
  if (!status) return "Screening";
  return status.replace(/_/g, " ");
}

export default function BitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [bit, setBit] = useState<BitPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setAccount] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [missedMode, setMissedMode] = useState(false);
  const [revealAnswer, setRevealAnswer] = useState("");
  const [revealExplanation, setRevealExplanation] = useState("");
  const [submittingVerdict, setSubmittingVerdict] = useState(false);

  const [appealReason, setAppealReason] = useState("");
  const [submittingAppeal, setSubmittingAppeal] = useState(false);
  const [appealStatus, setAppealStatus] = useState<string | null>(null);

  const [reportReason, setReportReason] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportStatus, setReportStatus] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [cardCopied, setCardCopied] = useState(false);

  useEffect(() => {
    const st = getSharedWalletState();
    if (st.account) setAccount(st.account);
    return subscribeWalletState((next) => setAccount(next.account));
  }, []);

  const loadBit = useCallback(async () => {
    try {
      const res = await fetch(`/api/bits/${encodeURIComponent(id)}`);
      if (!res.ok) return;
      const data = (await res.json()) as BitPayload;
      setBit(data);
    } catch {
      // ignore transient errors
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadBit();
    const timer = window.setInterval(() => {
      if (
        !bit ||
        bit.status === "screening" ||
        bit.status === "in_crowd" ||
        bit.status === "disputed"
      ) {
        void loadBit();
      }
    }, 4000);
    return () => window.clearInterval(timer);
  }, [loadBit, bit]);

  async function submitVerdict(verdict: "got_it" | "missed_it") {
    setError(null);
    const st = getSharedWalletState();
    if (!st.account) {
      setModalOpen(true);
      return;
    }
    setSubmittingVerdict(true);
    try {
      const siwe = await ensureSiweSession(st.provider, st.account);
      if (!siwe.ok) {
        setError(siwe.error ?? "Sign-in required.");
        return;
      }
      const res = await fetch(`/api/bits/${encodeURIComponent(id)}/verdict`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...authHeaders(siwe.sessionToken),
        },
        body: JSON.stringify({
          wallet: siwe.wallet ?? st.account,
          verdict,
          answer: verdict === "missed_it" ? revealAnswer.trim() : undefined,
          explanation:
            verdict === "missed_it" ? revealExplanation.trim() : undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? `Failed to submit verdict (${res.status})`);
        return;
      }
      setMissedMode(false);
      await loadBit();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit verdict.");
    } finally {
      setSubmittingVerdict(false);
    }
  }

  async function submitAppeal() {
    if (!appealReason.trim()) return;
    setError(null);
    setAppealStatus(null);
    const st = getSharedWalletState();
    if (!st.account) {
      setModalOpen(true);
      return;
    }
    setSubmittingAppeal(true);
    try {
      const siwe = await ensureSiweSession(st.provider, st.account);
      if (!siwe.ok) {
        setError(siwe.error ?? "Sign-in required.");
        return;
      }
      const res = await fetch(`/api/bits/${encodeURIComponent(id)}/appeal`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...authHeaders(siwe.sessionToken),
        },
        body: JSON.stringify({
          wallet: siwe.wallet ?? st.account,
          reason: appealReason.trim(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? `Appeal failed (${res.status})`);
        return;
      }
      setAppealStatus("Appeal submitted — Round 2 Crowd retrial queued.");
      setAppealReason("");
      await loadBit();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Appeal failed.");
    } finally {
      setSubmittingAppeal(false);
    }
  }

  async function submitReport() {
    if (!reportReason.trim()) return;
    setError(null);
    setReportStatus(null);
    const st = getSharedWalletState();
    if (!st.account) {
      setModalOpen(true);
      return;
    }
    setSubmittingReport(true);
    try {
      const siwe = await ensureSiweSession(st.provider, st.account);
      if (!siwe.ok) {
        setError(siwe.error ?? "Sign-in required.");
        return;
      }
      const res = await fetch(`/api/bits/${encodeURIComponent(id)}/report`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...authHeaders(siwe.sessionToken),
        },
        body: JSON.stringify({
          wallet: siwe.wallet ?? st.account,
          reason: reportReason.trim(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? `Report failed (${res.status})`);
        return;
      }
      setReportStatus("Report logged for review.");
      setReportReason("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Report failed.");
    } finally {
      setSubmittingReport(false);
    }
  }

  const currentStage = stageIndexForStatus(bit?.status);
  const canVerdict = bit?.status === "answered";
  const votedCount = bit?.crowd?.voted ?? bit?.outcome?.juror_count ?? 0;
  const assignedCount = Math.max(5, bit?.crowd?.assigned ?? 5);
  const progressPct = Math.min(
    100,
    Math.round((votedCount / assignedCount) * 100),
  );
  const confPct = bit?.ai_answer
    ? Math.round((bit.ai_answer.confidence ?? 0.96) * 100)
    : 97;

  return (
    <div className="relative min-h-screen bg-[#070709] text-white selection:bg-[#ffc53d]/30 selection:text-[#ffc53d] overflow-x-clip">
      <div
        aria-hidden
        className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[550px] bg-radial from-[#ffc53d]/05 via-transparent to-transparent blur-[160px] rounded-full z-0"
      />

      <div className="relative z-10 mx-auto max-w-[1440px] px-[clamp(20px,4vw,56px)] pt-28 pb-16 space-y-12">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-6 border-b border-white/10 pb-8">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#ffc53d] font-semibold">
              Bit Dossier · {(bit?.category ?? "stage").replace(/_/g, " ")} ·{" "}
              {bit?.stage === "pro" ? "Pro Stage (2.5×)" : "Open Mic (1.0×)"}
            </p>
            <h1 className="display-serif mt-3 text-4xl text-white md:text-6xl tracking-tight">
              Case <em className="italic text-[#ffc53d]">#{id.slice(0, 10)}</em>
            </h1>
            {bit?.user ? (
              <p className="mt-3 font-mono text-xs uppercase tracking-[0.16em] text-zinc-400">
                Submitted by{" "}
                <Link
                  href={`/u/${encodeURIComponent(bit.user.handle)}`}
                  className="text-white hover:text-[#ffc53d] underline transition-colors"
                >
                  @{bit.user.handle}
                </Link>
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {bit?.share_card_url ? (
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(
                    bit.share_card_url ?? window.location.href,
                  );
                  setCardCopied(true);
                  window.setTimeout(() => setCardCopied(false), 1800);
                }}
                className="px-4 py-2 rounded-full border border-white/15 bg-white/[0.03] font-mono text-[11px] uppercase tracking-[0.16em] text-zinc-300 hover:border-[#ffc53d]/50 hover:text-[#ffc53d] transition-colors cursor-pointer"
              >
                {cardCopied ? "Copied ✓" : "Copy Card Link"}
              </button>
            ) : null}
            <span className="px-4 py-2 rounded-full border border-[#ffc53d]/35 bg-[#ffc53d]/10 font-mono text-[11px] uppercase tracking-[0.16em] text-[#ffc53d]">
              {loading ? "Loading…" : formatStatusLabel(bit?.status)}
            </span>
          </div>
        </div>

        {!loading && (bit?.retrial_round ?? 0) >= 2 ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#ffc53d]/30 bg-[#ffc53d]/[0.05] px-5 py-3.5 font-mono text-xs">
            <span className="uppercase tracking-[0.16em] text-[#ffc53d]">
              Round 2 · Crowd Retrial
            </span>
            <span className="text-zinc-400">
              Fresh jurors re-evaluated this bit after the Round 1 verdict was appealed.
            </span>
          </div>
        ) : null}

        {/* 3-Column Editorial Dossier Cards */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Card 1: The Stage */}
          <div className="haha-glass-panel rounded-2xl p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 mb-6 font-mono text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                <span className="text-[#ffc53d]">Comedian Setup</span>
                <span>{bit?.stage === "pro" ? "Pro 2.5×" : "Open Mic"}</span>
              </div>

              <p className="display-serif text-xl sm:text-2xl text-white leading-[1.38] tracking-tight font-normal">
                “{bit?.scenario ?? "Loading setup…"}”
              </p>

              {bit?.question ? (
                <div className="mt-6 pt-5 border-t border-white/[0.07]">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500 block mb-2">
                    Prompt Question
                  </span>
                  <p className="text-sm text-zinc-300 leading-relaxed font-light">
                    {bit.question}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="mt-8 pt-4 border-t border-white/[0.07] font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">
              ID · {id}
            </div>
          </div>

          {/* Card 2: Straight Man */}
          <div className="haha-glass-panel rounded-2xl p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 mb-6 font-mono text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                <span className="text-[#ffc53d]">Straight Man Read</span>
                <span>{bit?.ai_answer?.model_version ?? "mimo-v2.6-pro"}</span>
              </div>

              {bit?.ai_answer ? (
                <div className="space-y-5">
                  <div className="rounded-xl border border-white/[0.08] bg-[#070709] p-5 text-[13px] text-zinc-200 leading-relaxed font-light">
                    {bit.ai_answer.answer}
                  </div>
                  {bit.ai_answer.reasoning ? (
                    <div>
                      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500 block mb-1.5">
                        Chain of Thought
                      </span>
                      <p className="text-xs leading-relaxed text-zinc-400 font-light">
                        {bit.ai_answer.reasoning}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-zinc-500">
                  Computing literal response…
                </p>
              )}
            </div>

            <div className="mt-8 pt-4 border-t border-white/[0.07]">
              <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-400 mb-2">
                <span>Literal Confidence</span>
                <span className="text-[#ffc53d]">{confPct}%</span>
              </div>
              <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#ffc53d]"
                  style={{ width: `${confPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Card 3: Comedian Reveal & Crowd Quorum */}
          <div className="haha-glass-panel rounded-2xl p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 mb-6 font-mono text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                <span className="text-[#ffc53d]">Reveal &amp; Quorum</span>
                <span>
                  {votedCount} / {assignedCount} Votes
                </span>
              </div>

              {bit?.comedian_reveal ? (
                <div className="space-y-4">
                  <p className="display-serif text-xl text-white leading-snug font-normal">
                    “{bit.comedian_reveal.answer}”
                  </p>
                  <p className="text-xs leading-relaxed text-zinc-400 font-light">
                    {bit.comedian_reveal.explanation}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-zinc-400 font-light">
                  Awaiting comedian reveal or verdict selection below.
                </p>
              )}
            </div>

            <div className="mt-8 pt-4 border-t border-white/[0.07] space-y-4">
              <div>
                <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-400 mb-2">
                  <span>Quorum Progress</span>
                  <span className="text-white">{progressPct}%</span>
                </div>
                <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#ffc53d]"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>

              {bit?.outcome ? (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.14em]">
                    <span className="text-[#ffc53d]">
                      {formatStatusLabel(bit.outcome.result)}
                    </span>
                    <span className="text-zinc-300">
                      Win {(bit.outcome.win_strength * 100).toFixed(0)}% · Fair{" "}
                      {(bit.outcome.fair_ratio * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-zinc-400 font-light">
                    {bit.outcome.result === "killed_it"
                      ? "Payouts settle daily at 00:00 UTC and are claimable from the Tip Jar once the new root activates."
                      : (bit.retrial_round ?? 0) < 2
                        ? "Eligible for one Round-2 appeal below."
                        : "Final verdict after Round 2 retrial."}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Verdict Action Panel */}
        <section aria-label="Verdict" className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#ffc53d] font-semibold">
                Comedian Call
              </p>
              <h2 className="display-serif mt-2 text-3xl text-white">
                Did the Straight Man <em className="italic text-[#ffc53d]">get the joke?</em>
              </h2>
            </div>
            <span className="font-mono text-xs text-zinc-500">
              Available once the Straight Man answers
            </span>
          </div>

          <div className="haha-glass-panel rounded-2xl p-8">
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={!canVerdict || submittingVerdict}
                onClick={() => void submitVerdict("got_it")}
                className="pill-btn disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span>Got it · AI Understood</span>
              </button>
              <button
                type="button"
                disabled={!canVerdict || submittingVerdict}
                onClick={() => setMissedMode((v) => !v)}
                className="pill-btn hot disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span>Missed it · Send to Crowd</span>
              </button>
            </div>

            {missedMode && canVerdict ? (
              <div className="mt-6 space-y-4 border-t border-white/10 pt-6">
                <div>
                  <label className="font-mono text-xs uppercase tracking-[0.16em] text-[#ffc53d]">
                    Your Real Answer / Punchline (max 200 chars)
                  </label>
                  <input
                    type="text"
                    maxLength={200}
                    value={revealAnswer}
                    onChange={(e) => setRevealAnswer(e.target.value)}
                    placeholder="What was the real punchline, subtext, or outcome?"
                    className="mt-2 w-full rounded-xl border border-white/15 bg-[#070709] p-3.5 text-sm text-white focus:border-[#ffc53d] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-mono text-xs uppercase tracking-[0.16em] text-[#ffc53d]">
                    Why the Straight Man Missed It (max 400 chars)
                  </label>
                  <textarea
                    rows={3}
                    maxLength={400}
                    value={revealExplanation}
                    onChange={(e) => setRevealExplanation(e.target.value)}
                    placeholder="Explain it clearly for the blind Crowd jury…"
                    className="mt-2 w-full rounded-xl border border-white/15 bg-[#070709] p-3.5 text-sm text-white focus:border-[#ffc53d] focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  disabled={
                    submittingVerdict ||
                    !revealAnswer.trim() ||
                    !revealExplanation.trim()
                  }
                  onClick={() => void submitVerdict("missed_it")}
                  className="pill-btn hot disabled:opacity-40"
                >
                  <span>
                    {submittingVerdict
                      ? "Locking reveal & assigning Crowd…"
                      : "Lock Reveal & Send to Crowd →"}
                  </span>
                </button>
              </div>
            ) : null}

            <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-500">
              “Missed it” locks your reveal and dispatches the bit to a blind human Crowd quorum.
            </p>
          </div>
        </section>

        {/* Lifecycle Stepper */}
        <section aria-label="Progress" className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#ffc53d] font-semibold">
                Lifecycle
              </p>
              <h2 className="display-serif mt-2 text-3xl text-white">
                Where this bit <em className="italic text-[#ffc53d]">stands.</em>
              </h2>
            </div>
            <span className="font-mono text-xs text-zinc-500">
              Live auto-refresh
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STAGES.map((s, i) => {
              const active = i === currentStage;
              return (
                <div
                  key={s}
                  className={`haha-glass-panel rounded-2xl p-6 flex flex-col justify-between ${
                    active ? "border-[#ffc53d]/45" : ""
                  }`}
                >
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                    Step 0{i + 1}
                  </div>
                  <p className="display-serif mt-3 text-xl text-white">{s}</p>
                  <span
                    className={`mt-4 inline-block font-mono text-[10px] uppercase tracking-[0.16em] ${
                      active ? "text-[#ffc53d]" : "text-zinc-600"
                    }`}
                  >
                    {active ? "Active stage" : i < currentStage ? "Completed" : "Pending"}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Appeal Panel */}
        {bit?.status === "bombed" && (bit.retrial_round ?? 0) < 2 ? (
          <section aria-label="Appeal" className="space-y-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#ffc53d] font-semibold">
                Retrial
              </p>
              <h2 className="display-serif mt-2 text-3xl text-white">
                Disagree with the Crowd? <em className="italic text-[#ffc53d]">Appeal.</em>
              </h2>
            </div>
            <div className="haha-glass-panel rounded-2xl p-8 space-y-4">
              <input
                type="text"
                maxLength={500}
                value={appealReason}
                onChange={(e) => setAppealReason(e.target.value)}
                placeholder="Why should a fresh Round 2 Crowd jury re-evaluate this bit?"
                className="w-full rounded-xl border border-white/15 bg-[#070709] p-3.5 text-sm text-white focus:border-[#ffc53d] focus:outline-none"
              />
              <button
                type="button"
                disabled={submittingAppeal || !appealReason.trim()}
                onClick={() => void submitAppeal()}
                className="pill-btn hot disabled:opacity-40"
              >
                <span>
                  {submittingAppeal ? "Filing appeal…" : "File Round 2 Appeal"}
                </span>
              </button>
              {appealStatus ? (
                <p className="font-mono text-xs text-[#ffc53d]">{appealStatus}</p>
              ) : null}
            </div>
          </section>
        ) : null}

        {/* Report Panel */}
        <section aria-label="Report">
          <div className="haha-glass-panel rounded-2xl p-6 flex flex-wrap items-center gap-3">
            <input
              type="text"
              maxLength={500}
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Report rule violation or personal data (optional)…"
              className="flex-1 rounded-xl border border-white/15 bg-[#070709] px-4 py-2.5 text-xs text-white focus:border-[#ffc53d] focus:outline-none"
            />
            <button
              type="button"
              disabled={submittingReport || !reportReason.trim()}
              onClick={() => void submitReport()}
              className="pill-btn disabled:opacity-40"
            >
              <span>{submittingReport ? "Reporting…" : "Report Bit"}</span>
            </button>
            {reportStatus ? (
              <span className="font-mono text-xs text-[#ffc53d]">
                {reportStatus}
              </span>
            ) : null}
          </div>
        </section>

        {error ? (
          <p
            className="rounded-xl border border-red-500/40 bg-red-500/10 p-3.5 text-sm text-[#ffc53d]"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Link href="/app?tab=stage" className="pill-btn hot flex items-center gap-2">
            <span>Take the stage again</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
          <Link href="/app?tab=crowd" className="pill-btn flex items-center gap-2">
            <span>Judge in the Crowd</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <WalletModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onConnected={(accs) => setAccount(accs[0] ?? null)}
        />
        <Disclaimer />
      </div>
    </div>
  );
}
