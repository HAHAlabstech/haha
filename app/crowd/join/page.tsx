"use client";

import { useState } from "react";
import { Card, Disclaimer, PageHero } from "@/components/ui";

interface QuizItem {
  scenario: string;
  question: string;
  a: string;
  b: string;
  correct: "A" | "B";
  fair: boolean;
}

// 10 onboarding questions with known answers. Pass mark: 8/10.
const QUIZ: QuizItem[] = [
  {
    scenario: "I told my plants I'd water them every day. Now they're dead and they didn't even leave a note.",
    question: "What's the joke?",
    a: "The narrator is sad about a breakup and the plants symbolize lost love.",
    b: "It treats dead plants like a dramatic human farewell (“didn't leave a note”) while the cause is the narrator's broken promise.",
    correct: "B",
    fair: true,
  },
  {
    scenario: "You cancel dinner for the third time this month. Your friend replies: “No worries at all!! Totally get it 😊 Maybe next year haha.”",
    question: "How does your friend actually feel?",
    a: "Completely fine and understanding — the smiley proves it.",
    b: "Hurt and fed up; the over-cheerful tone and “next year” are passive-aggressive.",
    correct: "B",
    fair: true,
  },
  {
    scenario: "A guest arrives exactly on time. The host opens the door wearing a towel, hair wet.",
    question: "What does this tell you about the party?",
    a: "The host is rude and didn't want guests at all.",
    b: "Guests are expected fashionably late — the on-time guest is effectively early.",
    correct: "B",
    fair: true,
  },
  {
    scenario: "“I saw the man with the binoculars.”",
    question: "Who has the binoculars?",
    a: "Obviously the man — grammar always resolves this.",
    b: "Genuinely ambiguous without context; either the speaker used them or the man had them.",
    correct: "B",
    fair: true,
  },
  {
    scenario: "My grandpa said my generation relies too much on technology. So I unplugged his…",
    question: "Finish the punchline.",
    a: "…phone charger, to prove a point about screen time.",
    b: "…life support. The shock turn from a generational argument into something dark is the joke.",
    correct: "B",
    fair: true,
  },
  {
    scenario: "How many R's are in “strawberry”?",
    question: "Is this a fair bit?",
    a: "Yes — it's a clean test of careful reading.",
    b: "No — it's a token-counting trick, not human understanding.",
    correct: "B",
    fair: false,
  },
  {
    scenario: "What's my dog's name? He barked at the mailman yesterday and it was hilarious.",
    question: "Is this a fair bit?",
    a: "Yes — the barking detail makes the answer guessable.",
    b: "No — it needs private info only the sender knows.",
    correct: "B",
    fair: false,
  },
  {
    scenario: "A hospital parking sign: “Visitors who are not patients are not permitted to park here.”",
    question: "Who can park here?",
    a: "Only patients (and possibly staff); non-patient visitors must park elsewhere.",
    b: "Any visitor — signs like this are never enforced.",
    correct: "A",
    fair: true,
  },
  {
    scenario: "After a long silence at dinner, your mom says, “It's fine. I'll just do the dishes myself. Like always.”",
    question: "Is it fine?",
    a: "Yes — she said it's fine and only tonight's dishes matter.",
    b: "No — “like always” reveals a long-standing grievance about unequal effort.",
    correct: "B",
    fair: true,
  },
  {
    scenario: "A job ad: “We work hard and play hard. We're a family here.”",
    question: "What is the ad really saying?",
    a: "It's a warm, supportive workplace that values fun and belonging.",
    b: "Expect long hours and blurred boundaries; “family” signals loyalty pressure beyond the job.",
    correct: "B",
    fair: true,
  },
];

const PASS_MARK = 8;

