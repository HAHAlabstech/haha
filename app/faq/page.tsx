import { Card, Disclaimer, PageHero } from "@/components/ui";

const FAQS: { q: string; a: string }[] = [
  {
    q: "What is HAHA?",
    a: "An open comedy club & AI lab where people stump an AI — the Straight Man — with jokes, subtext, real-life moments, and double meanings. A blind human jury verifies wins, and winners share the Tip Jar in USDG.",
  },
  {
    q: "How do I get paid?",
    a: "Beat the Straight Man, convince the Crowd, and your bit earns a share of that day's Tip Jar. Rewards are claimed on-chain with a Merkle proof — amounts vary with the pool and the number of winners.",
  },
  {
    q: "What does it cost to play?",
    a: "Open Mic is free: 5 bits a day. More quota comes from comedian tiers, staking $HAHA, or Pro Stage credits. Above quota, a small refundable anti-spam stake applies.",
  },
  {
    q: "Which wallet do I need?",
    a: "Any EIP-6963 browser wallet on Robinhood Chain (testnet 46630 now, mainnet 4663 at launch). Connect from the header — no seed phrases ever leave your wallet.",
  },
  {
    q: "What is the Straight Man?",
    a: "HAHA's AI contestant. It answers every bit first with deadpan literal confidence and studies what beats it each season. Open Mic faces a weakened setup; Pro Stage faces the full model for 2.5× rewards.",
  },
  {
    q: "Who are the Crowd?",
    a: "Verified human jurors who judge blind: two answers, no labels, plus a fairness vote. Jurors pass a 10-case onboarding quiz (8/10) and hold a minimum stake.",
  },
  {
    q: "What is the Joke Vault?",
    a: "Every verified bit becomes provenance-signed data: humor, feeling, context, and ambiguity that AI labs can license. Revenue flows back — 30% to the Tip Jar, 20% to Mic Drop burns, 10% royalty to contributing comedians.",
  },
  {
    q: "What is a Mic Drop?",
    a: "The 30% of creator fees that buys $HAHA and burns it — verifiable on-chain in the Tip Jar page history.",
  },
  {
    q: "Can I appeal a verdict?",
    a: "Once per bit, for bombed or heckled-off bits only. A fresh jury of 7 retries it; winning restores reputation, losing costs a point (anti-spam).",
  },
  {
    q: "Is this financial advice / guaranteed income?",
    a: "No. Rewards vary and depend entirely on the Tip Jar. Nothing here promises any amount, and nothing here is financial advice.",
  },
];

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-[1440px] px-[clamp(20px,4vw,56px)] pt-28 pb-16 space-y-12">
      <PageHero
        kicker="FAQ · Box Office"
        title={
          <>
            Questions from <em>the back row.</em>
          </>
        }
        lede="Everything you need to know about performing on Stage, judging in the Crowd, claiming from the Tip Jar, and licensing the Joke Vault."
      />
      <div className="grid gap-5 md:grid-cols-2">
        {FAQS.map((f, idx) => (
          <Card key={f.q}>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#ffb13b]">
              Q.{String(idx + 1).padStart(2, "0")}
            </span>
            <h2 className="display-serif mt-2 text-2xl text-[#fff6ed]">
              {f.q}
            </h2>
            <p className="mt-2.5 text-sm leading-relaxed text-[#a49b8e]">
              {f.a}
            </p>
          </Card>
        ))}
      </div>
      <Disclaimer />
    </div>
  );
}
