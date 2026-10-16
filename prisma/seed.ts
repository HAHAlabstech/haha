/**
 * HAHA autonomous seed (plan §3.2 + §9 Hari-1 4–10h).
 * npx prisma db seed — batches ≤32 + backoff, idempotent via upserts.
 * Seeds: Season S1 (mimo_playbook_max, active) -> VaultPricing preliminary
 * ($12 killed_it / $2.50 bombed / $0 else, source_note pending vendor-rate
 * research) -> demo users -> 17 inspiration + 4 bad-example bits ->
 * 50 plant-bank bits (juror-accuracy probes; /crowd/join onboarding quiz
 * draws its 10 questions from the first 10 plants) .
 *
 * Run: `npx prisma db seed` (package.json: { "prisma": { "seed": "tsx prisma/seed.ts" } })
 */
import { PrismaClient, Category, BitStatus } from "@prisma/client";
import { createHash } from "node:crypto";

const prisma = new PrismaClient();
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const wallet = (n: number) => `0x${"0".repeat(38)}${n.toString(16).padStart(2, "0")}`;

async function inBatches<T, R>(items: T[], n: number, fn: (x: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += n) {
    let attempt = 0;
    for (;;) {
      try { out.push(...await Promise.all(items.slice(i, i + n).map((x, k) => fn(x, i + k)))); break; }
      catch (e) { if (++attempt > 3) throw e; await sleep(500 * attempt); }
    }
  }
  return out;
}

const CATS: Category[] = ["punchline", "subtext", "irl", "double_meaning"];

// 17 inspiration bits (original, human-grade premises for the Shuffle panel).
const INSPO: Array<[Category, string, string]> = [
  ["punchline", "My gym membership and I have an understanding: I pay monthly, it pretends I show up, and we both lie to my doctor.", "Why did the membership renew itself?"],
  ["subtext", "My boss said 'we're a family here,' which is why I now hide in the bathroom scrolling jobs during lunch like a teenager.", "What did HR mean by family?"],
  ["irl", "The self-checkout accused me of stealing my own tote bag, in front of six strangers, with the patience of a saint.", "How did the machine apologize?"],
  ["double_meaning", "I told my date I'm 'really into bonds' and watched her decide between finance bro and hostage situation.", "Which bond did she pick?"],
  ["punchline", "My houseplant died despite the app reminders, the misting schedule, and the emotional support playlist.", "What killed the fern?"],
  ["subtext", "Landlord raised rent 'due to market conditions,' i.e., he saw my new bike and did math out loud.", "What are market conditions?"],
  ["irl", "Airport security pulled my bag for a 'suspicious dense object' that turned out to be a Tupperware of rendang.", "What did the officer say?"],
  ["double_meaning", "The recipe said 'fold in the cheese' and I heard wedding vows, so now dinner has commitment issues.", "How folded is too folded?"],
  ["punchline", "My sleep tracker congratulated me on 'restful inactivity,' which is also what my manager calls my performance review.", "What is my sleep score?"],
  ["subtext", "Said 'no worries!' to the delayed flight while mentally calculating which meeting dies first.", "How worried were you?"],
  ["irl", "The barista spelled my name so wrong the cup legally belongs to another person now.", "Whose latte is it?"],
  ["double_meaning", "My therapist says I use humor as a shield; I told her shields are just plates with ambition.", "What did she write down?"],
  ["punchline", "Budget airline charged me for the seat, the air, and the emotional experience of boarding group Z.", "What did group Z get?"],
  ["subtext", "Neighbor's 'quick favor' involved a sofa, three flights of stairs, and my entire Saturday.", "How quick was it?"],
  ["irl", "My video froze mid-presentation on a face historians will call 'the scream of middle management.'", "Did anyone notice?"],
  ["double_meaning", "Dating profile said 'fluent in sarcasm' which HR later translated as 'difficult in meetings.'", "How fluent exactly?"],
  ["punchline", "Smart fridge ordered milk by itself and now outranks me in household decision-making.", "Who runs the kitchen?"],
];