export default function CrowdJoinPage() {
  const [votes, setVotes] = useState<Record<number, "A" | "B">>({});
  const [fair, setFair] = useState<Record<number, boolean>>({});
  const [graded, setGraded] = useState(false);

  const score = QUIZ.reduce((n, q, i) => {
    const okVote = votes[i] === q.correct;
    const okFair = (fair[i] ?? null) === q.fair;
    return n + (okVote && okFair ? 1 : 0);
  }, 0);
  const answered = Object.keys(votes).length === QUIZ.length &&
    Object.keys(fair).length === QUIZ.length;

  return (
    <div className="space-y-8">
      <PageHero
        kicker="Join the Crowd"
        title="The onboarding quiz."
        lede={`Ten cases with known answers. Get at least ${PASS_MARK} out of 10 — both the winner and the fairness call must be right to score a point.`}
      />

      <ol className="space-y-4">
        {QUIZ.map((q, i) => {
          const v = votes[i];
          const f = fair[i];
          const gradedWrong =
            graded &&
            !(v === q.correct && (f ?? null) === q.fair);
          return (
            <li key={i}>
              <Card className={gradedWrong ? "border-red-300/30" : ""}>
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-300/80">
                  Case {i + 1} of {QUIZ.length}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-zinc-100">
                  {q.scenario}
                </p>
                <p className="mt-1 text-sm font-medium text-amber-50">
                  {q.question}
                </p>
                <div className="mt-3 grid gap-2">
                  {(["A", "B"] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      disabled={graded}
                      onClick={() => setVotes((s) => ({ ...s, [i]: opt }))}
                      aria-pressed={v === opt}
                      className={`rounded-xl border p-3 text-left text-sm transition ${
                        v === opt
                          ? "border-amber-300/60 bg-amber-300/10 text-amber-50"
                          : "border-white/10 bg-black/30 text-zinc-300 hover:border-white/25"
                      }`}
                    >
                      <span className="mr-2 font-mono font-bold">{opt}</span>
                      {opt === "A" ? q.a : q.b}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  {([true, false] as const).map((val) => (
                    <button
                      key={String(val)}
                      type="button"
                      disabled={graded}
                      onClick={() => setFair((s) => ({ ...s, [i]: val }))}
                      aria-pressed={f === val}
                      className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
                        f === val
                          ? "bg-amber-300 text-black"
                          : "border border-white/15 text-zinc-300 hover:bg-white/5"
                      }`}
                    >
                      {val ? "Fair" : "Unfair"}
                    </button>
                  ))}
                </div>
                {graded && gradedWrong ? (
                  <p className="mt-2 text-xs text-red-200">
                    Correct: {q.correct} · {q.fair ? "Fair" : "Unfair"}
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
            onClick={() => setGraded(true)}
            className="rounded-full bg-amber-300 px-6 py-3 text-sm font-semibold text-black hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Submit answers
          </button>
        ) : (
          <Card
            className={
              score >= PASS_MARK
                ? "border-emerald-300/30 bg-emerald-400/5"
                : "border-red-300/30 bg-red-400/5"
            }
          >
            <p className="text-lg font-semibold text-amber-50" role="status">
              {score} / {QUIZ.length} —{" "}
              {score >= PASS_MARK ? "Welcome to the Crowd. 🎤" : "Not yet — try again."}
            </p>
            <p className="mt-1 text-sm text-zinc-300">
              {score >= PASS_MARK
                ? "You passed the demo quiz. On the live site this unlocks jury assignments once stake and verification are checked."
                : `You need at least ${PASS_MARK} to pass. Review the corrections above and retake it.`}
            </p>
            {score < PASS_MARK ? (
              <button
                type="button"
                onClick={() => {
                  setVotes({});
                  setFair({});
                  setGraded(false);
                }}
                className="mt-3 rounded-full border border-amber-200/30 px-5 py-2 text-sm text-amber-100 hover:bg-amber-300/10"
              >
                Retake the quiz
              </button>
            ) : null}
          </Card>
        )}
      </div>

      <Disclaimer />
    </div>
  );
}
