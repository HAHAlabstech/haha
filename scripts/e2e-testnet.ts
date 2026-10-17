/**
 * HAHA E2E (testnet) — real SIWE signatures, full bit → verdict → crowd → outcome.
 * Usage: npx tsx scripts/e2e-testnet.ts
 */
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const BASE = process.env.E2E_BASE ?? "https://haha.asifaq.com";

type Account = ReturnType<typeof privateKeyToAccount>;

function siweMessage(account: string, nonce: string): string {
  const domain = new URL(BASE).host;
  const origin = BASE;
  const issuedAt = new Date().toISOString();
  return [
    `${domain} wants you to sign in with your Ethereum account:`,
    account,
    "",
    "Sign in to HAHA Comedy Club (no gas, no transaction).",
    "",
    `URI: ${origin}`,
    "Version: 1",
    "Chain ID: 46630",
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
  ].join("\n");
}

async function post(path: string, body: unknown, token?: string) {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 300) }; }
  return { status: res.status, json };
}

async function siwe(account: Account): Promise<{ token: string; wallet: string }> {
  const nonce = Math.random().toString(36).slice(2, 18);
  const message = siweMessage(account.address, nonce);
  const signature = await account.signMessage({ message });
  const r = await post("/api/auth/verify", { message, signature, nonce });
  if (r.status !== 200 || !r.json?.sessionToken) {
    throw new Error(`siwe failed ${r.status}: ${JSON.stringify(r.json)}`);
  }
  return { token: r.json.sessionToken as string, wallet: account.address.toLowerCase() };
}

async function main() {
  const author = privateKeyToAccount(generatePrivateKey());
  const auth = await siwe(author);
  console.log("1. SIWE author ok:", auth.wallet);

  const uniq = Math.random().toString(36).slice(2, 8);
  const scenario =
    `My neighbor's dog (tag ${uniq}) learned to open the fridge, so now the whole building blames me for the missing cheese.`;
  const question = "Why is this funny?";
  const answer =
    `It flips responsibility: the dog has the skill, but the humans blame the nearest person — absurd scapegoating under social pressure (${uniq}).`;
  const explanation =
    `The joke lands on the gap between who actually did it and who the group chooses to blame (${uniq}).`;

  const bitRes = await post("/api/bits", {
    wallet: auth.wallet,
    category: "punchline",
    stage: "open_mic",
    scenario,
    question,
  }, auth.token);
  console.log("2. create bit:", bitRes.status, JSON.stringify(bitRes.json).slice(0, 160));
  if (bitRes.status !== 200 && bitRes.status !== 201) throw new Error("bit create failed");
  const bitId: string = bitRes.json.bitId ?? bitRes.json.id;
  if (!bitId) throw new Error("no bitId in response");

  // Give the worker time to answer (prescreen + straight man).
  for (let i = 0; i < 12; i++) {
    const r = await fetch(`${BASE}/api/bits/${bitId}`, { headers: { authorization: `Bearer ${auth.token}` } });
    const j: any = await r.json().catch(() => ({}));
    console.log(`   poll ${i}: status=${r.status} bit.status=${j.status} ai=${j.ai_answer ? "yes" : "no"}`);
    if (j.status === "answered" || j.ai_answer) break;
    await new Promise((res) => setTimeout(res, 5000));
  }

  const verdict = await post(`/api/bits/${bitId}/verdict`, {
    wallet: auth.wallet,
    verdict: "missed_it",
    answer,
    explanation,
  }, auth.token);
  console.log("3. verdict missed_it:", verdict.status, JSON.stringify(verdict.json).slice(0, 200));
  if (verdict.status !== 200) throw new Error("verdict failed");

  // Five fresh jurors (each SIWE + onboarding shortcut 10/10).
  const jurors: Array<{ account: Account; token: string; wallet: string }> = [];
  for (let i = 0; i < 5; i++) {
    const acct = privateKeyToAccount(generatePrivateKey());
    const a = await siwe(acct);
    const onb = await post("/api/crowd/onboarding", { wallet: a.wallet, correct: 10, total: 10 }, a.token);
    console.log(`4.${i} juror ${a.wallet.slice(0, 8)} onboarding=${onb.status}`);
    jurors.push({ account: acct, ...a });
  }

  let votes = 0;
  for (const j of jurors) {
    const next = await fetch(`${BASE}/api/crowd/next?wallet=${j.wallet}`, {
      headers: { authorization: `Bearer ${j.token}` },
    });
    const nj: any = await next.json().catch(() => ({}));
    if (!nj.assignmentId) { console.log("   no assignment for", j.wallet.slice(0, 8), JSON.stringify(nj).slice(0, 80)); continue; }
    const optA: string = nj.options?.A ?? "";
    const optB: string = nj.options?.B ?? "";
    const wantComic = answer.toLowerCase().slice(0, 20);
    const vote = optA.toLowerCase().includes(wantComic) ? "A" : optB.toLowerCase().includes(wantComic) ? "B" : "A";
    const v = await post(`/api/crowd/${nj.assignmentId}`, { wallet: j.wallet, vote, fairness: "fair" }, j.token);
    console.log(`   vote ${j.wallet.slice(0, 8)} → ${vote}: ${v.status} ${JSON.stringify(v.json).slice(0, 120)}`);
    if (v.status === 200) votes++;
  }
  console.log("5. votes cast:", votes);

  const finalRes = await fetch(`${BASE}/api/bits/${bitId}`, { headers: { authorization: `Bearer ${auth.token}` } });
  const finalJson: any = await finalRes.json().catch(() => ({}));
  console.log("6. FINAL:", JSON.stringify({ status: finalJson.status, outcome: finalJson.outcome }, null, 2));
  console.log("   bitId:", bitId);
}

main().catch((e) => { console.error("E2E FAILED:", e.message); process.exit(1); });
