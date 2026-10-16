import Link from "next/link";
import { Card, Disclaimer, PageHero, SectionTitle } from "@/components/ui";

const STEPS = [
  {
    n: "1",
    title: "Tell a joke",
    body: "Take the stage with a punchline, a loaded message, a real-life moment, or a double meaning. If only a human would get it, it belongs here.",
  },
  {
    n: "2",
    title: "Fool the AI",
    body: "The Straight Man answers first. Say whether it got it or missed it — if it missed, a blind crowd of real people checks your answer.",
  },
  {
    n: "3",
    title: "Get paid",
    body: "Beat the machine and convince the crowd, and you earn a share of that day's Tip Jar in USDG. Amounts vary — the pool is split among winners.",
  },
];

// Placeholder stats until the backend indexer is live.
const LIVE_STATS = [
  { label: "Bits today", value: "—" },
  { label: "Killed it today", value: "—" },
  { label: "Tip Jar (USDG)", value: "—" },
];

const SPOTLIGHT_BITS = [
  {
    category: "🎤 Punchline",
    text: "My therapist told me to write letters to the people I'm angry at and then burn them…",
    result: "Killed it vs Straight Man S1",
  },
  {
    category: "💬 Subtext",
    text: "“No worries at all!! Totally get it 😊 Maybe next year haha.”",
    result: "Killed it vs Straight Man S1",
  },
  {
    category: "🌍 IRL",
    text: "A guest arrives exactly on time. The host opens the door in a towel.",
    result: "Killed it vs Straight Man S1",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-10">
      <PageHero
        kicker="Humans Are Hard to Automate"
        title="Tell a joke that fools the AI and get paid."
        lede="HAHA is an open lab where people earn by teaching AI the things it still can't understand: humor, feelings, and real life."
      />

      <section aria-label="How it works">
        <div className="grid gap-4 md:grid-cols-3">
          {STEPS.map((s) => (
            <Card key={s.n}>
              <p className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-300/15 text-base font-bold text-amber-200">
                {s.n}
              </p>
              <h2 className="mt-3 text-lg font-semibold text-amber-50">
                {s.title}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-zinc-300">
                {s.body}
              </p>
            </Card>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/vault"
            className="rounded-full bg-amber-300 px-6 py-3 text-sm font-semibold text-black hover:bg-amber-200"
          >
            See the Joke Vault →
          </Link>
          <Link
            href="/stage"
            className="rounded-full border border-amber-200/30 px-6 py-3 text-sm font-semibold text-amber-100 hover:bg-amber-300/10"
          >
            Take the stage 🎤
          </Link>
        </div>
      </section>

      <section aria-label="Live stats">
        <SectionTitle hint="updates when the indexer is live">
          Tonight at the club
        </SectionTitle>
        <div className="grid gap-4 md:grid-cols-3">
          {LIVE_STATS.map((s) => (
            <Card key={s.label}>
              <p className="text-3xl font-bold text-amber-50">{s.value}</p>
              <p className="mt-1 text-sm text-zinc-400">{s.label}</p>
            </Card>
          ))}
        </div>
      </section>

      <section aria-label="Bits that killed it">
        <SectionTitle hint="rotating, public bits only">
          Recently killed it
        </SectionTitle>
        <div className="grid gap-4 md:grid-cols-3">
          {SPOTLIGHT_BITS.map((b) => (
            <Card key={b.text}>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-300/80">
                {b.category}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-200">
                {b.text}
              </p>
              <p className="mt-3 text-xs text-emerald-300">🎤 {b.result}</p>
            </Card>
          ))}
        </div>
      </section>

      <Disclaimer />
    </div>
  );
}
