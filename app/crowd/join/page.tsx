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

  useEffect(() => {
    const st = getSharedWalletState();
    if (st.account) setAccount(st.account);
    return subscribeWalletState((next) => setAccount(next.account));
  }, []);

  // If this wallet already passed calibration, skip the quiz entirely
  // (session-gated server status; no session -> quiz shown as before).
  useEffect(() => {
    let cancelled = false;
    if (!account) {
      setAlreadyPassed(null);
      return;
    }
    (async () => {
      try {
        const st = getSharedWalletState();
        const res = await fetch(
          `/api/crowd/onboarding?wallet=${encodeURIComponent(account)}`,
          { headers: st.sessionToken ? authHeaders(st.sessionToken) : undefined },
        );
        const d = (await res.json().catch(() => ({}))) as {
          status?: { onboarded?: boolean } | null;
        };
        if (!cancelled) {
          setAlreadyPassed(
            d.status ? d.status.onboarded === true : null,
          );
        }
      } catch {
        if (!cancelled) setAlreadyPassed(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [account]);

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
        correct?: number;
        expected?: ExpectedKeyItem[];
        error?: string;
      };
      if (res.ok) {
        if (typeof d.correct === "number") setScore(d.correct);
        if (Array.isArray(d.expected)) setExpectedKey(d.expected);
        setGraded(true);
        setSavedServer(true);
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

      {alreadyPassed && !graded ? (
        <Card hot>
          <p className="display-serif text-3xl text-white" role="status">
            Calibration already passed
          </p>
          <p className="mt-2 text-sm text-zinc-400">
            This wallet{account ? ` (${truncateAddress(account)})` : ""} is
            already calibrated into the Crowd — no need to retake the quiz.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/app?tab=crowd" className="pill-btn hot">
              <span>Enter Crowd Jury Console →</span>
            </Link>
          </div>
        </Card>
      ) : null}

      {!(alreadyPassed && !graded) ? (
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
                      {gradedWrong ? "Missed" : "Correct"}
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
            disabled={!answered}
            onClick={() => void handleSubmit()}
            className="pill-btn hot disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            style={{ padding: "14px 28px", fontSize: "12px" }}
          >
            <span>Submit Calibration Quiz →</span>
          </button>
        ) : (
          <Card hot={score >= PASS_MARK}>
            <p className="display-serif text-3xl text-white" role="status">
              {score} / {QUIZ.length} —{" "}
              {score >= PASS_MARK
                ? "Welcome to the Crowd."
                : "Not quite — review & retry."}
            </p>
            <p className="mt-2 text-sm text-zinc-400">
              {score >= PASS_MARK
                ? savedServer
                  ? `Recorded for ${account ? truncateAddress(account) : "your wallet"}. You can now judge live Crowd assignments!`
                  : "You passed the calibration quiz. Connect and sign with your wallet to unlock live jury assignments."
                : `You need at least ${PASS_MARK} to pass. Review the corrections above and retake it.`}
            </p>

            {score >= PASS_MARK ? (
              <div className="mt-5 flex flex-wrap gap-3">
                {!savedServer ? (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      if (!account) setModalOpen(true);
                      else void recordPassOnServer();
                    }}
                    className="pill-btn hot cursor-pointer"
                  >
                    <span>
                      {saving
                        ? "Recording on server…"
                        : account
                          ? "Save Pass to Wallet"
                          : "Connect Wallet to Save Pass"}
                    </span>
                  </button>
                ) : null}
                <Link href="/app?tab=crowd" className="pill-btn hot">
                  <span>Enter Crowd Jury Console →</span>
                </Link>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setVotes({});
                  setFair({});
                  setGraded(false);
                  setScore(0);
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
          </Card>
        )}
      </div>
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
