import { Card, Disclaimer, SectionTitle } from "@/components/ui";

export function generateStaticParams() {
  return [];
}

const TIERS = ["Open Mic", "Opener", "Feature", "Headliner", "Legend"];

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const display = decodeURIComponent(handle).replace(/^@/, "");

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div
          aria-hidden
          className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-300/15 text-2xl"
        >
          🎤
        </div>
        <div>
          <h1 className="text-2xl font-bold text-amber-50 md:text-3xl">
            @{display}
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            {TIERS[0]} comedian · Walk-in juror
          </p>
        </div>
      </div>

      <section aria-label="Stats">
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: "Bits", value: "—" },
            { label: "Killed it", value: "—" },
            { label: "Crowd votes", value: "—" },
            { label: "Earned (USDG)", value: "—" },
          ].map((s) => (
            <Card key={s.label}>
              <p className="text-2xl font-bold text-amber-50">{s.value}</p>
              <p className="mt-1 text-xs text-zinc-400">{s.label}</p>
            </Card>
          ))}
        </div>
      </section>

      <section aria-label="Recent bits">
        <SectionTitle>Recent bits</SectionTitle>
        <Card>
          <p className="text-sm text-zinc-400">
            Public bits from @{display} will appear here. Holdout bits stay
            hidden to protect their eval value.
          </p>
        </Card>
      </section>

      <Disclaimer />
    </div>
  );
}
