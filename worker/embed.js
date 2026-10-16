"use strict";
// Embedding singleton — Transformers.js, pinned 384-dim (plan §6.4).
// Model: Xenova/all-MiniLM-L6-v2, dtype q8 (quantized, VPS-2GB friendly),
// mean pooling + L2 normalize, batch cap 32 + backoff + cache.
// Fallback: gte-small ONLY if the pinned model OOMs (dimension change =
// full re-embed migration, never silent). Mandarin/Phase-2 needs a
// multilingual model BEFORE use — same migration rule.

const MODEL_ID = "Xenova/all-MiniLM-L6-v2";
const FALLBACK_MODEL_ID = "Xenova/gte-small";
const DIM = 384;
const BATCH = 32;

let pipePromise = null;
let activeModel = MODEL_ID;

async function loadPipeline(model) {
  const { pipeline } = await import("@huggingface/transformers");
  // dtype q8: quantized int8 weights for the 2GB box.
  return pipeline("feature-extraction", model, { dtype: "q8" });
}

async function getPipe() {
  if (!pipePromise) pipePromise = loadPipeline(activeModel).catch((err) => {
    if (activeModel !== FALLBACK_MODEL_ID) {
      console.warn(`[embed] ${activeModel} failed (${err.message}); falling back to ${FALLBACK_MODEL_ID}`);
      activeModel = FALLBACK_MODEL_ID;
      pipePromise = loadPipeline(activeModel);
      return pipePromise;
    }
    throw err;
  });
  return pipePromise;
}

const cache = new Map(); // text.slice(0,800) -> number[384]; bounded LRU-ish
const MAX_CACHE = 5000;

async function embedOne(pipe, text) {
  const key = text.slice(0, 800);
  if (cache.has(key)) return cache.get(key);
  const out = await pipe(key, { pooling: "mean", normalize: true });
  const vec = Array.from(out.data.slice(0, DIM));
  if (vec.length !== DIM) throw new Error(`[embed] dim mismatch: ${vec.length} != ${DIM} (${activeModel})`);
  if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value);
  cache.set(key, vec);
  return vec;
}

// Batch ≤32 with linear backoff on failure (transient OOM / cold start).
async function embedBatch(texts) {
  const pipe = await getPipe();
  const out = [];
  for (const chunk of chunked(texts.slice(0, BATCH), BATCH)) {
    let attempt = 0;
    for (;;) {
      try {
        for (const t of chunk) out.push(await embedOne(pipe, t));
        break;
      } catch (err) {
        if (++attempt > 3) throw err;
        await sleep(500 * attempt);
      }
    }
  }
  return out;
}

function cosine(a, b) {
  let dot = 0;
  for (let i = 0; i < DIM; i++) dot += a[i] * b[i];
  return dot; // inputs are L2-normalized
}

function chunked(arr, n) {
  const r = [];
  for (let i = 0; i < arr.length; i += n) r.push(arr.slice(i, i + n));
  return r;
}
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

module.exports = { embedBatch, cosine, DIM, BATCH, MODEL_ID };
