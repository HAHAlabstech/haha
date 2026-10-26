"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  decodeFunctionResult,
  encodeFunctionData,
  keccak256,
  toBytes,
  type Address,
} from "viem";
import { Card, Disclaimer, PageHero, SectionTitle, Stamp } from "@/components/ui";
import WalletModal from "@/components/WalletModal";
import { CheckCircle2, Wallet } from "lucide-react";
import {
  erc20Abi,
  producerGatewayAbi,
  USDG_DECIMALS,
} from "@/lib/haha-contracts";
import type { ChainEnv, HahaRuntimeConfig } from "@/lib/haha-chains";
import {
  getChainId,
  getSharedWalletState,
  resolveActiveProvider,
  subscribeWalletState,
  switchOrAddChain,
  truncateAddress,
  type Eip1193Provider,
} from "@/lib/wallets";

const PLANS = [
  {
    id: "snapshot",
    planType: 0,
    tag: "BATCH RELEASE",
    name: "Snapshot License",
    price: "$2,500",
    body: "One cryptographic batch of the dataset, per category or the full Vault. Merkle-rooted manifest included.",
  },
  {
    id: "subscription",
    planType: 1,
    tag: "STREAMING API",
    name: "Vault Subscription",
    price: "$1,000 / mo",
    body: "Monthly access to newly verified entries plus the live dataset API.",
  },
  {
    id: "eval",
    planType: 2,
    tag: "BENCHMARK",
    name: "Holdout Eval Run",
    price: "$500",
    body: "Your model tested blindly against the private holdout set. You receive category scores, never the raw holdout questions.",
  },
  {
    id: "theme_night",
    planType: 3,
    tag: "SPONSORED SET",
    name: "Theme Night",
    price: "from $500",
    body: "Sponsor a custom comedy or nuance campaign and receive its dedicated verified data batch.",
  },
] as const;

