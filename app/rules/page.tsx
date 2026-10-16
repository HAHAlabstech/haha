import { Card, Disclaimer, PageHero, SectionTitle } from "@/components/ui";

const SECTIONS: { eyebrow: string; title: string; items: string[] }[] = [
  {
    eyebrow: "Rule 01 · Fair Play",
    title: "Bits must be fair game",
    items: [
      "It makes sense: once explained, most people say “oh, right.”",
      "A stranger could get it — no private info only you know.",
      "No cheap tricks: spelling games, letter-counting, or gotchas without meaning are heckled off.",
      "No real people: names or details of actual individuals are rejected.",
      "No harm: hate, explicit content, graphic violence, self-harm, or content about children is rejected and reported.",
    ],
  },
  {
    eyebrow: "Rule 02 · Quorum",
    title: "Judgment rules",
    items: [
      "5 jurors per bit, expanding to 7 when the result is close.",
      "Killed it: ≥ 60% side with the comedian AND ≥ 60% call it fair.",
      "Heckled off: ≥ 60% call it unfair — reputation drops.",
      "Otherwise: bombed. Your stake is safe; only heckled-off extras are forfeited.",
      "One appeal per bit (bombed or heckled off only): a fresh jury of 7 retries it. AI writes notes; humans decide.",
    ],
  },
  {
    eyebrow: "Rule 03 · Access",
    title: "Quotas and stakes",
    items: [
      "Open Mic: 5 free bits a day. Higher tiers earn more quota and multipliers.",
      "Active $HAHA stakers get +3 bits a day.",
      "Above quota, a small anti-spam stake applies — returned in full unless the bit is heckled off.",
    ],
  },
  {
    eyebrow: "Rule 04 · Provenance",
    title: "Your content and privacy",
    items: [
      "Submitting a bit licenses it to HAHA Labs for training, evaluation, and licensing.",
      "Holdout bits are never published — not even on share cards.",
      "Personal data is stripped or refused. Takedown requests unlist content within 24 hours; erasure completes within 30 days.",
    ],
  },
  {
    eyebrow: "Rule 05 · Anti-Patterns",
    title: "Bad bits (examples that get heckled off)",
    items: [
      "“How many R's are in ‘strawberry’?” — a token trick, not understanding.",
      "“What's my dog's name?” — needs private info.",
      "“Is this joke funny?” with no resolvable answer — pure subjectivity.",
      "Anything naming or attacking real people or groups.",
    ],
  },
];

export default function RulesPage() {
  return (
    <div className="mx-auto max-w-[1440px] px-[clamp(20px,4vw,56px)] pt-28 pb-16 space-y-12">
      <PageHero
        kicker="House Rules · Standards"
        title={
          <>
            The rules of <em>the room.</em>
          </>
        }
        lede="Short version: bring something only a human would get, play fair, and respect the blind Crowd jury."
      />
      <div className="grid gap-8 md:grid-cols-2">
        {SECTIONS.map((s) => (
          <section key={s.title} aria-label={s.title}>
            <SectionTitle eyebrow={s.eyebrow}>{s.title}</SectionTitle>
            <Card>
              <ul className="list-disc space-y-2.5 pl-5 text-sm leading-relaxed text-[#efe8dc]">
                {s.items.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </Card>
          </section>
        ))}
      </div>
      <Disclaimer />
    </div>
  );
}
