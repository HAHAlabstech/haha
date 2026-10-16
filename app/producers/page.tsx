"use client";

import { useState } from "react";
import { Card, Disclaimer, PageHero, SectionTitle, Stamp } from "@/components/ui";

const PLANS = [
  {
    id: "snapshot",
    tag: "BATCH RELEASE",
    name: "Snapshot License",
    price: "$2,500",
    body: "One cryptographic batch of the dataset — per category or the full Vault. Merkle-rooted manifest included.",
  },
  {
    id: "subscription",
    tag: "STREAMING API",
    name: "Vault Subscription",
    price: "$1,000 / mo",
    body: "Monthly access to newly verified entries plus the live dataset API.",
  },
  {
    id: "eval",
    tag: "BENCHMARK",
    name: "Holdout Eval Run",
    price: "$500",
    body: "Your model tested blindly against the private holdout set. You receive category scores, never the raw holdout questions.",
  },
  {
    id: "theme_night",
    tag: "SPONSORED SET",
    name: "Theme Night",
    price: "from $500",
    body: "Sponsor a custom comedy or nuance campaign and receive its dedicated verified data batch.",
  },
];

export default function ProducersPage() {
  const [orgName, setOrgName] = useState("");
  const [contact, setContact] = useState("");
  const [plan, setPlan] = useState("snapshot");
  const [txHash, setTxHash] = useState("");
  const [activating, setActivating] = useState(false);
  const [activationResult, setActivationResult] = useState<{
    apiKey?: string;
    keyExchangeToken?: string;
    downloadUrl?: string;
  } | null>(null);
  const [activateError, setActivateError] = useState<string | null>(null);

  const [exchangeToken, setExchangeToken] = useState("");
  const [publicKeyPem, setPublicKeyPem] = useState("");
  const [exchanging, setExchanging] = useState(false);
  const [wrappedKeyResult, setWrappedKeyResult] = useState<string | null>(null);
  const [exchangeError, setExchangeError] = useState<string | null>(null);

  async function handleActivate() {
    if (!orgName.trim() || !contact.trim() || !txHash.trim()) return;
    setActivating(true);
    setActivateError(null);
    setActivationResult(null);
    try {
      const res = await fetch("/api/producers/activate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          org_name: orgName.trim(),
          contact: contact.trim(),
          plan,
          tx_hash: txHash.trim(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        apiKey?: string;
        keyExchangeToken?: string;
        downloadUrl?: string;
        error?: string;
      };
      if (!res.ok) {
        setActivateError(data.error ?? `Activation failed (${res.status})`);
        return;
      }
      setActivationResult(data);
      if (data.keyExchangeToken) setExchangeToken(data.keyExchangeToken);
    } catch (e) {
      setActivateError(e instanceof Error ? e.message : "Activation failed.");
    } finally {
      setActivating(false);
    }
  }

  async function handleExchangeKey() {
    if (!exchangeToken.trim() || !publicKeyPem.trim()) return;
    setExchanging(true);
    setExchangeError(null);
    setWrappedKeyResult(null);
    try {
      const res = await fetch("/api/producers/key", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token: exchangeToken.trim(),
          publicKeyPem: publicKeyPem.trim(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        wrappedDek?: string;
        error?: string;
      };
      if (!res.ok) {
        setExchangeError(data.error ?? `Key exchange failed (${res.status})`);
        return;
      }
      setWrappedKeyResult(data.wrappedDek ?? null);
    } catch (e) {
      setExchangeError(e instanceof Error ? e.message : "Key exchange failed.");
    } finally {
      setExchanging(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1440px] px-[clamp(20px,4vw,56px)] pt-28 pb-16 space-y-16">
      <PageHero
        kicker="Producers & AI Labs · ProducerGateway.sol"
        title={
          <>
            The human nuance data <em>AI can&apos;t scrape.</em>
          </>
        }
        lede="The Joke Vault is a provenance-signed corpus of humor, subtext, embodied common sense, and syntactic ambiguity — licensed on-chain to labs building models that actually get the joke."
      />

      <section aria-label="Plans">
        <SectionTitle eyebrow="Licensing Tiers" hint="Payable in USDG on-chain">
          Select a <em>License Plan.</em>
        </SectionTitle>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((p) => {
            const active = plan === p.id;
            return (
              <Card
                key={p.id}
                hot={active}
                className="flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-[#ffb13b]">
                      {p.tag}
                    </span>
                    {active ? <Stamp>Selected</Stamp> : null}
                  </div>
                  <h3 className="display-serif mt-3 text-2xl text-[#fff6ed]">
                    {p.name}
                  </h3>
                  <p className="display-serif mt-2 text-4xl text-[#ffb13b]">
                    {p.price}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-[#a49b8e]">
                    {p.body}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPlan(p.id)}
                  className={`pill-btn mt-6 w-full justify-center ${
                    active ? "hot" : ""
                  }`}
                >
                  <span>{active ? "✓ Selected Plan" : "Select Plan"}</span>
                </button>
              </Card>
            );
          })}
        </div>
      </section>

      <section aria-label="Activate license">
        <SectionTitle
          eyebrow="Step 01 · On-Chain Verification"
          hint="Verify ProducerGateway transaction receipt"
        >
          Activate Your <em>License.</em>
        </SectionTitle>
        <Card className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block font-mono text-xs uppercase tracking-widest text-[#ffb13b]">
                Organization / AI Lab Name
              </label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Acme AI Research"
                className="mt-2 w-full rounded-xl border border-[#efe8dc]/15 bg-[#0c0a08] p-3.5 text-sm text-[#fff6ed] focus:border-[#ffb13b] focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-mono text-xs uppercase tracking-widest text-[#ffb13b]">
                Contact Email or Handle
              </label>
              <input
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="datasets@acme.ai"
                className="mt-2 w-full rounded-xl border border-[#efe8dc]/15 bg-[#0c0a08] p-3.5 text-sm text-[#fff6ed] focus:border-[#ffb13b] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[240px_1fr]">
            <div>
              <label className="block font-mono text-xs uppercase tracking-widest text-[#a49b8e]">
                Selected Plan
              </label>
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                className="mt-2 w-full rounded-xl border border-[#efe8dc]/15 bg-[#0c0a08] p-3.5 text-sm text-[#fff6ed] focus:border-[#ffb13b] focus:outline-none"
              >
                {PLANS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.price})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-mono text-xs uppercase tracking-widest text-[#a49b8e]">
                On-Chain Payment Transaction Hash (0x…)
              </label>
              <input
                type="text"
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                placeholder="0x..."
                className="mt-2 w-full rounded-xl border border-[#efe8dc]/15 bg-[#0c0a08] p-3.5 font-mono text-xs text-[#fff6ed] focus:border-[#ffb13b] focus:outline-none"
              />
            </div>
          </div>

          <button
            type="button"
            disabled={
              activating || !orgName.trim() || !contact.trim() || !txHash.trim()
            }
            onClick={() => void handleActivate()}
            className="pill-btn hot disabled:opacity-40"
            style={{ padding: "14px 28px", fontSize: "12px" }}
          >
            <span>
              {activating
                ? "Verifying on-chain receipt…"
                : "Verify Payment & Activate License →"}
            </span>
          </button>

          {activateError ? (
            <p className="font-mono text-xs text-[#ffb13b]" role="alert">
              {activateError}
            </p>
          ) : null}

          {activationResult ? (
            <div className="space-y-2 rounded-xl border border-[#8fb596]/40 bg-[#8fb596]/10 p-4 font-mono text-xs text-[#fff6ed]">
              <p className="text-[#8fb596]">✓ License Activated</p>
              {activationResult.apiKey ? (
                <p className="break-all">API Key: {activationResult.apiKey}</p>
              ) : null}
              {activationResult.keyExchangeToken ? (
                <p className="break-all">
                  Key Exchange Token: {activationResult.keyExchangeToken}
                </p>
              ) : null}
              {activationResult.downloadUrl ? (
                <p className="break-all">
                  24h Download URL: {activationResult.downloadUrl}
                </p>
              ) : null}
            </div>
          ) : null}
        </Card>
      </section>

      <section aria-label="Snapshot DEK exchange">
        <SectionTitle
          eyebrow="Step 02 · Cryptographic Envelope"
          hint="RSA-OAEP-256 wrapped AES-256-GCM DEK"
        >
          Exchange Snapshot <em>Decryption Key.</em>
        </SectionTitle>
        <Card className="space-y-4">
          <input
            type="text"
            value={exchangeToken}
            onChange={(e) => setExchangeToken(e.target.value)}
            placeholder="One-time key exchange token"
            className="w-full rounded-xl border border-[#efe8dc]/15 bg-[#0c0a08] p-3.5 font-mono text-xs text-[#fff6ed] focus:border-[#ffb13b] focus:outline-none"
          />
          <textarea
            rows={4}
            value={publicKeyPem}
            onChange={(e) => setPublicKeyPem(e.target.value)}
            placeholder="-----BEGIN PUBLIC KEY-----&#10;...&#10;-----END PUBLIC KEY-----"
            className="w-full rounded-xl border border-[#efe8dc]/15 bg-[#0c0a08] p-3.5 font-mono text-xs text-[#fff6ed] focus:border-[#ffb13b] focus:outline-none"
          />
          <button
            type="button"
            disabled={
              exchanging || !exchangeToken.trim() || !publicKeyPem.trim()
            }
            onClick={() => void handleExchangeKey()}
            className="pill-btn hot disabled:opacity-40"
          >
            <span>
              {exchanging ? "Wrapping DEK…" : "Fetch RSA-OAEP Wrapped DEK →"}
            </span>
          </button>
          {exchangeError ? (
            <p className="font-mono text-xs text-[#ffb13b]" role="alert">
              {exchangeError}
            </p>
          ) : null}
          {wrappedKeyResult ? (
            <p className="rounded-xl border border-[#8fb596]/40 bg-[#0c0a08] p-4 font-mono text-xs break-all text-[#8fb596]">
              {wrappedKeyResult}
            </p>
          ) : null}
        </Card>
      </section>

      <Disclaimer />
    </div>
  );
}
