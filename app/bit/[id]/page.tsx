"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, Disclaimer, SectionTitle, Stamp } from "@/components/ui";
import WalletModal from "@/components/WalletModal";
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
}

const STAGES = [
  "Waiting for the Straight Man",
  "Straight Man answered",
  "Waiting for the Crowd Quorum",
  "Killed it / Bombed / Heckled off",
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

export default function BitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [bit, setBit] = useState<BitPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<string | null>(null);
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
    <div className="mx-auto max-w-[1440px] px-[clamp(20px,4vw,56px)] pt-28 pb-16 space-y-12">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-[#efe8dc]/12 pb-8">
        <div>
          <span className="eyebrow">
            Bit Dossier · {bit?.category ?? "stage"} ·{" "}
            {bit?.stage === "pro" ? "Pro Stage (2.5×)" : "Open Mic (1.0×)"}
          </span>
          <h1 className="display-serif mt-3 text-4xl text-[#fff6ed] md:text-6xl">
            Bit <em>#{id.slice(0, 10)}</em>
          </h1>
          {bit?.user ? (
            <p className="mt-2 font-mono text-xs uppercase tracking-widest text-[#a49b8e]">
              Performed by{" "}
              <Link
                href={`/u/${encodeURIComponent(bit.user.handle)}`}
                className="text-[#ffb13b] underline"
              >
                @{bit.user.handle}
              </Link>
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <Stamp
            tone={
              bit?.status === "killed_it"
                ? "green"
                : bit?.status === "bombed" || bit?.status === "heckled_off"
                  ? "red"
                  : "amber"
            }
          >
            ● {loading ? "Loading…" : (bit?.status ?? "screening")}
          </Stamp>
        </div>
      </div>

      {/* 3-Screen Stage / Straight Man / Crowd Flow */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="screen">
          <div className="screen-bar">
            <span>1 · The Stage</span>
            <span className="dots">
              <i />
              <i />
              <i />
            </span>
          </div>
          <div className="screen-body">
            <div>
              <p className="quote">{bit?.scenario ?? "Loading setup…"}</p>
              <p className="mt-4 font-mono text-xs uppercase tracking-wider text-[#ffb13b]">
                {bit?.question}
              </p>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#6c6459]">
              Full ID: {id}
            </span>
          </div>
        </div>

        <div className="screen">
          <div className="screen-bar">
            <span>2 · Straight Man</span>
            <span>{bit?.ai_answer?.model_version ?? "SM-01"}</span>
          </div>
          <div className="screen-body">
            {bit?.ai_answer ? (
              <>
                <div className="space-y-3">
                  <div className="ai">{bit.ai_answer.answer}</div>
                  <p className="text-xs leading-relaxed text-[#a49b8e]">
                    {bit.ai_answer.reasoning}
                  </p>
                </div>
                <div className="confidence">
                  <span>Literal Confidence {confPct}%</span>
                  <span className="bar">
                    <i style={{ width: `${confPct}%` }} />
                  </span>
                </div>
              </>
            ) : (
              <p className="font-mono text-xs uppercase tracking-widest text-[#a49b8e]">
                Straight Man is computing literal response…
              </p>
            )}
          </div>
        </div>

        <div className="screen">
          <div className="screen-bar">
            <span>3 · Comedian Reveal &amp; Crowd</span>
            <span>
              {votedCount} / {assignedCount} Votes
            </span>
          </div>
          <div className="screen-body">
            {bit?.comedian_reveal ? (
              <div className="space-y-2">
                <p className="font-serif text-xl text-[#fff6ed]">
                  “{bit.comedian_reveal.answer}”
                </p>
                <p className="text-xs leading-relaxed text-[#a49b8e]">
                  {bit.comedian_reveal.explanation}
                </p>
              </div>
            ) : (
              <p className="text-sm text-[#a49b8e]">
                Awaiting comedian reveal or verdict below.
              </p>
            )}

            <div className="space-y-2 pt-3">
              <div className="confidence">
                <span>Quorum Progress</span>
                <span className="bar">
                  <i style={{ width: `${progressPct}%` }} />
                </span>
              </div>
              {bit?.outcome ? (
                <Stamp
                  tone={bit.outcome.result === "killed_it" ? "green" : "red"}
                >
                  ★ {bit.outcome.result.toUpperCase()} · Win{" "}
                  {(bit.outcome.win_strength * 100).toFixed(0)}% · Fair{" "}
                  {(bit.outcome.fair_ratio * 100).toFixed(0)}%
                </Stamp>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Verdict Action Panel */}
      <section aria-label="Verdict">
        <SectionTitle
          eyebrow="Comedian Call"
          hint="Available once the Straight Man answers"
        >
          Did the Straight Man <em>get the joke?</em>
        </SectionTitle>
        <Card hot={canVerdict}>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={!canVerdict || submittingVerdict}
              onClick={() => void submitVerdict("got_it")}
              className="pill-btn disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span>Got it 😐 (AI Understood)</span>
            </button>
            <button
              type="button"
              disabled={!canVerdict || submittingVerdict}
              onClick={() => setMissedMode((v) => !v)}
              className="pill-btn hot disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span>Missed it 😂 (Send to Crowd)</span>
            </button>
          </div>

          {missedMode && canVerdict ? (
            <div className="mt-6 space-y-4 border-t border-[#efe8dc]/12 pt-5">
              <div>
                <label className="font-mono text-xs uppercase tracking-widest text-[#ffb13b]">
                  Your Real Answer / Punchline (max 200 chars)
                </label>
                <input
                  type="text"
                  maxLength={200}
                  value={revealAnswer}
                  onChange={(e) => setRevealAnswer(e.target.value)}
                  placeholder="What was the real punchline, subtext, or outcome?"
                  className="mt-2 w-full rounded-xl border border-[#efe8dc]/15 bg-[#0c0a08] p-3.5 text-sm text-[#fff6ed] focus:border-[#ffb13b] focus:outline-none"
                />
              </div>
              <div>
                <label className="font-mono text-xs uppercase tracking-widest text-[#ffb13b]">
                  Why the Straight Man Missed It (max 400 chars)
                </label>
                <textarea
                  rows={3}
                  maxLength={400}
                  value={revealExplanation}
                  onChange={(e) => setRevealExplanation(e.target.value)}
                  placeholder="Explain it clearly for the blind Crowd jury…"
                  className="mt-2 w-full rounded-xl border border-[#efe8dc]/15 bg-[#0c0a08] p-3.5 text-sm text-[#fff6ed] focus:border-[#ffb13b] focus:outline-none"
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

          <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-[#6c6459]">
            “Missed it” locks your reveal and dispatches the bit to a blind
            human Crowd quorum.
          </p>
        </Card>
      </section>

      {/* Progress Stepper */}
      <section aria-label="Progress">
        <SectionTitle eyebrow="Lifecycle" hint="Live auto-refresh">
          Where this bit <em>stands.</em>
        </SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STAGES.map((s, i) => (
            <Card key={s} hot={i === currentStage}>
              <div className="font-mono text-[10px] uppercase tracking-widest text-[#a49b8e]">
                Stage 0{i + 1}
              </div>
              <p className="display-serif mt-2 text-xl text-[#fff6ed]">{s}</p>
              {i === currentStage ? (
                <span className="mt-2 inline-block font-mono text-[10px] uppercase tracking-widest text-[#ffb13b]">
                  ● Active Now
                </span>
              ) : null}
            </Card>
          ))}
        </div>
      </section>

      {/* Appeal Panel */}
      {bit?.status === "bombed" && (bit.retrial_round ?? 0) < 2 ? (
        <section aria-label="Appeal">
          <SectionTitle
            eyebrow="Retrial"
            hint="1 appeal per 24h · fresh Round 2 jury"
          >
            Disagree with the Crowd? <em>Appeal.</em>
          </SectionTitle>
          <Card className="space-y-4">
            <input
              type="text"
              maxLength={500}
              value={appealReason}
              onChange={(e) => setAppealReason(e.target.value)}
              placeholder="Why should a fresh Round 2 Crowd jury re-evaluate this bit?"
              className="w-full rounded-xl border border-[#efe8dc]/15 bg-[#0c0a08] p-3.5 text-sm text-[#fff6ed] focus:border-[#ffb13b] focus:outline-none"
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
              <p className="font-mono text-xs text-[#8fb596]">{appealStatus}</p>
            ) : null}
          </Card>
        </section>
      ) : null}

      {/* Report Panel */}
      <section aria-label="Report">
        <Card className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            maxLength={500}
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            placeholder="Report rule violation or personal data (optional)…"
            className="flex-1 rounded-xl border border-[#efe8dc]/15 bg-[#0c0a08] px-4 py-2.5 text-xs text-[#efe8dc] focus:border-[#ffb13b] focus:outline-none"
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
            <span className="font-mono text-xs text-[#8fb596]">
              {reportStatus}
            </span>
          ) : null}
        </Card>
      </section>

      {error ? (
        <p
          className="rounded-xl border border-[#c93b2b]/40 bg-[#c93b2b]/15 p-3.5 text-sm text-[#ffb13b]"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Link href="/stage" className="pill-btn hot">
          <span>🎤 Take the stage again →</span>
        </Link>
        <Link href="/crowd" className="pill-btn">
          <span>Judge in the Crowd →</span>
        </Link>
      </div>

      <WalletModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConnected={(accs) => setAccount(accs[0] ?? null)}
      />
      <Disclaimer />
    </div>
  );
}
