import type { Metadata } from "next";
import { Card, Disclaimer, PageHero, SectionTitle, Stamp } from "@/components/ui";

export const metadata: Metadata = {
  title: "Vault Methodology & Pricing: HAHA",
  description:
    "Replacement-cost methodology behind the Joke Vault valuation: per-entry pricing (preliminary), weekly Merkle anchoring, deduplication, and license royalty flows.",
};

const PRICING = [
  {
    outcome: "killed_it",
    value: "$12.00",
    note: "Bit that fooled the Straight Man and passed the blind Crowd quorum: high-signal adversarial data.",
  },
  {
    outcome: "bombed",
    value: "$2.50",
    note: "Settled, labeled failure: still useful negative signal for preference training.",
  },
  {
    outcome: "heckled_off / rejected",
    value: "$0.00",
    note: "Unfair tricks or prescreen rejects carry no dataset value.",
  },
];

export default function VaultMethodPage() {
  return (
    <div className="relative min-h-screen bg-[#070709] text-white overflow-x-clip">
      <div className="relative z-10 mx-auto max-w-[1440px] px-[clamp(20px,4vw,56px)] pt-28 pb-16 space-y-12">
        <PageHero
          kicker="The Joke Vault · Methodology"
          title={
            <>
              Replacement-cost <em>pricing.</em>
            </>
          }
          lede="The corpus valuation is not an opinion; it is the sum of per-entry replacement costs of the same human judgment gathered at market rates. Here is exactly how each entry is priced, anchored, and licensed."
        />

        <section aria-label="Per-entry pricing">
          <SectionTitle eyebrow="VaultPricing">
            What one entry is <em>worth.</em>
          </SectionTitle>
          <Card>
            <div className="mb-4 flex items-center gap-2">
              <Stamp tone="amber">Preliminary</Stamp>
              <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                Methodology under research (figures are not final)
              </span>
            </div>
            <div className="divide-y divide-white/10">
              {PRICING.map((p) => (
                <div
                  key={p.outcome}
                  className="flex flex-wrap items-baseline justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-xs uppercase tracking-widest text-[#ffc53d]">
                      {p.outcome}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                      {p.note}
                    </p>
                  </div>
                  <p className="display-serif text-2xl text-white tabular-nums">
                    {p.value}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-4 font-mono text-[10px] uppercase leading-relaxed tracking-widest text-zinc-500">
              Source note: vendor tariff research is pending; these figures
              stay marked preliminary until third-party dataset pricing sources
              are attached.
            </p>
          </Card>
        </section>

        <section aria-label="Anchoring and dedup">
          <SectionTitle eyebrow="Integrity">
            Anchored, deduplicated, <em>replayable.</em>
          </SectionTitle>
          <Card>
            <ul className="space-y-2 text-sm leading-relaxed text-zinc-300">
              <li>
                · Settled entries are hashed into weekly Merkle roots published
                to <code className="text-white">VaultRegistry.sol</code>:
                the corpus is verifiable without trusting this frontend.
              </li>
              <li>
                · Near-duplicates are rejected at intake with a 384-dim pgvector
                HNSW cosine threshold, so the same joke cannot be paid twice.
              </li>
              <li>
                · Valuation is recomputed from settled outcomes: every entry is
                priced by its verdict class, never by self-reported claims.
              </li>
            </ul>
          </Card>
        </section>

        <section aria-label="License flows">
          <SectionTitle eyebrow="B2B Licensing">
            Where license revenue <em>goes.</em>
          </SectionTitle>
          <Card>
            <ul className="space-y-2 text-sm leading-relaxed text-zinc-300">
              <li>· 30% replenishes the Tip Jar pool (back to winning comedians and jurors)</li>
              <li>· 20% is held by MicDrop; no buyback or burn is active for standalone HAHA</li>
              <li>· 10% contributor royalty reserve; distribution requires a verified batch manifest</li>
              <li>· The remainder covers operations and the ProducerGateway split</li>
            </ul>
            <p className="mt-4 text-xs leading-relaxed text-zinc-400">
              Comedian payouts are variable by design: the Tip Jar is a share of
                verified USDG inflows, not a promised amount. No Pons creator fees
                are counted or expected in standalone mode.
            </p>
          </Card>
        </section>

        <Disclaimer />
      </div>
    </div>
  );
}
