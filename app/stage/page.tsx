"use client";

import { useMemo, useState } from "react";
import { Card, Disclaimer, PageHero } from "@/components/ui";

const SCENARIO_MAX = 600;
const QUESTION_MAX = 200;

type CategoryId = "punchline" | "subtext" | "irl" | "double_meaning";

const CATEGORIES: {
  id: CategoryId;
  icon: string;
  name: string;
  prompt: string;
}[] = [
  {
    id: "punchline",
    icon: "🎤",
    name: "Punchline",
    prompt: "Why is this funny? / What's the punchline?",
  },
  {
    id: "subtext",
    icon: "💬",
    name: "Subtext",
    prompt: "What do they actually feel / mean?",
  },
  {
    id: "irl",
    icon: "🌍",
    name: "IRL",
    prompt: "What is wrong / what happens here?",
  },
  {
    id: "double_meaning",
    icon: "🔀",
    name: "Double Meaning",
    prompt: "What does this really mean in context?",
  },
];

const IDEAS: Record<CategoryId, string[]> = {
  punchline: [
    "My plants died and didn't even leave a note. What's the joke?",
    "A “self-help” book where every page says “you're on your own.” Explain it.",
    "A man asks a librarian for a book on paranoia. She whispers, “It's right behind you.” Why does it land?",
  ],
  subtext: [
    "“No worries at all!! Totally get it 😊 Maybe next year haha.” How do they actually feel?",
    "“It's fine. I'll just do the dishes myself. Like always.” Is it fine?",
    "“Great meeting. Love how we always go with the safest option.” What is your coworker feeling?",
  ],
  irl: [
    "A cheap umbrella bought from a street vendor during a typhoon, carried across an open bridge. What happens?",
    "A full glass of water on a car dashboard; the driver brakes hard. Where does the water go?",
    "Eight plates and a full pot of soup carried “in one trip, to save time.” What happens next?",
  ],
  double_meaning: [
    "Hospital parking sign: “Visitors who are not patients may not park here.” Who can park here?",
    "“I saw the man with the binoculars.” Who has the binoculars — and how would you know?",
    "Job ad: “We work hard and play hard. We're a family here.” What is it really saying?",
  ],
};

const TEMPLATES = [
  "My ___ told me to ___. I did. Now ___. → Why is this funny?",
  "Someone replies “___” with a 😊 after you ___. How do they actually feel?",
  "You ___ while ___. What realistically happens next?",
  "A sign / ad / message says: “___”. What does it really mean?",
];

const RULES = [
  "It makes sense: once explained, most people say “oh, right.”",
  "A stranger could get it — no private info only you know.",
  "No cheap tricks: no spelling games, letter-counting, or gotchas without meaning.",
  "No real people: no names or details of actual individuals.",
  "No harm: no hate, explicit content, or graphic violence.",
];

