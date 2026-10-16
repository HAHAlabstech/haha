"use strict";
// Job: normalize — A/B blind-crowd style normalization (plan §2.3.3).
// MiMo flash, thinking disabled, temp 0.2. Runs for BOTH answers (AI +
// comedian reveal) so jurors compare substance, not style. Crowd assignment
// stays HELD until normalized_text is filled (retry via BullMQ, re-entrant;
// five-minute-ops picks up stragglers).

const { PrismaClient } = require("@prisma/client");
const { normalizeBlind } = require("../mimo");

const prisma = new PrismaClient();

async function run(job) {
  const { bitId } = job.data;
  const done = [];
  const ai = await prisma.straightManAnswer.findUnique({ where: { bit_id: bitId } });
  if (ai && !ai.normalized_text) {
    const n = await normalizeBlind(ai.answer);
    await prisma.straightManAnswer.update({ where: { bit_id: bitId }, data: { normalized_text: n.slice(0, 450) } });
    done.push("ai");
  }
  const rev = await prisma.comedianReveal.findUnique({ where: { bit_id: bitId } });
  if (rev && !rev.normalized_text) {
    const n = await normalizeBlind(rev.answer);
    await prisma.comedianReveal.update({ where: { bit_id: bitId }, data: { normalized_text: n.slice(0, 450) } });
    done.push("comedian");
  }
  if (!done.length) return { skipped: "nothing_pending" };
  return { normalized: done }; // /crowd/next unholds assignments for this bit
}

module.exports = { run };