/** MockUSDG faucet: testnet only. */
const mockUsdgAbi = [
  {
    type: "function",
    name: "mintTest",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
] as const;

function fmtUsdg(micro: bigint): string {
  const val = Number(micro) / 10 ** USDG_DECIMALS;
  return `$${val.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function ProducersPage() {
  const [runtime, setRuntime] = useState<HahaRuntimeConfig | null>(null);
  const [contracts, setContracts] = useState<Record<string, string> | null>(
    null,
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<Eip1193Provider | null>(null);

  const [planId, setPlanId] = useState<string>("snapshot");
  const [priceMicro, setPriceMicro] = useState<bigint | null>(null);
  const [balanceMicro, setBalanceMicro] = useState<bigint | null>(null);
  const [paying, setPaying] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [payTxHash, setPayTxHash] = useState<string | null>(null);
  const [faucetBusy, setFaucetBusy] = useState(false);
  const [faucetMsg, setFaucetMsg] = useState<string | null>(null);

  const [orderId, setOrderId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [txHash, setTxHash] = useState("");
  const [activating, setActivating] = useState(false);
  const [activationResult, setActivationResult] = useState<{
    producerId?: string;
    apiKey?: string;
    keyToken?: string;
    downloadUrl?: string;
    verified?: boolean;
  } | null>(null);
  const [activateError, setActivateError] = useState<string | null>(null);

  const [exchangeToken, setExchangeToken] = useState("");
  const [publicKeyPem, setPublicKeyPem] = useState("");
  const [exchanging, setExchanging] = useState(false);
  const [wrappedKeyResult, setWrappedKeyResult] = useState<string | null>(null);
  const [exchangeError, setExchangeError] = useState<string | null>(null);

  const plan = useMemo(
    () => PLANS.find((p) => p.id === planId) ?? PLANS[0],
    [planId],
  );
  const chainEnv: ChainEnv = runtime?.chainEnv ?? "testnet";
  const gateway = contracts?.producerGateway;
  const usdg = contracts?.usdg;
  const chainId = runtime?.chainId ?? 46630;
  const gatewayReady = Boolean(
    gateway && gateway !== "0x0000000000000000000000000000000000000000",
  );

  useEffect(() => {
    const st = getSharedWalletState();
    if (st.account) setAccount(st.account);
    if (st.provider) setProvider(st.provider);
    else void resolveActiveProvider().then((p) => p && setProvider(p));
    return subscribeWalletState((next) => {
      setAccount(next.account);
      if (next.provider) setProvider(next.provider);
    });
  }, []);

  // Preserve a plan chosen on the Vault page. Validate the query value so a
  // malformed/unknown ?plan never silently changes what the buyer is seeing.
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("plan");
    if (requested && PLANS.some((p) => p.id === requested)) {
      setPlanId(requested);
    }
  }, []);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => (r.ok ? r.json() : null))
      .then((cfg) => {
        if (!cfg) return;
        setRuntime(cfg as HahaRuntimeConfig);
        setContracts(
          (cfg as { contracts?: Record<string, string> }).contracts ?? null,
        );
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/producers/batch").then(r => r.ok ? r.json() : null).then(batch => {
      if (!cancelled && typeof batch?.batchId === "string") setBatchId(batch.batchId);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const handleConnected = useCallback((accs: string[]) => {
    setAccount(accs[0] ?? null);
    void resolveActiveProvider().then((p) => {
      if (p) setProvider(p);
    });
  }, []);

  // Read the on-chain enforced price for the selected plan.
  useEffect(() => {
    let cancelled = false;
    setPriceMicro(null);
    if (!gatewayReady || !provider || !gateway) return;
    (async () => {
      try {
        const data = encodeFunctionData({
          abi: producerGatewayAbi,
          functionName: "planPriceMicro",
          args: [plan.planType],
        });
        const raw = (await provider.request({
          method: "eth_call",
          params: [{ to: gateway, data }, "latest"],
        })) as `0x${string}`;
        const value = decodeFunctionResult({
          abi: producerGatewayAbi,
          functionName: "planPriceMicro",
          data: raw,
        }) as bigint;
        if (!cancelled) setPriceMicro(value);
      } catch {
        if (!cancelled) setPriceMicro(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gateway, gatewayReady, plan.planType, provider]);

  const refreshBalance = useCallback(async () => {
    if (!provider || !usdg || !account) {
      setBalanceMicro(null);
      return;
    }
    try {
      const data = encodeFunctionData({
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [account as Address],
      });
      const raw = (await provider.request({
        method: "eth_call",
        params: [{ to: usdg, data }, "latest"],
      })) as `0x${string}`;
      const value = decodeFunctionResult({
        abi: erc20Abi,
        functionName: "balanceOf",
        data: raw,
      }) as bigint;
      setBalanceMicro(value);
    } catch {
      setBalanceMicro(null);
    }
  }, [account, provider, usdg]);

  useEffect(() => {
    void refreshBalance();
  }, [refreshBalance]);

  const waitForReceipt = useCallback(
    async (hash: string, activeProv: Eip1193Provider): Promise<void> => {
      for (let i = 0; i < 60; i += 1) {
        const receipt = (await activeProv.request({
          method: "eth_getTransactionReceipt",
          params: [hash],
        })) as { status?: string } | null;
        if (receipt) {
          if (receipt.status === "0x0") {
            throw new Error("Payment transaction reverted on-chain.");
          }
          return;
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
      throw new Error("Timed out waiting for the payment receipt.");
    },
    [],
  );

  async function handleMintTestUsdg() {
    if (!provider || !account || !usdg) return;
    setFaucetBusy(true);
    setFaucetMsg(null);
    try {
      if ((await getChainId(provider)) !== chainId) {
        await switchOrAddChain(provider, chainId);
      }
      const data = encodeFunctionData({
        abi: mockUsdgAbi,
        functionName: "mintTest",
      });
      const hash = (await provider.request({
        method: "eth_sendTransaction",
        params: [{ from: account, to: usdg, data }],
      })) as string;
      setFaucetMsg(`Test USDG minted · ${hash.slice(0, 10)}…`);
      await waitForReceipt(hash, provider);
      await refreshBalance();
    } catch (e) {
      setFaucetMsg(e instanceof Error ? e.message : "Faucet failed.");
    } finally {
      setFaucetBusy(false);
    }
  }

  async function handleBuy() {
    if (!provider || !account || !gateway || !usdg) {
      setModalOpen(true);
      return;
    }
    const activeProv = provider;
    setBuyError(null);
    setPayTxHash(null);
    setActivationResult(null);
    setActivateError(null);
    try {
      if (!orderId.trim()) {
        setBuyError("Enter an organization / order reference first (step 1).");
        return;
      }
      if ((await getChainId(activeProv)) !== chainId) {
        await switchOrAddChain(activeProv, chainId);
      }
      const amount = priceMicro ?? 0n;
      if (amount <= 0n) {
        setBuyError("Could not read the on-chain plan price. Please try again.");
        return;
      }

      // 1) Approve the gateway if the current allowance is short.
      const allowanceData = encodeFunctionData({
        abi: erc20Abi,
        functionName: "allowance",
        args: [account as Address, gateway as Address],
      });
      const allowanceRaw = (await activeProv.request({
        method: "eth_call",
        params: [{ to: usdg, data: allowanceData }, "latest"],
      })) as `0x${string}`;
      const allowance = decodeFunctionResult({
        abi: erc20Abi,
        functionName: "allowance",
        data: allowanceRaw,
      }) as bigint;

      setPaying(true);
      if (allowance < amount && usdg) {
        const approveData = encodeFunctionData({
          abi: erc20Abi,
          functionName: "approve",
          args: [gateway as Address, amount],
        });
        const approveHash = (await activeProv.request({
          method: "eth_sendTransaction",
          params: [{ from: account, to: usdg, data: approveData }],
        })) as string;
        await waitForReceipt(approveHash, activeProv);
      }

      // 2) Purchase the plan (price enforced on-chain + backend).
      if (!batchId.trim()) throw new Error("No published dataset batch is available yet.");
      const orderIdBytes32 = keccak256(toBytes(orderId.trim()));
      const batchIdBytes32 = keccak256(toBytes(batchId.trim() || "latest"));
      const buyData = encodeFunctionData({
        abi: producerGatewayAbi,
        functionName: "purchasePlan",
        args: [plan.planType, amount, orderIdBytes32, batchIdBytes32],
      });
      const hash = (await activeProv.request({
        method: "eth_sendTransaction",
        params: [{ from: account, to: gateway, data: buyData }],
      })) as string;
      setPayTxHash(hash);
      setTxHash(hash);
      setFaucetMsg(null);
      await waitForReceipt(hash, activeProv);
      await refreshBalance();
      await handleActivate(hash);
    } catch (e) {
      setBuyError(e instanceof Error ? e.message : "Payment failed in wallet.");
    } finally {
      setPaying(false);
    }
  }

  async function handleActivate(txOverride?: string) {
    const hash = (txOverride ?? txHash).trim();
    if (!orderId.trim() || !batchId.trim() || !hash) return;
    setActivating(true);
    setActivateError(null);
    setActivationResult(null);
    try {
      const res = await fetch("/api/producers/activate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tx_hash: hash,
          plan: plan.id,
          orderId: orderId.trim(),
          batchId: batchId.trim(),
          wallet: account ?? undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        producerId?: string;
        apiKey?: string;
        keyToken?: string;
        downloadUrl?: string;
        verified?: boolean;
        error?: string;
      };
      if (!res.ok) {
        setActivateError(data.error ?? `Activation failed (${res.status})`);
        return;
      }
      setActivationResult(data);
      if (data.keyToken) setExchangeToken(data.keyToken);
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
    <div className="relative min-h-screen bg-[#070709] text-white selection:bg-[#ffc53d]/30 selection:text-[#ffc53d] overflow-x-clip">
      <div
        aria-hidden
        className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[550px] bg-radial from-[#ffc53d]/06 via-[#ffc53d]/01 to-transparent blur-[160px] rounded-full z-0"
      />
      <div className="relative z-10 mx-auto max-w-[1440px] px-[clamp(20px,4vw,56px)] pt-28 pb-16 space-y-16">
      <PageHero
        kicker="Producers & AI Labs · ProducerGateway.sol"
        title={
          <>
            The human nuance data <em>AI can&apos;t scrape.</em>
          </>
        }
        lede="The Joke Vault is a provenance-signed corpus of humor, subtext, embodied common sense, and syntactic ambiguity, licensed on-chain to labs building models that actually get the joke."
      />

      <section aria-label="Plans">
        <SectionTitle eyebrow="Licensing Tiers" hint="Payable in USDG on-chain">
          Select a <em>License Plan.</em>
        </SectionTitle>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((p) => {
            const active = planId === p.id;
            return (
              <Card
                key={p.id}
                hot={active}
                className="flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-[#ffc53d]">
                      {p.tag}
                    </span>
                    {active ? <Stamp>Selected</Stamp> : null}
                  </div>
                  <h3 className="display-serif mt-3 text-2xl text-white">
                    {p.name}
                  </h3>
                  <p className="display-serif mt-2 text-4xl text-[#ffc53d]">
                    {p.price}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                    {p.body}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPlanId(p.id)}
                  className={`pill-btn mt-6 w-full justify-center cursor-pointer ${
                    active ? "hot" : ""
                  }`}
                >
                  <span>{active ? "Selected Plan" : "Select Plan"}</span>
                </button>
              </Card>
            );
          })}
        </div>
      </section>

      <section aria-label="Checkout">
        <SectionTitle
          eyebrow="On-Chain Checkout"
          hint="USDG → ProducerGateway.sol"
        >
          Pay &amp; Activate <em>On-Chain.</em>
        </SectionTitle>
        <Card className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="p-order"
                className="block font-mono text-xs uppercase tracking-widest text-[#ffc53d]"
              >
                Organization / Order Reference
              </label>
              <input
                id="p-order"
                type="text"
                name="orderId"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="ACME-RESEARCH-001"
                className="mt-2 w-full rounded-xl border border-white/15 bg-[#070709] p-3.5 text-sm text-white focus:border-[#ffc53d] focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="p-batch"
                className="block font-mono text-xs uppercase tracking-widest text-[#ffc53d]"
              >
                Dataset Batch Reference
              </label>
              <input
                id="p-batch"
                type="text"
                name="batchId"
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                placeholder="snapshot-latest"
                className="mt-2 w-full rounded-xl border border-white/15 bg-[#070709] p-3.5 text-sm text-white focus:border-[#ffc53d] focus:outline-none"
              />
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#070709] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="font-mono text-xs text-zinc-400">
                <p>
                  Plan:{" "}
                  <span className="text-white">
                    {plan.name} · {plan.price}
                  </span>
                </p>
                <p className="mt-1">
                  On-chain price:{" "}
                  <span className="text-[#ffc53d]">
                    {priceMicro === null ? "read after connect" : fmtUsdg(priceMicro)}
                  </span>
                </p>
                {account ? (
                  <p className="mt-1">
                    Wallet:{" "}
                    <span className="text-white">
                      {truncateAddress(account)}
                    </span>{" "}
                    · USDG:{" "}
                    <span className="text-white">
                      {balanceMicro === null ? "-" : fmtUsdg(balanceMicro)}
                    </span>
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {!account ? (
                  <button
                    type="button"
                    onClick={() => setModalOpen(true)}
                    className="pill-btn hot cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5" />
                      <span>Connect Wallet</span>
                    </span>
                  </button>
                ) : null}
                {account && chainEnv === "testnet" && usdg ? (
                  <button
                    type="button"
                    onClick={() => void handleMintTestUsdg()}
                    disabled={faucetBusy}
                    className="pill-btn disabled:opacity-40 cursor-pointer"
                  >
                    <span>
                      {faucetBusy ? "Minting…" : "Get Test USDG"}
                    </span>
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => void handleBuy()}
                  disabled={paying || !gatewayReady}
                  className="pill-btn hot disabled:opacity-40 cursor-pointer"
                >
                  <span>
                    {paying
                      ? "Confirm in wallet…"
                      : account
                        ? `Pay ${plan.price} in USDG →`
                        : "Connect to Pay →"}
                  </span>
                </button>
              </div>
            </div>
            {!gatewayReady ? (
              <p className="mt-3 font-mono text-[11px] text-[#ffc53d]">
                ProducerGateway is not configured on this network: checkout is
                disabled.
              </p>
            ) : null}
            {payTxHash ? (
              <p className="mt-3 font-mono text-[11px] break-all text-[#ffc53d]">
                Payment tx: {payTxHash}
              </p>
            ) : null}
            {faucetMsg ? (
              <p className="mt-3 font-mono text-[11px] break-all text-zinc-400">
                {faucetMsg}
              </p>
            ) : null}
            {buyError ? (
              <p className="mt-3 font-mono text-xs text-rose-400" role="alert">
                {buyError}
              </p>
            ) : null}
          </div>

          <details className="rounded-xl border border-white/10 bg-[#070709] p-4">
            <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-widest text-zinc-400">
              Already paid? Verify an existing transaction
            </summary>
            <div className="mt-4 space-y-3">
              <label
                htmlFor="p-txhash"
                className="block font-mono text-xs uppercase tracking-widest text-zinc-400"
              >
                On-Chain Payment Transaction Hash (0x…)
              </label>
              <input
                id="p-txhash"
                type="text"
                name="txHash"
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                placeholder="0x..."
                className="w-full rounded-xl border border-white/15 bg-[#070709] p-3.5 font-mono text-xs text-white focus:border-[#ffc53d] focus:outline-none"
              />
              <button
                type="button"
                disabled={
                  activating ||
                  !orderId.trim() ||
                  !batchId.trim() ||
                  !txHash.trim()
                }
                onClick={() => void handleActivate()}
                className="pill-btn hot disabled:opacity-40 cursor-pointer"
                style={{ padding: "14px 28px", fontSize: "12px" }}
              >
                <span>
                  {activating
                    ? "Verifying on-chain receipt…"
                    : "Verify Payment & Activate License →"}
                </span>
              </button>
            </div>
          </details>

          {activateError ? (
            <p className="font-mono text-xs text-rose-400" role="alert">
              {activateError}
            </p>
          ) : null}

          {activationResult ? (
            <div className="space-y-2 rounded-xl border border-[#ffc53d]/35 bg-[#ffc53d]/10 p-4 font-mono text-xs text-white">
              <p className="text-[#ffc53d] font-semibold">
                License Activated
                {activationResult.verified ? " · payment verified on-chain" : ""}
              </p>
              {activationResult.apiKey ? (
                <p className="break-all">API Key: {activationResult.apiKey}</p>
              ) : null}
              {activationResult.keyToken ? (
                <p className="break-all">
                  Key Exchange Token: {activationResult.keyToken}
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
          eyebrow="Cryptographic Envelope"
          hint="RSA-OAEP-256 wrapped AES-256-GCM DEK"
        >
          Exchange Snapshot <em>Decryption Key.</em>
        </SectionTitle>
        <Card className="space-y-4">
          <label htmlFor="p-xchg-token" className="sr-only">
            One-time key exchange token
          </label>
          <input
            id="p-xchg-token"
            name="exchangeToken"
            type="text"
            value={exchangeToken}
            onChange={(e) => setExchangeToken(e.target.value)}
            placeholder="One-time key exchange token"
            className="w-full rounded-xl border border-white/15 bg-[#070709] p-3.5 font-mono text-xs text-white focus:border-[#ffc53d] focus:outline-none"
          />
          <label htmlFor="p-xchg-pem" className="sr-only">
            RSA public key PEM
          </label>
          <textarea
            id="p-xchg-pem"
            name="publicKeyPem"
            rows={4}
            value={publicKeyPem}
            onChange={(e) => setPublicKeyPem(e.target.value)}
            placeholder="-----BEGIN PUBLIC KEY-----&#10;...&#10;-----END PUBLIC KEY-----"
            className="w-full rounded-xl border border-white/15 bg-[#070709] p-3.5 font-mono text-xs text-white focus:border-[#ffc53d] focus:outline-none"
          />
          <button
            type="button"
            disabled={
              exchanging || !exchangeToken.trim() || !publicKeyPem.trim()
            }
            onClick={() => void handleExchangeKey()}
            className="pill-btn hot disabled:opacity-40 cursor-pointer"
          >
            <span>
              {exchanging ? "Wrapping DEK…" : "Fetch RSA-OAEP Wrapped DEK →"}
            </span>
          </button>
          {exchangeError ? (
            <p className="font-mono text-xs text-rose-400" role="alert">
              {exchangeError}
            </p>
          ) : null}
          {wrappedKeyResult ? (
            <p className="rounded-xl border border-[#ffc53d]/35 bg-[#070709] p-4 font-mono text-xs break-all text-[#ffc53d]">
              {wrappedKeyResult}
            </p>
          ) : null}
        </Card>
      </section>

      <Disclaimer />
      <WalletModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConnected={handleConnected}
      />
      </div>
    </div>
  );
}
