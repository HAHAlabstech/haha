"use strict";
// Job: share-card render (plan §4.6). Fired on every bit final settle:
// cron fiveMinuteOps settles via lib directly, inline app quorum settle
// enqueues this job — both end at ensureCardForBit (idempotent, retrials
// overwrite the same R2 key, so the URL stays stable per bit).
const { PrismaClient } = require("@prisma/client");
const lib = require("../lib/shareCard");
const { putR2 } = require("./weeklyVault");

const prisma = new PrismaClient();

module.exports = {
  async run(job) {
    const bitId = job.data.bitId;
    if (!bitId) throw new Error("share-card missing bitId");
    const card = await lib.ensureCardForBit(prisma, bitId, putR2);
    return { bitId, key: lib.cardKey(bitId), url: card.url, bytes: card.bytes };
  },
};
