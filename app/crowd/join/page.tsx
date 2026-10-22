"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, Disclaimer, PageHero, Stamp } from "@/components/ui";
import WalletModal from "@/components/WalletModal";
import { CheckCircle2, XCircle, ArrowUpRight } from "lucide-react";
import {
  authHeaders,
  ensureSiweSession,
  getSharedWalletState,
  setSharedWalletState,
  subscribeWalletState,
  truncateAddress,
} from "@/lib/wallets";

interface QuizItem {
  scenario: string;
  question: string;
  a: string;
  b: string;
}

interface ExpectedKeyItem {
  correct: "A" | "B";
  fair: boolean;
}

const QUIZ: QuizItem[] = [
  {
    scenario:
      "I told my plants I'd water them every day. Now they're dead and they didn't even leave a note.",
    question: "What's the joke?",
    a: "The narrator is sad about a breakup and the plants symbolize lost love.",
    b: "It treats dead plants like a dramatic human farewell (“didn't leave a note”) while the cause is the narrator's broken promise.",
  },
  {
    scenario:
      "You cancel dinner for the third time this month. Your friend replies: “No worries at all!! Totally get it. Maybe next year haha.”",
    question: "How does your friend actually feel?",
    a: "Completely fine and understanding — the cheerful phrasing proves it.",
    b: "Hurt and fed up; the over-cheerful tone and “next year” are passive-aggressive.",
  },
  {
    scenario:
      "A guest arrives exactly on time. The host opens the door wearing a towel, hair wet.",
    question: "What does this tell you about the party?",
    a: "The host is rude and didn't want guests at all.",
    b: "Guests are expected fashionably late — the on-time guest is effectively early.",
  },
  {
    scenario: "“I saw the man with the binoculars.”",
    question: "Who has the binoculars?",
    a: "Obviously the man — grammar always resolves this.",
    b: "Genuinely ambiguous without context; either the speaker used them or the man had them.",
  },
  {
    scenario:
      "My grandpa said my generation relies too much on technology. So I unplugged his…",
    question: "Finish the punchline.",
    a: "…phone charger, to prove a point about screen time.",
    b: "…life support. The shock turn from a generational argument into something dark is the joke.",
  },
  {
    scenario: "How many R's are in “strawberry”?",
    question: "Is this a fair bit?",
    a: "Yes — it's a clean test of careful reading.",
    b: "No — it's a token-counting trick, not human understanding.",
  },
  {
    scenario:
      "What's my dog's name? He barked at the mailman yesterday and it was hilarious.",
    question: "Is this a fair bit?",
    a: "Yes — the barking detail makes the answer guessable.",
    b: "No — it needs private info only the sender knows.",
  },
  {
    scenario:
      "A hospital parking sign: “Visitors who are not patients are not permitted to park here.”",
    question: "Who can park here?",
    a: "Only patients (and possibly staff); non-patient visitors must park elsewhere.",
    b: "Any visitor — signs like this are never enforced.",
  },
  {
    scenario:
      "After a long silence at dinner, your mom says, “It's fine. I'll just do the dishes myself. Like always.”",
    question: "Is it fine?",
    a: "Yes — she said it's fine and only tonight's dishes matter.",
    b: "No — “like always” reveals a long-standing grievance about unequal effort.",
  },
  {
    scenario: "A job ad: “We work hard and play hard. We're a family here.”",
    question: "What is the ad really saying?",
    a: "It's a warm, supportive workplace that values fun and belonging.",
    b: "Expect long hours and blurred boundaries; “family” signals loyalty pressure beyond the job.",
  },
];

const PASS_MARK = 8;

