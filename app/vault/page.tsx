import Link from "next/link";
import { Card, Disclaimer, PageHero, SectionTitle } from "@/components/ui";

// Placeholder counters — wired to /api/vault/summary once the backend is live.
const CATEGORIES = [
  { icon: "🎤", name: "Punchline", bits: "—", humanWin: "—", share: "—" },
  { icon: "💬", name: "Subtext", bits: "—", humanWin: "—", share: "—" },
  { icon: "🌍", name: "IRL", bits: "—", humanWin: "—", share: "—" },
  { icon: "🔀", name: "Double Meaning", bits: "—", humanWin: "—", share: "—" },
];

const PRICE_LIST = [
  {
    name: "Snapshot License",
    price: "$2,500",
    body: "One batch of the dataset, per category or the full Vault.",
  },
  {
    name: "Subscription",
    price: "$1,000 / mo",
    body: "Monthly access to new entries plus the dataset API.",
  },
  {
    name: "Eval Run",
    price: "$500",
    body: "Your model tested against the holdout set, with a report.",
  },
  {
    name: "Theme Night",
    price: "from $500",
    body: "A sponsored themed campaign with its own data batch.",
  },
];

export default function VaultPage() {
  return (
    <div className="space-y-10">
      <PageHero
        kicker="The Joke Vault"
        title="Every bit adds to something bigger."
        lede="Each attempt — won or lost — becomes a verified record of human nuance: humor, feeling, context, and common sense."
      />

      <section aria-label="Vault meter">
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-amber-200/20">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300/80">
              Replacement cost
            </p>
            <p className="mt-1 text-4xl font-bold text-amber-50">—</p>
            <p className="mt-2 text-xs text-zinc-400">
              estimated replacement cost ·{" "}
              <Link
                href="/vault/method"
                className="underline hover:text-zinc-200"
              >
                methodology →
              </Link>
            </p>
            <p className="mt-3 text-xs leading-relaxed text-zinc-500">
              What it would cost to build comparable data from scratch. An
              estimate, not a valuation of HAHA or any token.
            </p>
          </Card>
          <Card>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300/80">
              Revenue earned{" "}
              <span className="ml-1 rounded bg-emerald-300/15 px-1.5 py-0.5 text-[10px]">
                actual
              </span>
            </p>
            <p className="mt-1 text-4xl font-bold text-amber-50">—</p>
            <p className="mt-2 text-xs text-zinc-400">
              Real payments received from licenses and subscriptions.
            </p>
          </Card>
        </div>
      </section>

      <section aria-label="Vault contents by category">
        <SectionTitle hint="verified entries only">
          Inside the Vault
        </SectionTitle>
        <div className="grid gap-4 md:grid-cols-4">
          {CATEGORIES.map((c) => (
            <Card key={c.name}>
              <p className="text-2xl" aria-hidden>
                {c.icon}
              </p>
              <h3 className="mt-2 font-semibold text-amber-50">{c.name}</h3>
              <dl className="mt-2 space-y-1 text-xs text-zinc-400">
                <div className="flex justify-between">
                  <dt>Bits</dt>
                  <dd>{c.bits}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Human-win</dt>
                  <dd>{c.humanWin}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Cost share</dt>
                  <dd>{c.share}</dd>
                </div>
              </dl>
            </Card>
          ))}
        </div>
      </section>

      <section aria-label="Growth">
        <SectionTitle hint="chart goes live with the backend">
          Growth
        </SectionTitle>
        <Card>
          <p className="text-sm text-zinc-400">
            Entries and replacement cost over time, with a marker for each new
            Season of the Straight Man. The chart appears here once history
            accumulates.
          </p>
          <div
            aria-hidden
            className="mt-4 flex h-32 items-end gap-2 rounded-xl bg-black/30 p-4"
          >
            {[35, 55, 42, 70, 60, 88, 76, 95].map((h, i) => (
              <div
                key={i}
                style={{ height: `${h}%` }}
                className="w-full rounded-t bg-amber-300/25"
              />
            ))}
          </div>
        </Card>
      </section>

      <section aria-label="License the Vault">
        <SectionTitle hint="prices in USDG">
          License the Vault
        </SectionTitle>
        <div className="grid gap-4 md:grid-cols-4">
          {PRICE_LIST.map((p) => (
            <Card key={p.name}>
              <h3 className="font-semibold text-amber-50">{p.name}</h3>
              <p className="mt-1 text-2xl font-bold text-amber-200">
                {p.price}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                {p.body}
              </p>
            </Card>
          ))}
        </div>
        <Link
          href="/producers"
          className="mt-4 inline-block rounded-full border border-amber-200/30 px-6 py-3 text-sm font-semibold text-amber-100 hover:bg-amber-300/10"
        >
          Talk to HAHA Labs →
        </Link>
      </section>

      <section aria-label="Proof">
        <SectionTitle>Proof</SectionTitle>
        <Card>
          <p className="text-sm text-zinc-300">
            Each dataset release publishes a Merkle root on-chain. Roots and
            explorer links will be listed here — entry counts on-chain must
            match the dataset manifest.
          </p>
          <p className="mt-2 font-mono text-xs text-zinc-500">
            No releases yet. First snapshot publishes after beta.
          </p>
        </Card>
      </section>

      <div>
        <Link
          href="/stage"
          className="inline-block rounded-full bg-amber-300 px-6 py-3 text-sm font-semibold text-black hover:bg-amber-200"
        >
          Add your bit to the Vault →
        </Link>
      </div>

      <Disclaimer />
    </div>
  );
}
