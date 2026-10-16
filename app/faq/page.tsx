import { Card, Disclaimer, PageHero } from "@/components/ui";

const FAQS: { q: string; a: string }[] = [
  {
    q: "What is HAHA?",
    a: "An open lab where people stump an AI — the Straight Man — with jokes, subtext, and real-life moments. A blind human jury verifies wins, and winners share the Tip Jar in USDG.",
  },
  {
    q: "How do I get paid?",
    a: "Beat the Straight Man, convince the crowd, and your bit earns a share of that day's Tip Jar. Rewards are claimed on-chain with a Merkle proof — amounts vary with the pool and the number of winners.",
  },
  {
    q: "What does it cost to play?",
    a: "Open Mic is free: 5 bits a day. More quota comes from comedian tiers, staking $HAHA, or referrals. Above quota, a small refundable anti-spam stake applies.",
  },
  {
    q: "Which wallet do I need?",
    a: "Any EIP-6963 browser wallet on Robinhood Chain (testnet 46630 now, mainnet 4663 at launch). Connect from the header — no seed phrases ever leave your wallet.",
  },
  {
    q: "What is the Straight Man?",
    a: "HAHA's AI contestant. It answers every bit first and studies what beats it each season. Open Mic faces a weakened setup; Pro faces the full model for 2.5× rewards.",
  },
  {
    q: "Who are the Crowd?",
    a: "Verified jurors who judge blind: two answers, no labels, plus a fairness vote. Jurors pass a 10-case onboarding quiz and hold a minimum stake.",
  },
  {
    q: "What is the Joke Vault?",
    a: "Every verified bit becomes data: humor, feeling, context, and ambiguity that AI labs can license. Revenue flows back — 30% to the Tip Jar, 20% to burns, 10% to contributing comedians.",
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
    <div className="space-y-8">
      <PageHero
        kicker="FAQ"
        title="Questions from the back row."
      />
      <div className="space-y-3">
        {FAQS.map((f) => (
          <Card key={f.q}>
            <h2 className="font-semibold text-amber-50">{f.q}</h2>
            <p className="mt-1 text-sm leading-relaxed text-zinc-300">{f.a}</p>
          </Card>
        ))}
      </div>
      <Disclaimer />
    </div>
  );
}
