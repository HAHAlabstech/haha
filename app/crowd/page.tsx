import Link from "next/link";
import { Card, Disclaimer, PageHero, SectionTitle } from "@/components/ui";

const TIERS = [
  { name: "Walk-in", votes: "15 votes / day", weight: "1.00×" },
  { name: "Regular", votes: "30 votes / day", weight: "1.15×" },
  { name: "Front Row", votes: "50 votes / day", weight: "1.30×" },
  { name: "Critic", votes: "80 votes / day", weight: "1.50× max" },
];

export default function CrowdPage() {
  return (
    <div className="space-y-10">
      <PageHero
        kicker="The Crowd"
        title="You be the judge."
        lede="Bits where the comedian says the AI missed go to a blind jury. You see two answers — A and B — with no labels. Pick the one that's right, and say whether the bit is fair."
      />

      <section aria-label="Current assignment">
        <SectionTitle hint="connect a wallet to receive assignments">
          Your next case
        </SectionTitle>
        <Card>
          <p className="text-sm text-zinc-300">
            No assignment waiting. Jurors need three things first:
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-zinc-300">
            <li>Pass human verification.</li>
            <li>Hold the minimum $HAHA stake (configurable; allowlist before launch).</li>
            <li>
              Pass the onboarding quiz —{" "}
              <Link href="/crowd/join" className="underline hover:text-white">
                8 out of 10
              </Link>
              .
            </li>
          </ol>
          <Link
            href="/crowd/join"
            className="mt-4 inline-block rounded-full bg-amber-300 px-6 py-2.5 text-sm font-semibold text-black hover:bg-amber-200"
          >
            Start the onboarding quiz →
          </Link>
        </Card>
      </section>

      <section aria-label="How judging works">
        <SectionTitle>How judging works</SectionTitle>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <h3 className="font-semibold text-amber-50">
              1 · Which answer is right?
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-zinc-300">
              A / B / both right / both wrong. “Both right” sides with the
              Straight Man — the AI only loses when the comedian is clearly
              righter.
            </p>
          </Card>
          <Card>
            <h3 className="font-semibold text-amber-50">2 · Is the bit fair?</h3>
            <p className="mt-1 text-sm leading-relaxed text-zinc-300">
              Fair / unfair. Cheap tricks, total ambiguity, or insider-only
              knowledge is unfair — ≥ 60% unfair means heckled off.
            </p>
          </Card>
        </div>
      </section>

      <section aria-label="Jury tiers">
        <SectionTitle hint="vote weight is capped at 1.5×">
          Jury tiers
        </SectionTitle>
        <div className="grid gap-4 md:grid-cols-4">
          {TIERS.map((t) => (
            <Card key={t.name}>
              <h3 className="font-semibold text-amber-50">{t.name}</h3>
              <p className="mt-1 font-mono text-sm text-amber-200">
                {t.weight}
              </p>
              <p className="mt-1 text-xs text-zinc-400">{t.votes}</p>
            </Card>
          ))}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-zinc-500">
          Tiers rise with consensus votes and accuracy on Plants — planted
          bits with known answers (about 1 in 10 assignments). Repeated
          misses lower reputation; serious abuse can slash stake.
        </p>
      </section>

      <Disclaimer />
    </div>
  );
}
