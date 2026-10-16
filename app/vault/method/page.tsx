import { Card, Disclaimer, PageHero, SectionTitle, Stamp } from "@/components/ui";

const PRICE_TABLE = [
  {
    outcome: "Killed it (human-win)",
    ref: "$12.00",
    note: "Verified by the Crowd quorum; included in training and benchmark eval pipelines.",
  },
  {
    outcome: "Bombed (AI-win)",
    ref: "$2.50",
    note: "Confirmed AI success; negative calibration example with full context.",
  },
  {
    outcome: "Heckled off / rejected",
    ref: "$0.00",
    note: "Unfair or rejected bits carry zero replacement value.",
  },
];

export default function VaultMethodPage() {
  return (
    <div className="mx-auto max-w-[1440px] px-[clamp(20px,4vw,56px)] pt-28 pb-16 space-y-14">
      <PageHero
        kicker="Vault Methodology · Replacement Cost"
        title={
          <>
            How the Vault numbers <em>are built.</em>
          </>
        }
        lede="Replacement Cost estimates what it would cost an AI lab to source, adversarially test, and human-verify comparable nuance data from scratch — never a valuation of HAHA or $HAHA."
      />

      <section aria-label="Verified entries">
        <SectionTitle eyebrow="Inclusion Rule" hint="Quorum-settled only">
          What counts as <em>an entry.</em>
        </SectionTitle>
        <Card>
          <p className="text-base leading-relaxed text-[#efe8dc]">
            Only verified bits are counted: bits the Crowd quorum has judged,
            plus confirmed AI-wins. Bits still in screening, in front of the
            jury, under appeal, or sealed inside the private holdout set are
            excluded from the public count.
          </p>
        </Card>
      </section>

      <section aria-label="Reference prices">
        <SectionTitle
          eyebrow="Unit Economics"
          hint="Preliminary · Multi-rater benchmark"
        >
          Reference <em>Prices.</em>
        </SectionTitle>
        <Card>
          <div className="mb-5">
            <Stamp>Preliminary · Audited Formula</Stamp>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#efe8dc]/15 font-mono text-[10px] uppercase tracking-[0.18em] text-[#a49b8e]">
                  <th className="py-3 pr-4">Outcome</th>
                  <th className="py-3 pr-4">Reference Rate</th>
                  <th className="py-3">Rationale</th>
                </tr>
              </thead>
              <tbody>
                {PRICE_TABLE.map((r) => (
                  <tr
                    key={r.outcome}
                    className="border-b border-[#efe8dc]/10 text-[#efe8dc]"
                  >
                    <td className="py-3.5 pr-4 font-serif text-lg text-[#fff6ed]">
                      {r.outcome}
                    </td>
                    <td className="py-3.5 pr-4 font-mono text-sm text-[#ffb13b]">
                      {r.ref}
                    </td>
                    <td className="py-3.5 text-sm text-[#a49b8e]">{r.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-6 rounded-xl border border-[#efe8dc]/12 bg-[#0c0a08] p-4 font-mono text-xs text-[#ffb13b]">
            replacement_cost = Σ entries[category][outcome] ×
            ref_price[category][outcome]
          </div>
        </Card>
      </section>

      <section aria-label="Updates and history">
        <SectionTitle eyebrow="Auditability" hint="Immutable price history">
          Updates &amp; <em>History.</em>
        </SectionTitle>
        <Card>
          <ul className="list-disc space-y-2.5 pl-5 text-sm leading-relaxed text-[#a49b8e]">
            <li>
              Counts refresh on a short schedule; the Vault page revalidates
              frequently so the meter stays fresh.
            </li>
            <li>
              Reference prices change only with a recorded source note and an
              effective date — every change is kept in history.
            </li>
            <li>
              Weekly snapshots anchor the entry count and Merkle root to{" "}
              <code className="font-mono text-xs text-[#efe8dc]">
                VaultRegistry.sol
              </code>
              .
            </li>
          </ul>
        </Card>
      </section>

      <Disclaimer />
    </div>
  );
}