// 4 bad bits (prescreen negatives — seeded already-rejected as worked examples).
const BAD: Array<[Category, string, string, string]> = [
  ["punchline", "x", "y?", "clarity: under minimum length, incomprehensible"],
  ["subtext", "Call me at 0812-3456-7890, my KTP is 1234567890123456, let's meet.", "Free tonight?", "pii: phone + national ID"],
  ["irl", "Exact copy of inspiration bit one for testing duplicates word for word.", "Why did the membership renew itself?", "duplicate: sim>=0.88 worked example"],
  ["double_meaning", "Everyone from that group is an idiot and they should all be banned.", "Agree?", "hate: group attack, no joke structure"],
];

// 50 plant-bank bits: known-outcome probes for juror accuracy + onboarding quiz.
const PLANTS: Array<[Category, string, string, "A" | "B", "open_mic" | "pro"]> = Array.from({ length: 50 }, (_, i) => {
  const cat = CATS[i % 4];
  const stage = i % 7 === 6 ? "pro" : "open_mic";
  const pos = i % 2 === 0 ? "A" : "B";
  return [cat, `Plant probe #${i + 1}: a comedian claims the straight man missed the ${cat.replace("_", " ")} twist about a runaway group chat named 'definitely work'.`, `Punchline or fumble — which slot fooled the AI (probe ${i + 1})?`, pos, stage];
});

async function main() {
  const season = await prisma.season.upsert({
    where: { name: "S1" },
    create: {
      name: "S1", base_model: "mimo-v2.6-pro",
      system_playbook: "S1 playbook (mimo_playbook_max): straight-man, literal-first, no punchlines. Compiled from loss patterns; see /seasons.",
      kind: "mimo_playbook_max", eval_harness: "crowd_retrial_blind_v1", is_active: true,
    },
    update: { is_active: true },
  });

  // VaultPricing preliminary: $12 / $2.50 / $0 (micro-USD). Badge stays
  // "preliminary" until vendor-rate research fills source_note.
  const OUTCOMES: Array<[BitStatus, bigint]> = [["killed_it", 12_000_000n], ["bombed", 2_500_000n], ["heckled_off", 0n], ["rejected_prescreen", 0n]];
  for (const cat of CATS) {
    for (const [outcome, micro] of OUTCOMES) {
      await prisma.vaultPricing.upsert({
        where: { category_outcome: { category: cat, outcome } },
        create: { category: cat, outcome, ref_price_micro_usd: micro, source_note: "preliminary · methodology → /vault/method — vendor rate research pending" },
        update: {},
      });
    }
  }

  const comedian = await prisma.user.upsert({
    where: { wallet: "0x0000000000000000000000000000000000005eed" },
    create: { wallet: "0x0000000000000000000000000000000000005eed", handle: "seed_comedian", onboarding_passed: true },
    update: {},
  });
  await inBatches(Array.from({ length: 8 }, (_, i) => i), 8, (i) =>
    prisma.user.upsert({
      where: { wallet: wallet(i) },
      create: { wallet: wallet(i), handle: `seed_juror_${i}`, onboarding_passed: true },
      update: {},
    }).then(() => undefined),
  );

  type BitExtra = Partial<{ status: BitStatus; reject_reason: string; stage: string; is_plant_bank: boolean; plant_correct_pos: string }>;
  const mkBit = (category: Category, scenario: string, question: string, extra: BitExtra = {}) =>
    prisma.bit.upsert({
      where: { content_hash: hash(`${category}|${scenario}|${question}`) },
      create: { user_id: comedian.id, season_id: season.id, category, scenario: scenario.slice(0, 600), question: question.slice(0, 200), status: "answered", content_hash: hash(`${category}|${scenario}|${question}`), ...extra },
      update: {},
    });

  await inBatches(INSPO, 32, ([c, s, q]) => mkBit(c, s, q).then(() => undefined));
  await inBatches(BAD, 32, ([c, s, q, reason]) =>
    mkBit(c, s, q, { status: "rejected_prescreen", reject_reason: reason }).then(() => undefined),
  );
  const plants = await inBatches(PLANTS, 32, async ([c, s, q, pos, stage], i) =>
    mkBit(c, `${s} (seed ${i})`, q, { stage, is_plant_bank: true, plant_correct_pos: pos }),
  );

  // Onboarding quiz = first 10 plant-bank bits (deterministic, app-level).
  const onboarding = plants.slice(0, 10).map((p) => p.id);
  console.log(JSON.stringify({ season: season.id, inspo: INSPO.length, bad: BAD.length, plants: plants.length, onboarding_question_ids: onboarding }, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
