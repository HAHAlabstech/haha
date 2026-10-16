import { Card, Disclaimer, PageHero, SectionTitle } from "@/components/ui";

function placeholderRows(label: string) {
  return [1, 2, 3, 4, 5].map((i) => (
    <tr key={i} className="border-b border-white/5 text-sm">
      <td className="py-2.5 pr-4 font-mono text-zinc-500">#{i}</td>
      <td className="py-2.5 pr-4 text-zinc-300">
        {label} #{i} · <span className="font-mono text-xs">0x…</span>
      </td>
      <td className="py-2.5 text-right font-mono text-zinc-400">—</td>
    </tr>
  ));
}

export default function LeaderboardPage() {
  return (
    <div className="space-y-10">
      <PageHero
        kicker="Leaderboard"
        title="The sharpest humans in the room."
        lede="Top comedians by killed-it bits, and top jurors by consensus accuracy. Ranks update as epochs settle."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-label="Top comedians">
          <SectionTitle hint="this week">🎤 Comedians</SectionTitle>
          <Card>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-zinc-500">
                  <th className="py-2 pr-4">Rank</th>
                  <th className="py-2 pr-4">Comedian</th>
                  <th className="py-2 text-right">Killed it</th>
                </tr>
              </thead>
              <tbody>{placeholderRows("comedian")}</tbody>
            </table>
          </Card>
        </section>
        <section aria-label="Top crowd">
          <SectionTitle hint="this week">🧑‍⚖️ The Crowd</SectionTitle>
          <Card>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-zinc-500">
                  <th className="py-2 pr-4">Rank</th>
                  <th className="py-2 pr-4">Juror</th>
                  <th className="py-2 text-right">Consensus</th>
                </tr>
              </thead>
              <tbody>{placeholderRows("juror")}</tbody>
            </table>
          </Card>
        </section>
      </div>

      <Disclaimer />
    </div>
  );
}
