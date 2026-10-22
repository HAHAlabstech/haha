/**
 * HAHA E2E (testnet): real SIWE signatures, full bit -> verdict -> crowd -> outcome.
 * Persists test wallets so the jury pool stays deterministic across runs.
 * Usage: npx tsx scripts/e2e-testnet.ts
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const BASE = process.env.E2E_BASE ?? "https://haha.asifaq.com";
const WALLETS_FILE = "scripts/.e2e-wallets.json";

type Account = ReturnType<typeof privateKeyToAccount>;

function siweMessage(account: string, nonce: string): string {
  const domain = new URL(BASE).host;
  return [
    `${domain} wants you to sign in with your Ethereum account:`,
    account,
    "",
    "Sign in to HAHA Comedy Club (no gas, no transaction).",
    "",
    `URI: ${BASE}`,
    "Version: 1",
    "Chain ID: 46630",
    `Nonce: ${nonce}`,
    `Issued At: ${new Date().toISOString()}`,
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

function loadKeys(): string[] {
  if (!existsSync(WALLETS_FILE)) return [];
  try { return JSON.parse(readFileSync(WALLETS_FILE, "utf8")) as string[]; } catch { return []; }
}
function saveKeys(keys: string[]) {
  writeFileSync(WALLETS_FILE, JSON.stringify([...new Set(keys)], null, 2));
}

async function main() {
  const keys = loadKeys();
  const author = privateKeyToAccount(generatePrivateKey());
  const auth = await siwe(author);
  keys.push(auth.wallet);
  console.log("1. SIWE author ok:", auth.wallet);

  const uniq = Math.random().toString(36).slice(2, 10);
  const scenario =
    `At the ${uniq} street market a fortune teller told me my future, then charged me extra for the silence after it.`;
  const question = "Why is this funny?";
  const answer =
    `The punchline is the awkward silence being monetized: the fortune itself was worthless, the discomfort became the product (${uniq}).`;
  const explanation =
    `It jokes about paying for awkwardness, not information (${uniq}).`;

  const bitRes = await post("/api/bits", {
    wallet: auth.wallet, category: "punchline", stage: "open_mic", scenario, question,
  }, auth.token);
  console.log("2. create bit:", bitRes.status, JSON.stringify(bitRes.json).slice(0, 140));
  if (bitRes.status !== 200 && bitRes.status !== 201) throw new Error("bit create failed");
  const bitId: string = bitRes.json.bitId ?? bitRes.json.id;

  for (let i = 0; i < 12; i++) {
    const r = await fetch(`${BASE}/api/bits/${bitId}`, { headers: { authorization: `Bearer ${auth.token}` } });
    const j: any = await r.json().catch(() => ({}));
    const status = j.bit?.status ?? j.status;
    const hasAi = !!(j.bit?.ai_answer ?? j.ai_answer);
    console.log(`   poll ${i}: status=${status} ai=${hasAi ? "yes" : "no"}`);
    if (status === "answered" || status === "disputed") break;
    await new Promise((res) => setTimeout(res, 5000));
  }

  const verdict = await post(`/api/bits/${bitId}/verdict`, {
    wallet: auth.wallet, verdict: "missed_it", answer, explanation,
  }, auth.token);
  console.log("3. verdict missed_it:", verdict.status, JSON.stringify(verdict.json).slice(0, 160));
  if (verdict.status !== 200) throw new Error("verdict failed");

  // Grow the jury pool with 5 fresh wallets (onboarded 10/10).
  const jurors: Array<{ account: Account; token: string; wallet: string }> = [];
  for (let i = 0; i < 5; i++) {
    const acct = privateKeyToAccount(generatePrivateKey());
    const a = await siwe(acct);
    // New route contract: answers are graded against the server-side key.
    await post("/api/crowd/onboarding", { wallet: a.wallet, answers: ["B", "B", "B", "B", "B", "B", "B", "A", "B", "B"] }, a.token);
    jurors.push({ account: acct, ...a });
    keys.push(a.wallet);
  }
  saveKeys(keys);
  console.log("4. jury pool size:", keys.length);

  // Vote from ANY known wallet that has an open assignment on this bit.
  let votes = 0;
  for (const priv of keys) {
    if (votes >= 5) break;
    const acct = privateKeyToAccount(priv as `0x${string}`);
    const a = await siwe(acct);
    const next = await fetch(`${BASE}/api/crowd/next?wallet=${a.wallet}`, {
      headers: { authorization: `Bearer ${a.token}` },
    });
    const nj: any = await next.json().catch(() => ({}));
    if (!nj.assignmentId) continue;
    if (nj.bitId && nj.bitId !== bitId) continue;
    const optA: string = nj.options?.A ?? "";
    const optB: string = nj.options?.B ?? "";
    const want = answer.toLowerCase().slice(0, 24);
    const vote = optA.toLowerCase().includes(want) ? "A" : optB.toLowerCase().includes(want) ? "B" : "A";
    const v = await post(`/api/crowd/${nj.assignmentId}`, { wallet: a.wallet, vote, fairness: "fair" }, a.token);
    console.log(`   vote ${a.wallet.slice(0, 8)} → ${vote}: ${v.status} ${JSON.stringify(v.json).slice(0, 100)}`);
    if (v.status === 200) votes++;
  }
  console.log("5. votes cast:", votes);

  const finalRes = await fetch(`${BASE}/api/bits/${bitId}`, { headers: { authorization: `Bearer ${auth.token}` } });
  const finalJson: any = await finalRes.json().catch(() => ({}));
  console.log("6. FINAL:", JSON.stringify({
    status: finalJson.bit?.status ?? finalJson.status,
    outcome: finalJson.bit?.outcome ?? finalJson.outcome,
  }));
  console.log("   bitId:", bitId);
}

main().catch((e) => { console.error("E2E FAILED:", e.message); process.exit(1); });
