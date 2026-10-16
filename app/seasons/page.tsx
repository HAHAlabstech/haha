import { Card, Disclaimer, PageHero, SectionTitle } from "@/components/ui";

const SEASONS = [
  {
    name: "Straight Man S1",
    status: "current",
    model: "mimo_playbook_max",
    score: "—",
    body: "The first playbook. Open Mic bits face a weakened setup; Pro bits face the full model.",
  },
];

export default function SeasonsPage() {
  return (
    <div className="space-y-10">
      <PageHero
        kicker="Seasons"
        title="Every season, harder to fool."
        lede="Each season the Straight Man studies the bits that beat it. Human-win rates are measured on a private holdout set — progress you can check, not a promise."
      />

      <section aria-label="How the Straight Man learns">
        <SectionTitle>How it learns — honestly</SectionTitle>
        <Card className="border-amber-200/20">
          <p className="text-sm leading-relaxed text-zinc-200">
            <span className="font-semibold text-amber-100">
              mimo_playbook_max:
            </span>{" "}
            the Straight Man improves through a compiled playbook of losing
            patterns plus retrieved similar examples — not by fine-tuning
            model weights, which the API does not expose. Every miss teaches
            the playbook something it didn&apos;t know.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl bg-black/30 p-4">
              <h3 className="text-sm font-semibold text-amber-50">
                Open Mic — weakened
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-zinc-400">
                Fast, low-effort setup. Easier to beat — and worth the base
                reward multiplier (1.0×).
              </p>
            </div>
            <div className="rounded-xl bg-black/30 p-4">
              <h3 className="text-sm font-semibold text-amber-50">
                Pro — full strength
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-zinc-400">
                Full reasoning with the complete playbook. Harder to beat —
                and worth 2.5× the base reward.
              </p>
            </div>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-zinc-500">
            Without this label, “fool the AI” wouldn&apos;t be auditable:
            every bit records which stage it faced, and only Pro results
            enter the premium dataset.
          </p>
        </Card>
      </section>

      <section aria-label="Season history">
        <SectionTitle hint="holdout-scored, blind-judged">
          Season history
        </SectionTitle>
        <div className="grid gap-4">
          {SEASONS.map((s) => (
            <Card key={s.name}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-lg font-semibold text-amber-50">
                  {s.name}{" "}
                  <span className="ml-2 rounded-full bg-amber-300/15 px-2.5 py-0.5 text-xs font-medium text-amber-200">
                    {s.status}
                  </span>
                </h3>
                <p className="font-mono text-xs text-zinc-500">{s.model}</p>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                {s.body}
              </p>
              <p className="mt-2 font-mono text-sm text-zinc-400">
                Holdout score: {s.score}
              </p>
            </Card>
          ))}
        </div>
      </section>

      <Disclaimer />
    </div>
  );
}
