"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, Disclaimer, SectionTitle, Stamp } from "@/components/ui";
import WalletModal from "@/components/WalletModal";
import { StraightManLiveEngine } from "@/components/StraightManLiveEngine";
import { CheckCircle2, XCircle, Mic, ArrowUpRight, Users, Bot } from "lucide-react";
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
  has_reveal?: boolean;
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
    case "rejected_prescreen":
      return -1;
    default:
      return 0;
  }
}

function formatModelVersion(raw?: string | null): string {
  if (!raw) return "Opus 5.5";
  return raw.replace(/mimo-v2\.6-pro/gi, "Opus 5.5").replace(/mimo/gi, "Opus 5.5");
}

export default function BitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [bit, setBit] = useState<BitPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadState, setLoadState] = useState<
    "loading" | "ready" | "missing" | "error"
  >("loading");
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
  const [cardCopied, setCardCopied] = useState(false);

  useEffect(() => {
    const st = getSharedWalletState();
    if (st.account) setAccount(st.account);
    return subscribeWalletState((next) => setAccount(next.account));
  }, []);

  const loadBit = useCallback(async () => {
    try {
      const res = await fetch(`/api/bits/${encodeURIComponent(id)}`, {
        cache: "no-store",
      });
      if (res.status === 404) {
        setBit(null);
        setLoadState("missing");
        return;
      }
      if (!res.ok) {
        setLoadState((previous) => (previous === "ready" ? previous : "error"));
        return;
      }
      const data = (await res.json()) as BitPayload;
      setBit(data);
      setLoadState("ready");
    } catch {
      setLoadState((previous) => (previous === "ready" ? previous : "error"));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadBit();
    const timer = window.setInterval(() => {
      // Keep polling through `answered` until the Straight Man answer exists:
      // prescreen writes `answered` before the straightman job stores output.
      if (
        !bit ||
        bit.status === "screening" ||
        (bit.status === "answered" && !bit.ai_answer) ||
        bit.status === "in_crowd" ||
        bit.status === "disputed" ||
        (Boolean(bit.outcome) && !bit.share_card_url)
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
      setAppealStatus("Appeal submitted: Round 2 Crowd retrial queued.");
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
  const isAuthor = Boolean(
    account &&
      bit?.user?.wallet &&
      account.toLowerCase() === bit.user.wallet.toLowerCase(),
  );
  const hasAiAnswer = Boolean(bit?.ai_answer);
  const canVerdict =
    isAuthor && bit?.status === "answered" && hasAiAnswer;
  const revealLocked = Boolean(bit?.has_reveal) && !bit?.comedian_reveal;
  const selfConceded = bit?.status === "bombed" && !bit?.outcome;
  const hasCrowdVerdict = Boolean(bit?.outcome);
  const canAppeal =
    isAuthor &&
    hasCrowdVerdict &&
    (bit?.status === "bombed" || bit?.status === "heckled_off") &&
    (bit.retrial_round ?? 0) < 2;
  const votedCount = bit?.crowd?.voted ?? bit?.outcome?.juror_count ?? 0;
  const assignedCount = Math.max(5, bit?.crowd?.assigned ?? 5);
  const progressPct = Math.min(
    100,
    Math.round((votedCount / assignedCount) * 100),
  );
  const confPct = bit?.ai_answer
    ? Math.round((bit.ai_answer.confidence ?? 0.96) * 100)
    : 97;

  if (loading && !bit) {
    return (
      <div className="relative min-h-screen bg-[#070709] text-white">
        <div className="mx-auto max-w-[860px] px-6 pt-32">
          <Card>
            <p className="font-mono text-xs uppercase tracking-widest text-zinc-400">
              Loading bit dossier…
            </p>
          </Card>
        </div>
      </div>
    );
  }

  if (loadState === "missing") {
    return (
      <div className="relative min-h-screen bg-[#070709] text-white">
        <div className="mx-auto max-w-[860px] px-6 pt-32 pb-16 space-y-6">
          <p className="eyebrow">Bit Dossier</p>
          <h1 className="display-serif text-5xl text-white">
            This bit <em>does not exist.</em>
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-zinc-400">
            The link may be mistyped, or the bit may have been removed. Nothing
            is processing under this ID.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/app?tab=stage" className="pill-btn hot">
              Take the Stage →
            </Link>
            <Link href="/app?tab=crowd" className="pill-btn">
              Judge in the Crowd →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loadState === "error" && !bit) {
    return (
      <div className="relative min-h-screen bg-[#070709] text-white">
        <div className="mx-auto max-w-[860px] px-6 pt-32 pb-16 space-y-6">
          <p className="eyebrow">Bit Dossier</p>
          <h1 className="display-serif text-5xl text-white">
            We could not <em>load this bit.</em>
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-zinc-400">
            This is a connection problem, not a missing bit. Retry before
            assuming anything about its status.
          </p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setLoadState("loading");
              void loadBit();
            }}
            className="pill-btn hot"
          >
            Retry loading →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#070709] text-white selection:bg-[#ffc53d]/30 selection:text-[#ffc53d] overflow-x-clip">
      {/* Ambient Stage Lighting Glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[550px] bg-radial from-[#ffc53d]/06 via-[#ffc53d]/01 to-transparent blur-[160px] rounded-full z-0"
      />

      <div className="relative z-10 mx-auto max-w-[1440px] px-[clamp(20px,4vw,56px)] pt-28 pb-16 space-y-12">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-6 border-b border-white/10 pb-8">
          <div>
            <span className="eyebrow">
              Bit Dossier · {(bit?.category ?? "stage").replace(/_/g, " ")} ·{" "}
              {bit?.stage === "pro" ? "Pro Stage (2.5×)" : "Open Mic (1.0×)"}
            </span>
            <h1 className="display-serif mt-3 text-4xl text-white md:text-6xl">
              Bit <em>#{id.slice(0, 10)}</em>
            </h1>
            {bit?.user ? (
              <p className="mt-2 font-mono text-xs uppercase tracking-widest text-zinc-400">
                Performed by{" "}
                <Link
                  href={`/u/${encodeURIComponent(bit.user.handle)}`}
                  className="text-[#ffc53d] hover:text-[#ffd875] underline transition-colors"
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
              {loading
                ? "Loading…"
                : (bit?.status ?? "screening").replace(/_/g, " ")}
            </Stamp>
          </div>
        </div>

        {!loading && (bit?.retrial_round ?? 0) >= 2 ? (
          <div className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border border-[#ffc53d]/30 bg-[#ffc53d]/[0.06] px-4 py-3">
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#ffc53d]">
              Round 2 · Crowd Retrial
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">
              Fresh seats re-judged this bit after the Round 1 verdict was appealed
            </span>
          </div>
        ) : null}

        {bit?.status === "rejected_prescreen" ? (
          <section aria-label="Prescreen result">
            <Card hot>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-rose-300">
                Bit not accepted · prescreen
              </p>
              {bit.reject_reason === "crisis_support" ? (
                <div className="mt-3 space-y-2 text-sm leading-relaxed text-zinc-300">
                  <p className="font-semibold text-white">
                    You are not alone. This bit was not sent to the Stage.
                  </p>
                  <p>
                    If you or someone you know is going through a difficult
                    time or having thoughts of self-harm, free confidential
                    support is available right now: call or text{" "}
                    <span className="font-mono font-semibold text-white">
                      988
                    </span>{" "}
                    (US &amp; Canada) or visit{" "}
                    <a
                      href="https://findahelpline.com"
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      findahelpline.com
                    </a>{" "}
                    worldwide.
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-sm leading-relaxed text-zinc-300">
                  {bit.reject_reason
                    ? `Reason: ${bit.reject_reason.replace(/_/g, " ")}.`
                    : "The prescreen could not accept this bit."}{" "}
                  Nothing was sent to the Crowd and no reward was created.
                </p>
              )}
              <Link href="/app?tab=stage" className="pill-btn hot mt-5">
                Write another bit →
              </Link>
            </Card>
          </section>
        ) : null}

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
                <p className="mt-4 font-mono text-xs uppercase tracking-wider text-[#ffc53d]">
                  {bit?.question}
                </p>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                Full ID: {id}
              </span>
            </div>
          </div>

          <div className="screen">
            <div className="screen-bar">
              <span>2 · Straight Man</span>
              <span>{formatModelVersion(bit?.ai_answer?.model_version)}</span>
            </div>
            <div className="screen-body">
              {bit?.ai_answer ? (
                <>
                  <div className="space-y-3">
                    <div className="ai">{bit.ai_answer.answer}</div>
                    <p className="text-xs leading-relaxed text-zinc-400">
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
                <StraightManLiveEngine
                  stage={bit?.status === "screening" ? "prescreen" : "straightman"}
                  category={bit?.category}
                />
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
                  <p className="font-serif text-xl text-white">
                    “{bit.comedian_reveal.answer}”
                  </p>
                  <p className="text-xs leading-relaxed text-zinc-400">
                    {bit.comedian_reveal.explanation}
                  </p>
                </div>
              ) : revealLocked ? (
                <p className="text-sm text-zinc-400">
                  Reveal locked. Waiting for the blind Crowd to finish
                  judging.
                </p>
              ) : bit?.status === "answered" && hasAiAnswer ? (
                <p className="text-sm text-zinc-400">
                  Waiting for the performer&apos;s call. The reveal stays
                  hidden until the Crowd needs it.
                </p>
              ) : (
                <p className="text-sm text-zinc-400">
                  No reveal has been sent yet.
                </p>
              )}

              {!selfConceded && bit?.status !== "rejected_prescreen" ? (
              <div className="space-y-2.5 pt-3">
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
                    <span className="flex items-center gap-1.5">
                      {bit.outcome.result === "killed_it" ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {bit.outcome.result.replace(/_/g, " ").toUpperCase()} · Win{" "}
                        {(bit.outcome.win_strength * 100).toFixed(0)}% · Fair{" "}
                        {(bit.outcome.fair_ratio * 100).toFixed(0)}%
                      </span>
                    </span>
                  </Stamp>
                ) : null}
                {bit?.outcome ? (
                  <p className="text-xs leading-relaxed text-zinc-400">
                    {bit.outcome.result === "killed_it"
                      ? "This is a Crowd verdict, not a paid balance. Any payout requires verified USDG funding and an activated settlement root."
                      : (bit.retrial_round ?? 0) < 2
                        ? "This is a Crowd verdict. If you disagree, you can file one Round-2 appeal below."
                        : "Final verdict after Round 2. No further appeal is available for this bit."}
                  </p>
                ) : selfConceded ? (
                  <p className="text-xs leading-relaxed text-zinc-400">
                    You conceded that the Straight Man understood. No Crowd
                    vote was held, so there is nothing to appeal and no reward
                    from this bit.
                  </p>
                ) : bit?.status === "disputed" || bit?.status === "in_crowd" ? (
                  <p className="text-xs leading-relaxed text-zinc-400">
                    A blind Crowd is judging. Five votes decide; a thin result
                    expands to seven. You do not need to keep this tab open.
                  </p>
                ) : null}
              </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Share Card (renders once the bit settles and the card pipeline runs) */}
        {bit?.share_card_url ? (
          <section aria-label="Share card" className="pb-2">
            <div className="mx-auto max-w-[860px] rounded-2xl border border-white/10 bg-[#0c0c12] shadow-2xl overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={bit.share_card_url}
                alt="Crowd verdict share card"
                loading="lazy"
                className="w-full aspect-[16/9] object-cover"
              />
              <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-t border-white/10 bg-[#070709]/80">
                <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">
                  Crowd verdict card · auto-rendered on settle
                </span>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(bit.share_card_url ?? "");
                    setCardCopied(true);
                    window.setTimeout(() => setCardCopied(false), 1800);
                  }}
                  className="font-mono text-[10px] uppercase tracking-widest text-[#ffc53d] border border-[#ffc53d]/30 bg-[#ffc53d]/10 rounded-full px-4 py-1.5 hover:bg-[#ffc53d]/20 transition cursor-pointer"
                >
                  {cardCopied ? "Link Copied ✓" : "Copy Card Link"}
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {/* Next action: exactly one primary action for this state. */}
        <section aria-label="Next action">
          <SectionTitle
            eyebrow="Next step"
            hint={
              canVerdict
                ? "Your call as the performer"
                : "The page updates automatically"
            }
          >
            {canVerdict ? (
              <>
                Did the Straight Man <em>get the joke?</em>
              </>
            ) : hasCrowdVerdict ? (
              <>
                The Crowd has <em>decided.</em>
              </>
            ) : (
              <>
                What happens <em>next.</em>
              </>
            )}
          </SectionTitle>

          {bit?.status === "screening" ||
          (bit?.status === "answered" && !hasAiAnswer) ? (
            <Card hot>
              <StraightManLiveEngine
                stage={bit?.status === "screening" ? "prescreen" : "straightman"}
                category={bit?.category}
              />
              <p className="mt-4 text-sm leading-relaxed text-zinc-300">
                The bit passed prescreen. Its literal answer is still being
                written and stored. This page will keep checking; you do not
                need to reload.
              </p>
            </Card>
          ) : null}

          {canVerdict ? (
            <Card hot>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={submittingVerdict}
                  onClick={() => void submitVerdict("got_it")}
                  className="pill-btn disabled:cursor-not-allowed disabled:opacity-40 flex items-center gap-1.5"
                >
                  <Bot className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Got it (AI Understood)</span>
                </button>
                <button
                  type="button"
                  disabled={submittingVerdict}
                  onClick={() => setMissedMode((v) => !v)}
                  className="pill-btn hot disabled:cursor-not-allowed disabled:opacity-40 flex items-center gap-1.5"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Missed it (Send to Crowd)</span>
                </button>
              </div>

              {missedMode ? (
                <div className="mt-6 space-y-4 border-t border-white/10 pt-5">
                  <div>
                    <label
                      htmlFor="reveal-answer"
                      className="font-mono text-xs uppercase tracking-widest text-[#ffc53d]"
                    >
                      Your Real Answer / Punchline (max 200 chars)
                    </label>
                    <input
                      id="reveal-answer"
                      type="text"
                      maxLength={200}
                      value={revealAnswer}
                      onChange={(e) => setRevealAnswer(e.target.value)}
                      placeholder="What was the real punchline, subtext, or outcome?"
                      className="mt-2 w-full rounded-xl border border-white/15 bg-[#070709] p-3.5 text-sm text-white placeholder:text-zinc-500 focus:border-[#ffc53d] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="reveal-explanation"
                      className="font-mono text-xs uppercase tracking-widest text-[#ffc53d]"
                    >
                      Why the Straight Man Missed It (max 400 chars)
                    </label>
                    <textarea
                      id="reveal-explanation"
                      rows={3}
                      maxLength={400}
                      value={revealExplanation}
                      onChange={(e) => setRevealExplanation(e.target.value)}
                      placeholder="Explain it clearly for the blind Crowd jury…"
                      className="mt-2 w-full rounded-xl border border-white/15 bg-[#070709] p-3.5 text-sm text-white placeholder:text-zinc-500 focus:border-[#ffc53d] focus:outline-none"
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

              <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-500">
                “Missed it” locks your reveal and dispatches the bit to a blind
                human Crowd quorum. “Got it” closes it with no Crowd vote.
              </p>
            </Card>
          ) : null}

          {bit?.status === "answered" && hasAiAnswer && !isAuthor ? (
            <Card>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400">
                Spectator view
              </p>
              <p className="mt-3 text-sm leading-relaxed text-zinc-300">
                Only the performer can decide whether the Straight Man
                understood. The reveal and Crowd ballot stay hidden.
              </p>
            </Card>
          ) : null}

          {(revealLocked ||
            bit?.status === "disputed" ||
            bit?.status === "in_crowd") &&
          !hasCrowdVerdict ? (
            <Card hot>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#ffc53d]">
                Waiting for the Crowd
              </p>
              <p className="mt-3 text-sm leading-relaxed text-zinc-300">
                Your reveal is locked. Five blind jurors decide; a thin result
                expands to seven. You can close this tab; the verdict will be
                here when you return.
              </p>
            </Card>
          ) : null}

          {selfConceded ? (
            <Card>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400">
                Closed · no Crowd vote
              </p>
              <p className="mt-3 text-sm leading-relaxed text-zinc-300">
                You said the Straight Man understood. There is no Crowd verdict
                to appeal and no reward from this bit. Write a new bit when you
                want another attempt.
              </p>
            </Card>
          ) : null}

          {hasCrowdVerdict && bit?.outcome ? (
            <Card hot={bit.outcome.result === "killed_it"}>
              <div className="flex flex-wrap items-center gap-3">
                <Stamp tone={bit.outcome.result === "killed_it" ? "green" : "red"}>
                  {bit.outcome.result.replace(/_/g, " ").toUpperCase()}
                </Stamp>
                <span className="font-mono text-xs text-zinc-400">
                  Win {(bit.outcome.win_strength * 100).toFixed(0)}% · Fair{" "}
                  {(bit.outcome.fair_ratio * 100).toFixed(0)}%
                </span>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-zinc-300">
                {bit.outcome.result === "killed_it"
                  ? "The Crowd sided with you. A verdict is not a paid balance; any reward requires verified USDG funding and an activated settlement root."
                  : (bit.retrial_round ?? 0) < 2
                    ? "The Crowd did not side with you. If you believe the blind jury missed context, you can file one Round-2 appeal below."
                    : "The Round-2 Crowd verdict is final. No further appeal is available for this bit."}
              </p>
              {bit.outcome.result === "killed_it" ? (
                <Link href="/app?tab=tipjar" className="pill-btn hot mt-5">
                  Check Tip Jar →
                </Link>
              ) : null}
            </Card>
          ) : null}
        </section>

        {/* Progress Stepper */}
        <section aria-label="Progress">
          <SectionTitle eyebrow="Lifecycle" hint="Live auto-refresh">
            Where this bit <em>stands.</em>
          </SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STAGES.map((s, i) => (
              <Card key={s} hot={i === currentStage}>
                <div className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">
                  Stage 0{i + 1}
                </div>
                <p className="display-serif mt-2 text-xl text-white">{s}</p>
                {i === currentStage ? (
                  <span className="mt-2 inline-block font-mono text-[10px] uppercase tracking-[0.2em] text-[#ffc53d] font-semibold">
                    Current Stage
                  </span>
                ) : null}
              </Card>
            ))}
          </div>
        </section>

        {/* Appeal Panel: only a Crowd loss can be appealed. */}
        {canAppeal ? (
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
                className="w-full rounded-xl border border-white/15 bg-[#070709] p-3.5 text-sm text-white placeholder:text-zinc-500 focus:border-[#ffc53d] focus:outline-none"
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
              className="flex-1 rounded-xl border border-white/15 bg-[#070709] px-4 py-2.5 text-xs text-white placeholder:text-zinc-500 focus:border-[#ffc53d] focus:outline-none"
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
          </Card>
        </section>

        {error ? (
          <p
            className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3.5 text-sm text-rose-200"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Link href="/app?tab=stage" className="pill-btn hot flex items-center gap-2">
            <Mic className="w-3.5 h-3.5" />
            <span>Take the stage again</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
          <Link href="/app?tab=crowd" className="pill-btn flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-zinc-400" />
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
