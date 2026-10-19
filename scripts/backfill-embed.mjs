#!/usr/bin/env node
// Backfill Bit.embedding for every seeded / ungated bit (Test 2 dedup fix).
// Prescreen's pgvector dedup only sees bits WITH embeddings; the seed never
// embeds its 17+4 fixtures, so exact near-dupes of seeds slipped through the
// 0.88 gate. Run inside the worker container (has prisma + transformers +
// model cache): `docker compose exec worker node scripts/backfill-embed.mjs`.
// Text is built EXACTLY like prescreen: `${scenario}\n${question}` (384-d,
// normalized L2, batch 32). Idempotent: only rows with NULL embedding.

import { PrismaClient } from "@prisma/client";
import { embedBatch } from "../worker/embed.js";

const prisma = new PrismaClient();
const LIMIT = 500;

function chunked(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

async function main() {
  const rows = await prisma.$queryRaw`
    SELECT id, scenario, question FROM "Bit"
    WHERE embedding IS NULL ORDER BY created_at ASC LIMIT ${LIMIT}`;
  console.log(`[backfill] bits without embedding: ${rows.length}`);
  let done = 0;
  for (const chunk of chunked(rows, 32)) {
    const texts = chunk.map((r) => `${r.scenario}\n${r.question}`);
    const vecs = await embedBatch(texts);
    for (let i = 0; i < chunk.length; i++) {
      await prisma.$executeRaw`
        UPDATE "Bit" SET embedding = ${JSON.stringify(vecs[i])}::vector WHERE id = ${chunk[i].id}`;
      done++;
    }
    console.log(`[backfill] progress ${done}/${rows.length}`);
  }
  console.log(`[backfill] done: ${done} embedded`);
}

main()
  .catch((err) => {
    console.error("[backfill] FAILED:", err.message || err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
