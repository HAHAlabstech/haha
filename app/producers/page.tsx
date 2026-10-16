import { Card, Disclaimer, PageHero, SectionTitle } from "@/components/ui";

const PLANS = [
  {
    name: "Snapshot",
    price: "$2,500",
    body: "One batch of the dataset — per category or the full Vault. Merkle-rooted manifest included.",
  },
  {
    name: "Subscription",
    price: "$1,000 / mo",
    body: "Monthly access to new verified entries plus the dataset API.",
  },
  {
    name: "Eval Run",
    price: "$500",
    body: "Your model tested against the private holdout set. You get scores, never the questions.",
  },
  {
    name: "Theme Night",
    price: "from $500",
    body: "Sponsor a themed campaign and receive its dedicated data batch.",
  },
];

export default function ProducersPage() {
  return (
    <div className="space-y-10">
      <PageHero
        kicker="Producers"
        title="The data AI can't scrape."
        lede="The Joke Vault is a growing, human-verified record of humor, subtext, real-world sense, and ambiguity — licensed to labs and companies building better AI."
      />

      <section aria-label="Plans">
        <SectionTitle hint="payable in USDG on-chain">
          License plans
        </SectionTitle>
        <div className="grid gap-4 md:grid-cols-2">
          {PLANS.map((p) => (
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
      </section>

      <section aria-label="Revenue split">
        <SectionTitle>Where the money goes</SectionTitle>
        <Card>
          <ul className="grid gap-2 text-sm text-zinc-300 md:grid-cols-2">
            <li>· 40% operations &amp; compute</li>
            <li>· 30% Tip Jar (current rewards)</li>
            <li>· 20% Mic Drop (buyback &amp; burn)</li>
            <li>· 10% royalty to contributing comedians</li>
          </ul>
          <p className="mt-3 text-xs leading-relaxed text-zinc-500">
            Paid in USDG to the on-chain gateway; splits execute in the same
            transaction. Access is delivered as a 24-hour download link after
            payment verification.
          </p>
        </Card>
      </section>

      <section aria-label="Contact">
        <SectionTitle>Talk to HAHA Labs</SectionTitle>
        <Card>
          <p className="text-sm text-zinc-300">
            Tell us which plan fits and what you&apos;re building. The
            contact form goes live with the backend — until then, reach out
            through the project&apos;s public channels.
          </p>
        </Card>
      </section>

      <Disclaimer />
    </div>
  );
}