export default function CrowdJoinPage() {
  const [votes, setVotes] = useState<Record<number, "A" | "B">>({});
  const [fair, setFair] = useState<Record<number, boolean>>({});
  const [graded, setGraded] = useState(false);
  const [score, setScore] = useState(0);
  const [expectedKey, setExpectedKey] = useState<ExpectedKeyItem[] | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedServer, setSavedServer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadyPassed, setAlreadyPassed] = useState<boolean | null>(null);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [checkingSaved, setCheckingSaved] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [statusRefresh, setStatusRefresh] = useState(0);
  const [allowQuizWithoutSession, setAllowQuizWithoutSession] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);

  useEffect(() => {
    const st = getSharedWalletState();
    if (st.account) {
      setAccount(st.account);
      setSessionActive(Boolean(st.sessionToken));
    }
    return subscribeWalletState((next) => {
      setAccount(next.account);
      setSessionActive(Boolean(next.sessionToken));
    });
  }, []);

  async function forceReSignSiwe() {
    const st = getSharedWalletState();
    if (!st.account) {
      setModalOpen(true);
      return;
    }
    setSigningIn(true);
    setError(null);
    try {
      // Clear existing session token to force a fresh personal_sign popup in wallet
      setSharedWalletState({ sessionToken: null });
      setSessionActive(false);
      const siwe = await ensureSiweSession(st.provider, st.account);
      if (!siwe.ok) {
        setError(siwe.error ?? "Wallet signature cancelled or rejected.");
        return;
      }
      setSessionActive(true);
      setStatusRefresh((v) => v + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to sign SIWE session.");
    } finally {
      setSigningIn(false);
    }
  }

  // Check the saved calibration result BEFORE showing ten questions again.
  // `authenticated` is distinct from `status`: an expired session must ask
  // the user to sign in, not silently treat them as a brand-new juror.
  useEffect(() => {
    let cancelled = false;
    if (!account) {
      setAlreadyPassed(null);
      setNeedsSignIn(false);
      setCheckingSaved(false);
      return;
    }
    (async () => {
      setCheckingSaved(true);
      try {
        const st = getSharedWalletState();
        const res = await fetch(
          `/api/crowd/onboarding?wallet=${encodeURIComponent(account)}`,
          {
            headers: st.sessionToken ? authHeaders(st.sessionToken) : undefined,
            cache: "no-store",
          },
        );
        const d = (await res.json().catch(() => ({}))) as {
          status?: { onboarded?: boolean } | null;
          authenticated?: boolean;
        };
        if (cancelled) return;
        if (d.authenticated === false) {
          setNeedsSignIn(true);
          setAlreadyPassed(null);
        } else {
          setNeedsSignIn(false);
          setAlreadyPassed(d.status ? d.status.onboarded === true : null);
        }
      } catch {
        if (!cancelled) {
          setAlreadyPassed(null);
          setNeedsSignIn(true);
        }
      } finally {
        if (!cancelled) setCheckingSaved(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [account, statusRefresh]);

  const answered =
    Object.keys(votes).length === QUIZ.length &&
    Object.keys(fair).length === QUIZ.length;

  function buildAnswersPayload() {
    return QUIZ.map((_, i) => ({
      vote: votes[i] ?? "A",
      fair: fair[i] ?? true,
    }));
  }

  async function recordPassOnServer() {
    const st = getSharedWalletState();
    if (!st.account) return;
    setSaving(true);
    setError(null);
    try {
      const siwe = await ensureSiweSession(st.provider, st.account);
      if (!siwe.ok) {
        setError(siwe.error ?? "Sign-in required to record quiz pass.");
        return;
      }
      const res = await fetch("/api/crowd/onboarding", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...authHeaders(siwe.sessionToken),
        },
        body: JSON.stringify({
          wallet: siwe.wallet ?? st.account,
          answers: buildAnswersPayload(),
        }),
      });
      const d = (await res.json().catch(() => ({}))) as {
        passed?: boolean;
        correct?: number;
        expected?: ExpectedKeyItem[];
        error?: string;
      };
      if (res.ok) {
        if (typeof d.correct === "number") setScore(d.correct);
        if (Array.isArray(d.expected)) setExpectedKey(d.expected);
        setGraded(true);
        setSavedServer(d.passed === true);
        setAlreadyPassed(d.passed === true);
        if (d.passed !== true) {
          setError(
            "Your result was graded, but this attempt did not pass. Review the corrections and retake it.",
          );
        }
      } else {
        setError(d.error ?? "Could not record onboarding result.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save onboarding.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit() {
    if (saving) return;
    setError(null);
    if (account) {
      await recordPassOnServer();
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/crowd/onboarding", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          preview: true,
          answers: buildAnswersPayload(),
        }),
      });
      const d = (await res.json().catch(() => ({}))) as {
        correct?: number;
        expected?: ExpectedKeyItem[];
        error?: string;
      };
      if (res.ok) {
        if (typeof d.correct === "number") setScore(d.correct);
        if (Array.isArray(d.expected)) setExpectedKey(d.expected);
        setGraded(true);
      } else {
        setError(d.error ?? "Could not grade quiz.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to grade quiz.");
    } finally {
      setSaving(false);
    }
  }

  async function signInAndCheck() {
    setError(null);
    setSigningIn(true);
    try {
      const st = getSharedWalletState();
      const siwe = await ensureSiweSession(st.provider, st.account);
      if (!siwe.ok) {
        setError(siwe.error ?? "Sign-in failed. Try again.");
        return;
      }
      setStatusRefresh((value) => value + 1);
    } finally {
      setSigningIn(false);
    }
  }

  const showSignInGate =
    Boolean(account) &&
    needsSignIn &&
    !graded &&
    !allowQuizWithoutSession &&
    !alreadyPassed;

  return (
    <div className="relative min-h-screen bg-[#070709] text-white selection:bg-[#ffc53d]/30 selection:text-[#ffc53d] overflow-x-clip">
      {/* Ambient Stage Lighting Glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[550px] bg-radial from-[#ffc53d]/06 via-[#ffc53d]/01 to-transparent blur-[160px] rounded-full z-0"
      />

      <div className="relative z-10 mx-auto max-w-[1440px] px-[clamp(20px,4vw,56px)] pt-28 pb-16 space-y-10">
      <PageHero
        kicker="Join the Crowd · Calibration"
        title={
          <>
            The Onboarding <em>Quiz.</em>
          </>
        }
        lede={`Ten cases with known answers. Score at least ${PASS_MARK} out of 10 — both the winning answer and the fairness call must be right to earn a point.`}
      />

      {/* Guided Journey Roadmap Banner */}
      <section aria-label="Juror onboarding roadmap" className="mb-2">
        <div className="haha-glass-panel rounded-2xl p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-3.5 mb-4">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#ffc53d] font-semibold">
              Juror Calibration Track · 4 Steps
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-400">
              {!account
                ? "Step 01 Active: Connect Wallet"
                : alreadyPassed
                  ? "Calibration Complete · Juror Status Active"
                  : graded && score >= PASS_MARK
                    ? "Step 03 Active: Sign SIWE Credential"
                    : "Step 02 Active: Complete 10 Cases"}
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
                <span className="text-zinc-400">Step 01</span>
                <span className={account ? "text-emerald-400 font-semibold" : "text-zinc-500"}>
                  {account ? "Connected ✓" : "Required"}
                </span>
              </div>
              <p className="mt-1 font-serif text-base text-white">Connect Wallet</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-400">
                Robinhood Testnet (Chain ID 46630).
              </p>
            </div>

            <div
              className={`rounded-xl border p-3.5 transition-all ${
                account && !alreadyPassed && !(graded && score >= PASS_MARK)
                  ? "border-[#ffc53d]/45 bg-[#ffc53d]/[0.07]"
                  : alreadyPassed || (graded && score >= PASS_MARK)
                    ? "border-emerald-500/30 bg-emerald-950/15"
                    : "border-white/10 bg-[#070709]/60"
              }`}
            >
              <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest">
                <span className="text-zinc-400">Step 02</span>
                <span
                  className={
                    alreadyPassed || (graded && score >= PASS_MARK)
                      ? "text-emerald-400 font-semibold"
                      : "text-[#ffc53d]"
                  }
                >
                  {alreadyPassed || (graded && score >= PASS_MARK)
                    ? "Passed (8+/10) ✓"
                    : "Active Quiz"}
                </span>
              </div>
              <p className="mt-1 font-serif text-base text-white">Pass 10 Cases</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-400">
                Identify true joke interpretation &amp; fairness.
              </p>
            </div>

            <div
              className={`rounded-xl border p-3.5 transition-all ${
                graded && score >= PASS_MARK && !savedServer
                  ? "border-[#ffc53d]/45 bg-[#ffc53d]/[0.07]"
                  : alreadyPassed || savedServer
                    ? "border-emerald-500/30 bg-emerald-950/15"
                    : "border-white/10 bg-[#070709]/60"
              }`}
            >
              <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest">
                <span className="text-zinc-400">Step 03</span>
                <span
                  className={
                    alreadyPassed || savedServer
                      ? "text-emerald-400 font-semibold"
                      : "text-zinc-400"
                  }
                >
                  {alreadyPassed || savedServer ? "Certified ✓" : "SIWE Sign"}
                </span>
              </div>
              <p className="mt-1 font-serif text-base text-white">Sign SIWE Session</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-400">
                Gasless signature saves juror credential.
              </p>
            </div>

            <Link
              href="/app?tab=crowd"
              className={`rounded-xl border p-3.5 transition-all hover:border-[#ffc53d]/40 ${
                alreadyPassed || savedServer
                  ? "border-emerald-500/40 bg-emerald-950/20"
                  : "border-white/10 bg-[#070709]/60"
              }`}
            >
              <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest">
                <span className="text-zinc-400">Step 04</span>
                <span className="text-zinc-300">Console →</span>
              </div>
              <p className="mt-1 font-serif text-base text-white">Judge in Crowd</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-400">
                Cast blind votes; any USDG share requires verified funding and settlement.
              </p>
            </Link>
          </div>
        </div>
      </section>

      {/* Wallet & SIWE Session Status Bar */}
      <section aria-label="Wallet and authentication status">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#0c0c12]/90 p-4 backdrop-blur-md">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-xs uppercase tracking-wider text-zinc-400">
              Wallet Status:
            </span>
            {account ? (
              <span className="font-mono text-xs text-[#ffc53d]">
                {truncateAddress(account)}
              </span>
            ) : (
              <span className="font-mono text-xs text-zinc-500">
                Not connected
              </span>
            )}
            {account && sessionActive ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-emerald-400">
                <CheckCircle2 className="h-3 w-3" />
                SIWE Session Active
              </span>
            ) : account ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 font-mono text-[11px] text-amber-300">
                SIWE Signature Pending
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {!account ? (
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="pill-btn hot text-xs"
              >
                <span>Connect Wallet →</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={signingIn}
                onClick={() => void forceReSignSiwe()}
                className="pill-btn text-xs hover:border-[#ffc53d]/50 cursor-pointer"
                title="Trigger a fresh personal_sign SIWE request in your wallet"
              >
                <span>
                  {signingIn ? "Waiting for Wallet…" : "✍️ Test SIWE Signature"}
                </span>
              </button>
            )}
          </div>
        </div>
      </section>

      {account && checkingSaved ? (
        <Card>
          <p className="font-mono text-xs uppercase tracking-widest text-zinc-400">
            Checking your saved calibration…
          </p>
        </Card>
      ) : null}

      {!checkingSaved && alreadyPassed && !graded ? (
        <Card className="border-emerald-500/50 bg-gradient-to-b from-emerald-950/25 via-[#0c0c12] to-[#070709] shadow-[0_0_40px_rgba(16,185,129,0.15)]">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/50 bg-emerald-500/15 px-4 py-1.5 font-mono text-xs font-semibold text-emerald-400 shadow-[0_0_24px_rgba(16,185,129,0.25)]">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>CALIBRATION PASSED · JUROR ELIGIBLE</span>
          </div>
          <p className="display-serif mt-4 text-3xl text-white" role="status">
            Calibration Already Passed
          </p>
          <p className="mt-2 text-sm text-zinc-300">
            This wallet{account ? ` (${truncateAddress(account)})` : ""} is
            already calibrated into the Crowd — no need to retake the quiz. You are eligible to cast blind verdicts. Any reward depends on verified USDG funding and settlement; it is not guaranteed.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/app?tab=crowd" className="pill-btn hot">
              <span>Enter Crowd Jury Console →</span>
            </Link>
          </div>
        </Card>
      ) : null}

      {!checkingSaved && showSignInGate ? (
        <Card hot>
          <p className="display-serif text-3xl text-white">
            Sign in to check your saved result.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            This wallet is connected, but its signed session is missing or
            expired. Without it we cannot tell whether you already passed — and
            we will not make you retake ten cases just because a session
            expired.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={signingIn}
              onClick={() => void signInAndCheck()}
              className="pill-btn hot disabled:opacity-50"
            >
              <span>{signingIn ? "Signing in…" : "Sign In with Wallet →"}</span>
            </button>
            <button
              type="button"
              onClick={() => setAllowQuizWithoutSession(true)}
              className="pill-btn"
            >
              <span>Take quiz without saving</span>
            </button>
          </div>
          {error ? (
            <p className="mt-3 font-mono text-xs text-rose-400" role="alert">
              {error}
            </p>
          ) : null}
        </Card>
      ) : null}

      {!checkingSaved &&
      !showSignInGate &&
      !(alreadyPassed && !graded) ? (
        <>
          <ol className="space-y-5">
        {QUIZ.map((q, i) => {
          const v = votes[i];
          const f = fair[i];
          const exp = expectedKey?.[i];
          const gradedWrong =
            graded && exp != null && !(v === exp.correct && (f ?? null) === exp.fair);
          return (
            <li key={i}>
              <Card className={gradedWrong ? "border-rose-500/50" : ""}>
                <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-[#ffc53d]">
                  <span>
                    Case {i + 1} of {QUIZ.length}
                  </span>
                  {graded ? (
                    <Stamp tone={gradedWrong ? "red" : "green"}>
                      {gradedWrong ? "Missed ✗" : "Correct ✓"}
                    </Stamp>
                  ) : null}
                </div>
                <p className="display-serif mt-3 text-2xl text-white">
                  “{q.scenario}”
                </p>
                <p className="mt-2 font-mono text-xs uppercase tracking-widest text-zinc-400">
                  {q.question}
                </p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {(["A", "B"] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      disabled={graded}
                      onClick={() => setVotes((s) => ({ ...s, [i]: opt }))}
                      aria-pressed={v === opt}
                      className={`rounded-xl border p-4 text-left text-sm transition cursor-pointer ${
                        v === opt
                          ? "border-[#ffc53d] bg-[#ffc53d]/12 text-white"
                          : "border-white/10 bg-[#070709] text-zinc-300 hover:border-white/25"
                      }`}
                    >
                      <span className="mr-2 font-mono font-bold text-[#ffc53d]">
                        {opt}
                      </span>
                      {opt === "A" ? q.a : q.b}
                    </button>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-2.5">
                  {([true, false] as const).map((val) => (
                    <button
                      key={String(val)}
                      type="button"
                      disabled={graded}
                      onClick={() => setFair((s) => ({ ...s, [i]: val }))}
                      aria-pressed={f === val}
                      className={`pill-btn cursor-pointer ${f === val ? "hot" : ""}`}
                    >
                      <span>{val ? "Fair Bit" : "Unfair Trick"}</span>
                    </button>
                  ))}
                </div>
                {graded && gradedWrong && exp ? (
                  <p className="mt-3 font-mono text-xs text-[#ffc53d]">
                    Expected: {exp.correct} · {exp.fair ? "Fair" : "Unfair"}
                  </p>
                ) : null}
              </Card>
            </li>
          );
        })}
      </ol>

      <div>
        {!graded ? (
          <button
            type="button"
            disabled={!answered || saving}
            aria-busy={saving}
            onClick={() => void handleSubmit()}
            className="pill-btn hot disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            style={{ padding: "14px 28px", fontSize: "12px" }}
          >
            <span>
              {saving ? "Grading your answers…" : "Submit Calibration Quiz →"}
            </span>
          </button>
        ) : (
          <div
            className={`editorial-card transition-all duration-300 ${
              score >= PASS_MARK
                ? "border-emerald-500/50 bg-gradient-to-b from-emerald-950/25 via-[#0c0c12] to-[#070709] shadow-[0_0_40px_rgba(16,185,129,0.2)]"
                : "border-rose-500/40 bg-gradient-to-b from-rose-950/20 via-[#0c0c12] to-[#070709]"
            }`}
          >
            {score >= PASS_MARK ? (
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/50 bg-emerald-500/20 px-3.5 py-1.5 font-mono text-xs font-semibold text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>CALIBRATION PASSED · JUROR ELIGIBLE</span>
                </div>
                <span className="font-mono text-xs uppercase tracking-widest text-emerald-400 font-semibold">
                  Score: {score} / {QUIZ.length} (Passing: 8+)
                </span>
              </div>
            ) : null}

            <p className="display-serif text-3xl text-white" role="status">
              {score} / {QUIZ.length} —{" "}
              {score >= PASS_MARK
                ? "Welcome to the Crowd."
                : "Not quite — review & retry."}
            </p>
            <p className="mt-2 text-sm text-zinc-300 leading-relaxed">
              {score >= PASS_MARK
                ? savedServer
                  ? `Recorded for ${account ? truncateAddress(account) : "your wallet"}. Your juror credentials are active. You can now judge eligible Crowd assignments. Any reward depends on verified USDG funding and settlement.`
                  : "You passed the calibration! Sign the SIWE session with your wallet to save your juror credential."
                : `You need at least ${PASS_MARK} out of 10 to pass. Review the corrections above and retake it.`}
            </p>

            {score >= PASS_MARK ? (
              <div className="mt-5 flex flex-wrap gap-3">
                {!savedServer ? (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      if (!account) {
                        setModalOpen(true);
                        return;
                      }
                      void recordPassOnServer();
                    }}
                    className="pill-btn hot cursor-pointer"
                  >
                    <span>
                      {saving
                        ? "✍️ Prompting Wallet Signature (SIWE)…"
                        : account
                          ? "✍️ Sign SIWE & Save Juror Credential"
                          : "Connect Wallet to Save Pass"}
                    </span>
                  </button>
                ) : (
                  <Link href="/app?tab=crowd" className="pill-btn hot">
                    <span>Enter Crowd Jury Console →</span>
                  </Link>
                )}

                {account ? (
                  <button
                    type="button"
                    disabled={signingIn}
                    onClick={() => void forceReSignSiwe()}
                    className="pill-btn cursor-pointer"
                  >
                    <span>{signingIn ? "Signing…" : "Test Wallet Signature (Re-sign SIWE)"}</span>
                  </button>
                ) : null}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setVotes({});
                  setFair({});
                  setGraded(false);
                  setScore(0);
                  setSavedServer(false);
                  setExpectedKey(null);
                  setError(null);
                }}
                className="pill-btn hot mt-4 cursor-pointer"
              >
                <span>↻ Retake Quiz</span>
              </button>
            )}
            {error ? (
              <p className="mt-3 font-mono text-xs text-rose-400" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        )}
      </div>
      {error && !graded ? (
        <p
          className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3.5 font-mono text-xs text-rose-200"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      </>
      ) : null}

      <WalletModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConnected={(accs) => {
          const w = accs[0] ?? null;
          setAccount(w);
          if (w && graded && score >= PASS_MARK) {
            void recordPassOnServer();
          }
        }}
      />
      <Disclaimer />
      </div>
    </div>
  );
}
