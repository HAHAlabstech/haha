import Link from "next/link";
import { Card, Disclaimer, SectionTitle } from "@/components/ui";

export function generateStaticParams() {
  return [];
}

const STAGES = [
  "Waiting for the Straight Man",
  "Straight Man answered",
  "Waiting for the Crowd",
  "Killed it / Bombed / Heckled off",
];

export default async function BitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300/80">
          Bit
        </p>
        <h1 className="mt-2 font-mono text-2xl font-bold text-amber-50 md:text-3xl">
          {id}
        </h1>
        <p className="mt-2 inline-block rounded-full bg-amber-300/15 px-3 py-1 text-xs font-medium text-amber-200">
          ● Waiting for the Straight Man
        </p>
      </div>

      <section aria-label="Progress">
        <SectionTitle hint="live once the backend is connected">
          Where this bit stands
        </SectionTitle>
        <ol className="space-y-2">
          {STAGES.map((s, i) => (
            <li key={s}>
              <Card
                className={
                  i === 0 ? "border-amber-300/40 bg-amber-300/5" : "opacity-70"
                }
              >
                <p className="text-sm text-zinc-200">
                  <span className="mr-2 font-mono text-xs text-zinc-500">
                    {i + 1}
                  </span>
                  {s}
                  {i === 0 ? (
                    <span className="ml-2 text-xs text-amber-200">
                      — you are here
                    </span>
                  ) : null}
                </p>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <section aria-label="Crowd progress">
        <SectionTitle>Crowd progress</SectionTitle>
        <Card>
          <p className="text-sm text-zinc-300">
            Votes in: <span className="font-mono">0 / 5</span>
          </p>
          <div
            aria-hidden
            className="mt-3 h-2 overflow-hidden rounded-full bg-black/50"
          >
            <div className="h-full w-0 rounded-full bg-amber-300" />
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            Expands to 7 jurors if the result is close. “Killed it” needs ≥
            60% for the comedian and ≥ 60% fair.
          </p>
        </Card>
      </section>

      <section aria-label="Verdict">
        <SectionTitle>Your verdict (once the Straight Man answers)</SectionTitle>
        <Card>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled
              className="cursor-not-allowed rounded-full border border-white/15 px-6 py-2.5 text-sm text-zinc-500"
              title="Available after the Straight Man answers"
            >
              Got it 😐
            </button>
            <button
              type="button"
              disabled
              className="cursor-not-allowed rounded-full border border-white/15 px-6 py-2.5 text-sm text-zinc-500"
              title="Available after the Straight Man answers"
            >
              Missed it 😂
            </button>
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            “Missed it” asks for your answer and explanation (locked after
            submit), then sends the bit to the Crowd blind.
          </p>
        </Card>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/stage"
          className="rounded-full border border-amber-200/30 px-6 py-3 text-sm font-semibold text-amber-100 hover:bg-amber-300/10"
        >
          Take the stage again →
        </Link>
        <Link
          href="/crowd"
          className="rounded-full border border-white/15 px-6 py-3 text-sm text-zinc-300 hover:bg-white/5"
        >
          Judge for the Crowd →
        </Link>
      </div>

      <Disclaimer />
    </div>
  );
}