export default function StagePage() {
  const [category, setCategory] = useState<CategoryId>("punchline");
  const [scenario, setScenario] = useState("");
  const [question, setQuestion] = useState("");
  const [ideaIndex, setIdeaIndex] = useState(0);
  const [showRules, setShowRules] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const ideas = useMemo(() => IDEAS[category], [category]);
  const idea = ideas[ideaIndex % ideas.length] ?? "";

  const scenarioLeft = SCENARIO_MAX - scenario.length;
  const questionLeft = QUESTION_MAX - question.length;
  const valid =
    scenario.trim().length > 0 &&
    question.trim().length > 0 &&
    scenario.length <= SCENARIO_MAX &&
    question.length <= QUESTION_MAX;

  return (
    <div className="space-y-8">
      <PageHero
        kicker="The Stage"
        title="Take the stage."
        lede="Pick a category, set the scene, and ask the Straight Man one sharp question. Open Mic is free — 5 bits a day."
      />

      <section aria-label="Pick a category">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIES.map((c) => {
            const active = c.id === category;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setCategory(c.id);
                  setIdeaIndex(0);
                }}
                aria-pressed={active}
                className={`rounded-2xl border p-5 text-left transition ${
                  active
                    ? "border-amber-300/60 bg-amber-300/10 shadow-[0_0_32px_rgba(251,191,36,0.15)]"
                    : "border-white/10 bg-white/[0.03] hover:border-white/25"
                }`}
              >
                <p className="text-2xl" aria-hidden>
                  {c.icon}
                </p>
                <p className="mt-2 font-semibold text-amber-50">{c.name}</p>
                <p className="mt-1 text-xs text-zinc-400">{c.prompt}</p>
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section aria-label="Write your bit">
          <Card>
            <label
              htmlFor="scenario"
              className="text-sm font-semibold text-amber-50"
            >
              The scene{" "}
              <span className="font-normal text-zinc-500">
                (max {SCENARIO_MAX} characters)
              </span>
            </label>
            <textarea
              id="scenario"
              rows={5}
              value={scenario}
              maxLength={SCENARIO_MAX + 50}
              onChange={(e) => setScenario(e.target.value)}
              placeholder="Set the scene — the joke, the message, the moment…"
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 p-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-amber-300/60 focus:outline-none"
            />
            <p
              className={`mt-1 text-right text-xs ${scenarioLeft < 0 ? "text-red-300" : "text-zinc-500"}`}
            >
              {scenarioLeft} left
            </p>

            <label
              htmlFor="question"
              className="mt-4 block text-sm font-semibold text-amber-50"
            >
              The question{" "}
              <span className="font-normal text-zinc-500">
                (max {QUESTION_MAX} characters)
              </span>
            </label>
            <textarea
              id="question"
              rows={2}
              value={question}
              maxLength={QUESTION_MAX + 50}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask the one thing the Straight Man must answer…"
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 p-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-amber-300/60 focus:outline-none"
            />
            <p
              className={`mt-1 text-right text-xs ${questionLeft < 0 ? "text-red-300" : "text-zinc-500"}`}
            >
              {questionLeft} left
            </p>

            <button
              type="button"
              onClick={() => setShowRules((v) => !v)}
              aria-expanded={showRules}
              className="mt-3 text-sm text-zinc-300 underline hover:text-white"
            >
              {showRules ? "Hide" : "Show"} the rules of a good bit
            </button>
            {showRules ? (
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-zinc-300">
                {RULES.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ol>
            ) : null}

            <button
              type="button"
              disabled={!valid}
              onClick={() => setSubmitted(true)}
              className="mt-5 w-full rounded-full bg-amber-300 px-6 py-3 text-sm font-semibold text-black hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Take the stage 🎤
            </button>
            {submitted ? (
              <p className="mt-3 rounded-xl border border-emerald-300/20 bg-emerald-400/5 p-3 text-sm text-emerald-100" role="status">
                Bit drafted locally. Connect a wallet and submit — the
                Straight Man answers in a few seconds once the backend is
                live.
              </p>
            ) : null}
            <p className="mt-3 text-xs leading-relaxed text-zinc-500">
              By submitting you license your bit and answer to HAHA Labs for
              training, evaluation, and licensing to third parties.
            </p>
          </Card>
        </section>

        <aside aria-label="Need ideas?">
          <Card className="lg:sticky lg:top-24">
            <h2 className="font-semibold text-amber-50">Need ideas?</h2>
            <p className="mt-2 text-sm italic leading-relaxed text-zinc-300">
              “{idea}”
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setIdeaIndex((i) => i + 1)}
                className="rounded-full border border-amber-200/30 px-4 py-1.5 text-xs font-medium text-amber-100 hover:bg-amber-300/10"
              >
                Shuffle
              </button>
              <button
                type="button"
                onClick={() => setScenario(idea)}
                className="rounded-full border border-white/15 px-4 py-1.5 text-xs text-zinc-300 hover:bg-white/5"
              >
                Use as starter
              </button>
            </div>
            <h3 className="mt-5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Give me a template
            </h3>
            <ul className="mt-2 space-y-2">
              {TEMPLATES.map((t) => (
                <li key={t}>
                  <button
                    type="button"
                    onClick={() => setScenario(t)}
                    className="w-full rounded-lg bg-black/30 p-2 text-left text-xs leading-relaxed text-zinc-300 hover:bg-black/50"
                  >
                    {t}
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[11px] text-zinc-600">
              Examples are inspiration only — bits copied word-for-word are
              rejected as duplicates.
            </p>
          </Card>
        </aside>
      </div>

      <Disclaimer />
    </div>
  );
}
