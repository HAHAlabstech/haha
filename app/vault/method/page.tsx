import { Card, Disclaimer, PageHero, SectionTitle } from "@/components/ui";

const PRICE_TABLE = [
  {
    outcome: "Killed it (human-win)",
    ref: "$12.00",
    note: "Verified by the Crowd; included in training and eval pipelines.",
  },
  {
    outcome: "Bombed (AI-win)",
    ref: "$2.50",
    note: "Confirmed AI success; negative example with full context.",
  },
  {
    outcome: "Heckled off / rejected",
    ref: "$0.00",
    note: "Unfair or rejected bits carry no replacement value.",
  },
];

export default function VaultMethodPage() {
  return (
    <div className="space-y-10">
      <PageHero
        kicker="Methodology"
        title="How the Vault numbers are built."
        lede="Replacement Cost is an estimate of what it would cost to produce comparable data — not a valuation of HAHA or $HAHA."
      />

      <section aria-label="Verified entries">
        <SectionTitle>What counts as an entry</SectionTitle>
        <Card>
          <p className="text-sm leading-relaxed text-zinc-300">
            Only verified bits are counted: bits the Crowd has judged, plus
            confirmed AI-wins. Bits still in screening, in front of the
            jury, under appeal, or in the private holdout set are excluded
            from the public count.
          </p>
        </Card>
      </section>

      <section aria-label="Reference prices">
        <SectionTitle hint="preliminary — vendor research pending">
          Reference prices
        </SectionTitle>
        <Card>
          <p className="mb-4 inline-block rounded bg-amber-300/15 px-2 py-1 text-xs font-medium text-amber-200">
            preliminary · methodology →
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-zinc-500">
                  <th className="py-2 pr-4">Outcome</th>
                  <th className="py-2 pr-4">Reference</th>
                  <th className="py-2">Why</th>
                </tr>
              </thead>
              <tbody>
                {PRICE_TABLE.map((r) => (
                  <tr key={r.outcome} className="border-b border-white/5">
                    <td className="py-3 pr-4 font-medium text-zinc-100">
                      {r.outcome}
                    </td>
                    <td className="py-3 pr-4 font-mono text-amber-200">
                      {r.ref}
                    </td>
                    <td className="py-3 text-zinc-400">{r.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-zinc-400">
            Formula:{" "}
            <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-xs text-amber-100">
              replacement_cost = Σ entries[category][outcome] ×
              ref_price[category][outcome]
            </code>
          </p>
        </Card>
      </section>

      <section aria-label="Updates and history">
        <SectionTitle>Updates &amp; history</SectionTitle>
        <Card>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-zinc-300">
            <li>
              Counts refresh on a short schedule; the Vault page revalidates
              frequently so the meter stays fresh.
            </li>
            <li>
              Reference prices change only with a recorded source note and an
              effective date — every change is kept in history.
            </li>
            <li>
              The vendor-rate research behind the reference prices will be
              cited here with sources before the “preliminary” badge is
              removed.
            </li>
          </ul>
        </Card>
      </section>

      <Disclaimer />
    </div>
  );
}
