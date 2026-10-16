"use strict";
// Minimal MiMo 2.6 client over the OpenAI-compatible SDK surface.
// Base: https://api.xiaomimimo.com/v1, Bearer MIMO_API_KEY (server-only).
// Roles (plan §2.3):
//   flash (mimo-v2.6-flash, thinking disabled, temp 0.1, JSON) — prescreen/moderation + A/B normalizer (temp 0.2)
//   proWeak (mimo-v2.6-pro, thinking DISABLED, temp 0.3) — Straight Man OPEN MIC
//   proFull (mimo-v2.6-pro, thinking ENABLED, temp 0.7, max 600 tok, prefix-cached playbook) — Straight Man PRO
// Reasoning tokens are billed output: maxCompletionTokens must fit
// reasoning + JSON (600 is tight — watch for truncated JSON, raise if cut).

const BASE = process.env.MIMO_API_BASE_URL ?? "https://token-plan-sgp.xiaomimimo.com/v1";
const FAST = process.env.MIMO_FAST_MODEL ?? "mimo-v2.6-flash";
const MAIN = process.env.MIMO_MAIN_MODEL ?? "mimo-v2.6-pro";

async function chat({ model, messages, temperature, maxCompletionTokens, thinking, responseFormat = "json_object" }) {
  const body = { model, messages, temperature, max_completion_tokens: maxCompletionTokens, response_format: { type: responseFormat } };
  if (thinking !== undefined) body.extra_body = { thinking: { type: thinking ? "enabled" : "disabled" } };
  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.MIMO_API_KEY}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`[mimo] ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? "";
  return { text, json: safeParse(text), usage: data.usage };
}

function safeParse(text) {
  try { return JSON.parse(text); } catch { /* fallthrough */ }
  const m = text.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch { /* fallthrough */ } }
  throw new Error(`[mimo] non-JSON response: ${text.slice(0, 200)}`);
}

// Pre-screen + moderation (flash, cheap). Returns { ok, reject_reason?, crisis }.
async function prescreen({ category, scenario, question, fewShot }) {
  const system = [
    "You are HAHA prescreen. Reply JSON ONLY: {\"pass\":bool,\"reasons\":[string],\"pii\":bool,\"clarity\":0-1,\"self_harm\":bool}.",
    "Reject: PII/doxxing, incomprehensible (clarity<0.4), hate, sexual-minors.",
    "self_harm=true NEVER rejects silently — caller shows crisis modal and drops the bit.",
    "Few-shot verdicts on NON-HOLDOUT examples only (holdout must never leak into prompts):",
    ...(fewShot ?? []).map((e) => `- [${e.result}] Q:${e.question} A:${e.answer}`),
  ].join("\n");
  const { json } = await chat({
    model: FAST, temperature: 0.1, maxCompletionTokens: 400, thinking: false,
    messages: [{ role: "system", content: system }, { role: "user", content: `Category: ${category}\nScenario: ${scenario}\nQuestion: ${question}` }],
  });
  return json;
}

// Straight Man. stage: "open_mic" (weakened, thinking-off) | "pro" (full, thinking-on).
// ALWAYS returns { answer, reasoning, confidence } + model_version for regression tracking.
async function straightMan({ stage, seasonPlaybook, scenario, question }) {
  const pro = stage === "pro";
  const system = [
    `You are The Straight Man for HAHA season. Stage=${stage}. Reply JSON ONLY: {"answer":string,"reasoning":string,"confidence":0-1}.`,
    "Answer the question STRAIGHT (literal, no jokes, max ~300 chars). Never be funny on purpose.",
    pro ? `Season playbook (prefix-cached): ${seasonPlaybook}` : "Open-mic table: answer quickly and plainly.",
  ].join("\n");
  const t0 = Date.now();
  const { json } = await chat({
    model: MAIN, temperature: pro ? 0.7 : 0.3, maxCompletionTokens: pro ? 600 : 300, thinking: pro,
    messages: [{ role: "system", content: system }, { role: "user", content: `Scenario: ${scenario}\nQuestion: ${question}` }],
  });
  return { ...json, model_version: MAIN, latency_ms: Date.now() - t0 };
}

// A/B style normalizer (blind crowd): flash, temp 0.2, preserves meaning.
async function normalizeBlind(text) {
  const { json } = await chat({
    model: FAST, temperature: 0.2, maxCompletionTokens: 500, thinking: false,
    messages: [
      { role: "system", content: "Rewrite the comedic answer in neutral plain prose. Same facts, zero style tells, <=450 chars. Reply JSON ONLY: {\"normalized\":string}." },
      { role: "user", content: text },
    ],
  });
  return json.normalized ?? text;
}

module.exports = { prescreen, straightMan, normalizeBlind, MODELS: { FAST, MAIN } };
