"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, Disclaimer, Stamp } from "@/components/ui";
import WalletModal from "@/components/WalletModal";
import {
  authHeaders,
  ensureSiweSession,
  getSharedWalletState,
  subscribeWalletState,
  truncateAddress,
} from "@/lib/wallets";

const SCENARIO_MAX = 600;
const QUESTION_MAX = 200;

type CategoryId = "punchline" | "subtext" | "irl" | "double_meaning";
type StageKind = "open_mic" | "pro";

const CATEGORIES: {
  id: CategoryId;
  num: string;
  name: string;
  sub: string;
  prompt: string;
}[] = [
  {
    id: "punchline",
    num: "SET 01",
    name: "Punchline",
    sub: "Expectation Flip",
    prompt: "Why is this funny? / What's the punchline?",
  },
  {
    id: "subtext",
    num: "SET 02",
    name: "Subtext",
    sub: "Polite vs. Real",
    prompt: "What do they actually feel / mean?",
  },
  {
    id: "irl",
    num: "SET 03",
    name: "IRL",
    sub: "Physical World",
    prompt: "What is wrong / what happens here?",
  },
  {
    id: "double_meaning",
    num: "SET 04",
    name: "Double Meaning",
    sub: "Two Readings",
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
  const router = useRouter();
  const [category, setCategory] = useState<CategoryId>("punchline");
  const [stageKind, setStageKind] = useState<StageKind>("open_mic");
  const [scenario, setScenario] = useState("");
  const [question, setQuestion] = useState(
    "Why is this funny? / What's the punchline?",
  );
  const [ideaIndex, setIdeaIndex] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createdBitId, setCreatedBitId] = useState<string | null>(null);
  const [crisisSupport, setCrisisSupport] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const st = getSharedWalletState();
    if (st.account) setAccount(st.account);
    return subscribeWalletState((next) => setAccount(next.account));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const rawCat = params.get("category")?.toLowerCase();
    if (
      rawCat === "punchline" ||
      rawCat === "subtext" ||
      rawCat === "irl" ||
      rawCat === "double_meaning"
    ) {
      setCategory(rawCat);
      const found = CATEGORIES.find((c) => c.id === rawCat);
      if (found) setQuestion(found.prompt);
    }
  }, []);

  const ideas = useMemo(() => IDEAS[category], [category]);
  const idea = ideas[ideaIndex % ideas.length] ?? "";

  const scenarioLeft = SCENARIO_MAX - scenario.length;
  const questionLeft = QUESTION_MAX - question.length;
  const valid =
    scenario.trim().length > 0 &&
    question.trim().length > 0 &&
    scenario.length <= SCENARIO_MAX &&
    question.length <= QUESTION_MAX;

  async function handleSubmit() {
    if (!valid || submitting) return;
    setError(null);
    setCrisisSupport(false);
    setCreatedBitId(null);

    const st = getSharedWalletState();
    if (!st.account) {
      setModalOpen(true);
      return;
    }

    setSubmitting(true);
    try {
      const siwe = await ensureSiweSession(st.provider, st.account);
      if (!siwe.ok) {
        setError(siwe.error ?? "Please sign in with your wallet first.");
        return;
      }

      const res = await fetch("/api/bits", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...authHeaders(siwe.sessionToken),
        },
        body: JSON.stringify({
          wallet: siwe.wallet ?? st.account,
          category,
          stage: stageKind,
          scenario: scenario.trim(),
          question: question.trim(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        id?: string;
        status?: string;
        reject_reason?: string;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? `Failed to submit bit (${res.status}).`);
        return;
      }
      if (
        data.status === "rejected_prescreen" &&
        data.reject_reason === "crisis_support"
      ) {
        setCrisisSupport(true);
        return;
      }
      if (data.id) {
        setCreatedBitId(data.id);
        router.push(`/bit/${encodeURIComponent(data.id)}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit bit.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1440px] px-[clamp(20px,4vw,56px)] pt-28 pb-16">
      {/* Editorial Case Header */}
      <div className="mb-14 grid gap-10 border-b border-[#efe8dc]/12 pb-12 lg:grid-cols-[1.25fr_1fr] lg:items-end">
        <div>
          <span className="eyebrow">The Stage · Live Performance</span>
          <h1 className="display-serif mt-4 text-5xl text-[#fff6ed] md:text-7xl">
            Walk up to the <em>mic.</em>
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-[#a49b8e]">
            Pick a comedy set, paint the scene, and ask the Straight Man one
            sharp question. If it answers with literal confidence and the Crowd
            laughs, you earn tonight&apos;s Tip Jar share.
          </p>
        </div>

        <dl className="case-meta-grid">
          <div>
            <dt>Open Mic</dt>
            <dd>Free · 5 bits / day · 1.0× reward weight</dd>
          </div>
          <div>
            <dt>Pro Stage</dt>
            <dd>$0.10 credit · 2.5× reward weight · Full AI</dd>
          </div>
          <div>
            <dt>Quorum</dt>
            <dd>7–9 staked human judges verify every stumper</dd>
          </div>
          <div>
            <dt>Performer</dt>
            <dd className="font-mono text-xs text-[#ffb13b]">
              {account ? truncateAddress(account) : "Wallet not connected"}
            </dd>
          </div>
        </dl>
      </div>

      {/* Category Radio Cards */}
      <section aria-label="Pick a category" className="mb-10">
        <div className="mb-3 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.16em] text-[#a49b8e]">
          <span>Step 01 · Choose Your Set</span>
          <span>4 Categories</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIES.map((c) => {
            const active = c.id === category;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setCategory(c.id);
                  setIdeaIndex(0);
                  if (
                    !question.trim() ||
                    CATEGORIES.some((cat) => cat.prompt === question)
                  ) {
                    setQuestion(c.prompt);
                  }
                }}
                aria-pressed={active}
                className={`editorial-card text-left transition ${
                  active ? "hot" : ""
                }`}
              >
                <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-[#a49b8e]">
                  <span>{c.num}</span>
                  <span className={active ? "text-[#ffb13b]" : ""}>
                    {active ? "● Selected" : c.sub}
                  </span>
                </div>
                <h2 className="display-serif mt-3 text-3xl text-[#fff6ed]">
                  {c.name}
                </h2>
                <p className="mt-2 font-mono text-[11px] leading-relaxed text-[#a49b8e]">
                  {c.prompt}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Main Stage Editor + Inspiration Drawer */}
      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
        <section aria-label="Write your bit">
          <Card>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[#efe8dc]/10 pb-5">
              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => setStageKind("open_mic")}
                  className={`pill-btn ${
                    stageKind === "open_mic" ? "hot" : ""
                  }`}
                >
                  <span>Open Mic · 1.0× (Free)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStageKind("pro")}
                  className={`pill-btn ${stageKind === "pro" ? "hot" : ""}`}
                >
                  <span>Pro Stage · 2.5× (Full Playbook)</span>
                </button>
              </div>

              {account ? (
                <Stamp tone="green">Mic Live · {truncateAddress(account)}</Stamp>
              ) : (
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="pill-btn"
                >
                  <span>Connect Wallet</span>
                </button>
              )}
            </div>

            <div>
              <div className="flex items-baseline justify-between">
                <label
                  htmlFor="scenario"
                  className="font-mono text-xs uppercase tracking-[0.16em] text-[#ffb13b]"
                >
                  Step 02 · Paint the Scene / Setup
                </label>
                <span
                  className={`font-mono text-[11px] tabular-nums ${
                    scenarioLeft < 0 ? "text-[#c93b2b]" : "text-[#a49b8e]"
                  }`}
                >
                  {scenario.length} / {SCENARIO_MAX}
                </span>
              </div>
              <textarea
                id="scenario"
                rows={5}
                value={scenario}
                maxLength={SCENARIO_MAX + 50}
                onChange={(e) => setScenario(e.target.value)}
                placeholder="Drop the setup, the passive-aggressive message, or the real-world moment…"
                className="mt-2.5 w-full rounded-xl border border-[#efe8dc]/15 bg-[#0c0a08] p-4 font-serif text-xl leading-relaxed text-[#fff6ed] placeholder:text-[#6c6459] focus:border-[#ffb13b] focus:outline-none"
              />
            </div>

            <div className="mt-6">
              <div className="flex items-baseline justify-between">
                <label
                  htmlFor="question"
                  className="font-mono text-xs uppercase tracking-[0.16em] text-[#ffb13b]"
                >
                  Step 03 · Ask the Straight Man One Question
                </label>
                <span
                  className={`font-mono text-[11px] tabular-nums ${
                    questionLeft < 0 ? "text-[#c93b2b]" : "text-[#a49b8e]"
                  }`}
                >
                  {question.length} / {QUESTION_MAX}
                </span>
              </div>
              <textarea
                id="question"
                rows={2}
                value={question}
                maxLength={QUESTION_MAX + 50}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask the one question the Straight Man must answer…"
                className="mt-2.5 w-full rounded-xl border border-[#efe8dc]/15 bg-[#0c0a08] p-4 text-base text-[#fff6ed] placeholder:text-[#6c6459] focus:border-[#ffb13b] focus:outline-none"
              />
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
              <button
                type="button"
                disabled={!valid || submitting}
                onClick={() => void handleSubmit()}
                className="pill-btn hot disabled:cursor-not-allowed disabled:opacity-40"
                style={{ padding: "14px 28px", fontSize: "12px" }}
              >
                <span>
                  {submitting
                    ? "Performing for the Straight Man…"
                    : account
                      ? "🎤 Perform Bit on Stage →"
                      : "🎤 Connect Wallet & Take the Stage →"}
                </span>
              </button>

              <Link
                href="/producers"
                className="font-mono text-[11px] uppercase tracking-[0.15em] text-[#a49b8e] underline hover:text-[#ffb13b]"
              >
                Need Pro Stage credits? →
              </Link>
            </div>

            {crisisSupport ? (
              <div
                className="mt-5 rounded-xl border border-[#ffb13b]/40 bg-[#ffb13b]/10 p-4 text-sm text-[#fff6ed]"
                role="alert"
              >
                <p className="font-semibold">You are not alone.</p>
                <p className="mt-1 text-xs leading-relaxed text-[#efe8dc]">
                  If you or someone you know is going through a difficult time
                  or having thoughts of self-harm, please reach out for free,
                  confidential support right now: call or text{" "}
                  <span className="font-mono font-semibold">988</span> (US &amp;
                  Canada), or visit{" "}
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
            ) : null}

            {createdBitId ? (
              <p
                className="mt-5 rounded-xl border border-[#8fb596]/40 bg-[#8fb596]/10 p-3.5 text-sm text-[#fff6ed]"
                role="status"
              >
                Bit submitted!{" "}
                <Link
                  href={`/bit/${encodeURIComponent(createdBitId)}`}
                  className="font-semibold text-[#ffb13b] underline"
                >
                  Open bit #{createdBitId} →
                </Link>
              </p>
            ) : null}

            {error ? (
              <p
                className="mt-5 rounded-xl border border-[#c93b2b]/40 bg-[#c93b2b]/15 p-3.5 text-sm text-[#ffb13b]"
                role="alert"
              >
                {error}
              </p>
            ) : null}

            <p className="mt-6 border-t border-[#efe8dc]/10 pt-4 font-mono text-[10px] uppercase tracking-[0.14em] leading-relaxed text-[#6c6459]">
              By performing on stage you license your bit and answer to HAHA
              Labs for evaluation, Season training, and The Joke Vault.
            </p>
          </Card>
        </section>

        {/* Sticky Inspiration & House Rules Drawer */}
        <aside aria-label="Need ideas?" className="space-y-4 lg:sticky lg:top-24">
          <Card>
            <div className="flex items-center justify-between">
              <span className="eyebrow">Green Room · Prompts</span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#a49b8e]">
                {category.toUpperCase()}
              </span>
            </div>
            <p className="display-serif mt-4 text-2xl leading-snug text-[#fff6ed]">
              “{idea}”
            </p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => setIdeaIndex((i) => i + 1)}
                className="pill-btn"
              >
                <span>↻ Shuffle Idea</span>
              </button>
              <button
                type="button"
                onClick={() => setScenario(idea)}
                className="pill-btn hot"
              >
                <span>Use as Starter</span>
              </button>
            </div>

            <div className="mt-6 border-t border-[#efe8dc]/10 pt-5">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#a49b8e]">
                Fill-in-the-blank Starters
              </span>
              <ul className="mt-3 space-y-2">
                {TEMPLATES.map((t) => (
                  <li key={t}>
                    <button
                      type="button"
                      onClick={() => setScenario(t)}
                      className="w-full rounded-xl border border-[#efe8dc]/10 bg-[#0c0a08]/70 p-3 text-left font-mono text-xs leading-relaxed text-[#efe8dc] transition hover:border-[#ffb13b] hover:text-[#ffb13b]"
                    >
                      {t}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          <Card>
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between font-mono text-xs uppercase tracking-[0.16em] text-[#efe8dc]">
                <span>What makes a good bit · 5 House Rules</span>
                <span className="text-[#ffb13b] transition group-open:rotate-45">
                  +
                </span>
              </summary>
              <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-[#a49b8e]">
                {RULES.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ol>
            </details>
          </Card>
        </aside>
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
