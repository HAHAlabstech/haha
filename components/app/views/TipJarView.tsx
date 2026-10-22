"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { encodeFunctionData, type Address } from "viem";
import { Card, Disclaimer, SectionTitle, Stamp } from "@/components/ui";
import WalletModal from "@/components/WalletModal";
import { ArrowUpRight, CheckCircle2 } from "lucide-react";
import { tipJarAbi } from "@/lib/haha-contracts";
import type { HahaRuntimeConfig } from "@/lib/haha-chains";
import {
  getChainId,
  getSharedWalletState,
  resolveActiveProvider,
  subscribeWalletState,
  switchOrAddChain,
  truncateAddress,
} from "@/lib/wallets";

interface RewardInfo {
  cumulativeMicroUsdg: string;
  proof: string[];
  tipJar: string;
  chainId?: number;
  epochs?: number;
  proofEpoch?: number;
  activeEpoch?: number | null;
  pendingEpoch?: number | null;
  pendingEta?: number | null;
  rootActive?: boolean;
  claimReady?: boolean;
}

interface TipJarSummary {
  escrow?: {
    tipJar?: { address?: string; microUsdg?: string };
    feeSplitter?: { address?: string; microUsdg?: string };
    micDrop?: { address?: string; microUsdg?: string };
  };
  totalPaidOutMicroUsdg?: string;
  latestEpoch?: number;
  micDropEvents?: {
    id: string;
    asset_in: string;
    amount_in_base_units: string;
    haha_bought_wei: string;
    haha_burned_wei: string;
    tx_hash: string;
    executed_at: string;
  }[];
}

function fmtUsdg(microStr?: string): string {
  if (!microStr) return "$0.00";
  try {
    const val = Number(BigInt(microStr)) / 1_000_000;
    return `$${val.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  } catch {
    return "$0.00";
  }
}

export default function TipJarView() {
  const [modalOpen, setModalOpen] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] =
    useState<import("@/lib/wallets").Eip1193Provider | null>(null);
  const [runtime, setRuntime] = useState<HahaRuntimeConfig | null>(null);
  const [contracts, setContracts] = useState<Record<string, string> | null>(
    null,
  );
  const [summary, setSummary] = useState<TipJarSummary | null>(null);
  const [reward, setReward] = useState<RewardInfo | null>(null);
  const [rewardStatus, setRewardStatus] = useState<
    "idle" | "loading" | "empty" | "error" | "ready"
  >("idle");
  const [rewardError, setRewardError] = useState<string | null>(null);
  const [recipientOverride, setRecipientOverride] = useState("");
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<
    "idle" | "pending" | "confirmed" | "reverted" | "unknown"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [claimedMicro, setClaimedMicro] = useState<string | null>(null);
  const [claimedStatus, setClaimedStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [claimedError, setClaimedError] = useState<string | null>(null);

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

  useEffect(() => {
    let cancelled = false;
    fetch("/api/config")
      .then((r) => (r.ok ? r.json() : null))
      .then((cfg) => {
        if (!cancelled && cfg) {
          setRuntime(cfg as HahaRuntimeConfig);
          setContracts(
            (cfg as { contracts?: Record<string, string> }).contracts ?? null,
          );
        }
      })
      .catch(() => {});

    fetch("/api/tipjar/summary")
      .then((r) => (r.ok ? r.json() : null))
      .then((s: TipJarSummary | null) => {
        if (!cancelled && s) setSummary(s);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  const handleConnected = useCallback((accs: string[]) => {
    setAccount(accs[0] ?? null);
    void resolveActiveProvider().then((p) => {
      if (p) setProvider(p);
    });
  }, []);

  const loadReward = useCallback(async () => {
    if (!account) {
      setReward(null);
      setRewardStatus("idle");
      return;
    }
    setLoading(true);
    setRewardStatus("loading");
    setRewardError(null);
    try {
      const r = await fetch(
        `/api/rewards/me?account=${encodeURIComponent(account)}`,
        { cache: "no-store" },
      );
      if (r.status === 404) {
        setReward(null);
        setRewardStatus("empty");
        return;
      }
      if (!r.ok) {
        setReward(null);
        setRewardError(`Reward service unavailable (${r.status}).`);
        setRewardStatus("error");
        return;
      }
      const data = (await r.json()) as RewardInfo;
      setReward(data);
      setRewardStatus("ready");
    } catch (e) {
      setReward(null);
      setRewardError(
        e instanceof Error ? e.message : "Reward service unavailable.",
      );
      setRewardStatus("error");
    } finally {
      setLoading(false);
    }
  }, [account]);

  useEffect(() => {
    if (account) {
      void loadReward();
    } else {
      setReward(null);
      setRewardStatus("idle");
      setClaimedMicro(null);
      setClaimedStatus("idle");
    }
  }, [account, loadReward]);

  const loadClaimed = useCallback(async () => {
    if (!account || !reward) {
      setClaimedMicro(null);
      setClaimedStatus("idle");
      setClaimedError(null);
      return;
    }
    setClaimedStatus("loading");
    setClaimedError(null);
    try {
      const activeProv = provider ?? (await resolveActiveProvider());
      if (!activeProv) {
        setClaimedMicro(null);
        setClaimedStatus("error");
        setClaimedError(
          "No wallet provider is active in this browser. Reconnect to verify the on-chain amount.",
        );
        return;
      }
      if (!provider) setProvider(activeProv);
      const data = encodeFunctionData({
        abi: tipJarAbi,
        functionName: "cumulativeClaimed",
        args: [account as Address],
      });
      const res = (await activeProv.request({
        method: "eth_call",
        params: [{ to: reward.tipJar as Address, data }, "latest"],
      })) as string;
      if (typeof res === "string" && res.startsWith("0x")) {
        setClaimedMicro(BigInt(res).toString());
        setClaimedStatus("ready");
      } else {
        setClaimedMicro(null);
        setClaimedStatus("error");
        setClaimedError("The chain returned an unreadable claim status.");
      }
    } catch (e) {
      setClaimedMicro(null);
      setClaimedStatus("error");
      setClaimedError(
        e instanceof Error
          ? e.message
          : "Could not read on-chain claim status.",
      );
    }
  }, [account, provider, reward]);

  useEffect(() => {
    void loadClaimed();
  }, [loadClaimed]);

  const claim = useCallback(async () => {
    const activeProv = provider ?? (await resolveActiveProvider());
    if (!activeProv) {
      setError("Reconnect your wallet in this browser before claiming.");
      setModalOpen(true);
      return;
    }
    if (!account || !reward) {
      setError("Connect a wallet with a reward allocation first.");
      return;
    }
    if (reward.claimReady !== true) {
      setError(
        "This allocation is not claimable yet. Wait for its Merkle root to activate on-chain.",
      );
      return;
    }
    if (claimedMicro === null) {
      setError(
        "On-chain claim status is not verified yet. Retry verification before signing.",
      );
      return;
    }
    const cumulative = BigInt(reward.cumulativeMicroUsdg);
    if (cumulative <= BigInt(claimedMicro)) {
      setError("Nothing left to claim for this allocation.");
      return;
    }

    setClaiming(true);
    setError(null);
    setTxHash(null);
    setTxStatus("idle");
    try {
      const targetChain = reward.chainId || runtime?.chainId || 46_630;
      await switchOrAddChain(activeProv, targetChain);

      const tipJar = (contracts?.tipJar ?? reward.tipJar) as Address;
      const cleanOverride = recipientOverride.trim();
      if (cleanOverride && !/^0x[0-9a-fA-F]{40}$/.test(cleanOverride)) {
        throw new Error("Invalid alternate recipient address.");
      }
      const recipient = (cleanOverride || account) as Address;
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800);

      const nonceHex = (await activeProv.request({
        method: "eth_call",
        params: [
          {
            to: tipJar,
            data: encodeFunctionData({
              abi: tipJarAbi,
              functionName: "nonces",
              args: [account as Address],
            }),
          },
          "latest",
        ],
      })) as string;
      const nonce = BigInt(nonceHex);

      const signature = (await activeProv.request({
        method: "eth_signTypedData_v4",
        params: [
          account,
          JSON.stringify({
            types: {
              EIP712Domain: [
                { name: "name", type: "string" },
                { name: "version", type: "string" },
                { name: "chainId", type: "uint256" },
                { name: "verifyingContract", type: "address" },
              ],
              Claim: [
                { name: "account", type: "address" },
                { name: "recipient", type: "address" },
                { name: "cumulativeMicro", type: "uint256" },
                { name: "deadline", type: "uint256" },
                { name: "nonce", type: "uint256" },
              ],
            },
            primaryType: "Claim",
            domain: {
              name: "HAHA-TipJar",
              version: "1",
              chainId: targetChain,
              verifyingContract: tipJar,
            },
            message: {
              account,
              recipient,
              cumulativeMicro: cumulative.toString(),
              deadline: deadline.toString(),
              nonce: nonce.toString(),
            },
          }),
        ],
      })) as string;
      const r = `0x${signature.slice(2, 66)}` as `0x${string}`;
      const s = `0x${signature.slice(66, 130)}` as `0x${string}`;
      let v = parseInt(signature.slice(130, 132), 16);
      if (v < 27) v += 27;

      const data = encodeFunctionData({
        abi: tipJarAbi,
        functionName: "claim",
        args: [
          account as Address,
          recipient,
          cumulative,
          deadline,
          nonce,
          v,
          r,
          s,
          (reward.proof ?? []) as readonly `0x${string}`[],
        ],
      });
      const walletChain = await getChainId(activeProv).catch(() => null);
      if (walletChain !== targetChain) {
        throw new Error("Wallet is on the wrong network.");
      }
      const hash = (await activeProv.request({
        method: "eth_sendTransaction",
        params: [{ from: account, to: tipJar, data }],
      })) as string;
      setTxHash(hash);
      setTxStatus("pending");

      // Broadcast is not success. Wait for a receipt so the UI never calls a
      // reverted claim "paid".
      let receipt: { status?: string } | null = null;
      for (let attempt = 0; attempt < 60; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 1500));
        receipt = (await activeProv.request({
          method: "eth_getTransactionReceipt",
          params: [hash],
        })) as { status?: string } | null;
        if (receipt) break;
      }
      if (!receipt) {
        setTxStatus("unknown");
        setError(
          "Transaction was submitted, but confirmation timed out. Check the explorer before retrying.",
        );
        return;
      }
      if (receipt.status === "0x1") {
        setTxStatus("confirmed");
        await loadClaimed();
        await loadReward();
      } else {
        setTxStatus("reverted");
        setError("The claim transaction reverted. No funds moved.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Claim failed in wallet.");
    } finally {
      setClaiming(false);
    }
  }, [
    account,
    claimedMicro,
    contracts,
    loadClaimed,
    loadReward,
    provider,
    recipientOverride,
    reward,
    runtime,
  ]);

  const cumulativeMicro = reward
    ? BigInt(reward.cumulativeMicroUsdg || "0")
    : 0n;
  const claimedKnown = claimedMicro !== null;
  const claimedValue = claimedKnown ? BigInt(claimedMicro ?? "0") : 0n;
  const availableMicro =
    reward && claimedKnown
      ? cumulativeMicro > claimedValue
        ? cumulativeMicro - claimedValue
        : 0n
      : null;
  const cumulativeUsdg = Number(cumulativeMicro) / 1_000_000;
  const claimedUsdg = Number(claimedValue) / 1_000_000;
  const availableUsdg =
    availableMicro !== null ? Number(availableMicro) / 1_000_000 : null;
  const fullyClaimed =
    reward != null && claimedKnown && cumulativeMicro <= claimedValue;
  const walletReady = Boolean(provider);
  const claimReady = reward?.claimReady === true;
  const inEscrowUsdg = fmtUsdg(summary?.escrow?.tipJar?.microUsdg);
  const paidOutUsdg = fmtUsdg(summary?.totalPaidOutMicroUsdg);
  const micDropUsdg = fmtUsdg(summary?.escrow?.micDrop?.microUsdg);

  return (
    <div className="mx-auto max-w-[1440px] px-[clamp(20px,4vw,56px)] py-8 space-y-12">
      {/* Header */}
      <div className="grid gap-8 border-b border-white/10 pb-8 lg:grid-cols-[1.3fr_1fr] lg:items-end">
        <div>
          <span className="eyebrow">The Tip Jar · Daily Merkle Escrow</span>
          <h1 className="display-serif mt-2 text-4xl text-white md:text-5xl">
            Verified funding can pay the humans who <em>beat AI.</em>
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
            Only verified USDG receipts are eligible for settlement through{" "}
            <code className="font-mono text-xs text-white">TipJar.sol</code>.
            Funded epochs distribute according to the configured split after a
            Merkle root is activated. No payout is promised when the pool is empty.
          </p>
        </div>

        <dl className="case-meta-grid">
          <div>
            <dt>In Escrow</dt>
            <dd className="display-serif text-3xl text-[#ffc53d] tabular-nums">
              {inEscrowUsdg}
            </dd>
          </div>
          <div>
            <dt>Paid to Humans</dt>
            <dd className="display-serif text-3xl text-[#ffc53d] tabular-nums">
              {paidOutUsdg}
            </dd>
          </div>
          <div>
              <dt>Mic Drop Hold · Inactive</dt>
            <dd className="font-mono text-base text-white tabular-nums">
              {micDropUsdg}
            </dd>
          </div>
          <div>
            <dt>Latest Epoch</dt>
            <dd className="font-mono text-base text-white">
              #{summary?.latestEpoch ?? 0}
            </dd>
          </div>
        </dl>
      </div>

      {/* Guided User Journey Stepper */}
      <section aria-label="Tip jar reward roadmap">
        <div className="haha-glass-panel rounded-2xl p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-3.5 mb-4">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#ffc53d] font-semibold">
              Tip Jar Settlement Lifecycle · 4 Steps
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-400">
              {!account
                ? "Step 01: Connect Wallet"
                : reward && BigInt(reward.cumulativeMicroUsdg || "0") > 0n
                  ? "Step 04: Rewards Available to Claim"
                  : "Steps 02-03: Perform or Judge to Earn Allocations"}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div
              className={`rounded-xl border p-3.5 transition-all ${
                !account
                  ? "border-[#ffc53d]/45 bg-[#ffc53d]/[0.07]"
                  : "border-emerald-500/30 bg-emerald-950/15"
              }`}
            >
              <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest">
                <span className="text-zinc-400">Step 01</span>
                <span className={account ? "text-emerald-400 font-semibold" : "text-zinc-500"}>
                  {account ? "Connected ✓" : "Required"}
                </span>
              </div>
              <p className="mt-1 font-serif text-base text-white">Connect &amp; Sign In</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-400">
                Robinhood Chain mainnet session. Confirm the network before signing.
              </p>
            </div>

            <Link
              href="/app?tab=stage"
              className="rounded-xl border border-white/10 bg-[#070709]/60 p-3.5 transition-all hover:border-[#ffc53d]/40"
            >
              <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest">
                <span className="text-zinc-400">Step 02</span>
                <span className="text-zinc-300">Stage (80%) →</span>
              </div>
              <p className="mt-1 font-serif text-base text-white">Perform &amp; Stump</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-400">
                Outwit the Straight Man AI.
              </p>
            </Link>

            <Link
              href="/app?tab=crowd"
              className="rounded-xl border border-white/10 bg-[#070709]/60 p-3.5 transition-all hover:border-[#ffc53d]/40"
            >
              <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest">
                <span className="text-zinc-400">Step 03</span>
                <span className="text-zinc-300">Crowd (20%) →</span>
              </div>
              <p className="mt-1 font-serif text-base text-white">Judge in Quorum</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-400">
                Cast blind votes that agree with consensus.
              </p>
            </Link>

            <div
              className={`rounded-xl border p-3.5 transition-all ${
                reward && BigInt(reward.cumulativeMicroUsdg || "0") > 0n
                  ? "border-[#ffc53d]/45 bg-[#ffc53d]/[0.07]"
                  : "border-white/10 bg-[#070709]/60"
              }`}
            >
              <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest">
                <span className="text-zinc-400">Step 04</span>
                <span
                  className={
                    reward && BigInt(reward.cumulativeMicroUsdg || "0") > 0n
                      ? "text-[#ffc53d] font-semibold"
                      : "text-zinc-500"
                  }
                >
                  {reward && BigInt(reward.cumulativeMicroUsdg || "0") > 0n
                    ? "Claim Ready"
                    : "Waiting for funded root"}
                </span>
              </div>
              <p className="mt-1 font-serif text-base text-white">Claim USDG</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-400">
                One-click Merkle claim on Robinhood Chain after a funded root activates.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Claim Rewards Panel */}
      <section aria-label="Claim your rewards">
        <SectionTitle
          eyebrow="EIP-712 + Merkle Claim"
          hint="Cumulative claim · one tx covers all epochs"
        >
          Your Tip Jar <em>Payouts.</em>
        </SectionTitle>
        <Card hot={Boolean(reward && BigInt(reward.cumulativeMicroUsdg || "0") > 0n)}>
          {!account ? (
            <div className="py-4">
              <p className="text-base text-zinc-300">
                Connect your wallet to inspect your cumulative USDG earnings and
                Merkle proof.
              </p>
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="pill-btn hot mt-5 cursor-pointer"
              >
                <span>Connect Wallet →</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Stamp tone="green">Wallet · {truncateAddress(account)}</Stamp>
                <button
                  type="button"
                  onClick={() => void loadReward()}
                  className="font-mono text-xs uppercase tracking-widest text-zinc-400 underline hover:text-[#ffc53d] cursor-pointer"
                >
                  ↻ Refresh Proof
                </button>
              </div>
              {loading ||
              rewardStatus === "loading" ||
              rewardStatus === "idle" ? (
                <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#070709]/80 p-8 text-center backdrop-blur-md">
                  <div className="relative mx-auto mb-4 flex h-20 w-20 items-center justify-center">
                    <div className="absolute inset-0 rounded-full border border-emerald-500/30 animate-hahaRadar" />
                    <div className="absolute inset-2 rounded-full border border-dashed border-[#ffc53d]/40 animate-hahaSpinSlow" />
                    <div className="absolute inset-4 rounded-full bg-radial from-emerald-500/15 to-transparent" />
                    <ArrowUpRight className="relative z-10 h-7 w-7 text-emerald-400" />
                  </div>
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#ffc53d] font-semibold">
                    Querying Cumulative Merkle Tree…
                  </p>
                  <p className="mt-1.5 text-xs text-zinc-400">
                    Verifying settled USDG rewards from TipJar.sol on Robinhood Chain.
                  </p>
                  <div className="mt-4 mx-auto max-w-xs h-0.5 bg-white/10 overflow-hidden rounded-full">
                    <div className="h-full w-1/3 bg-gradient-to-r from-emerald-400 via-[#ffc53d] to-amber-200 animate-hahaProgress" />
                  </div>
                </div>
              ) : rewardStatus === "error" ? (
                <div className="space-y-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-rose-300">
                    Rewards unavailable
                  </p>
                  <p className="text-sm leading-relaxed text-zinc-300">
                    {rewardError ??
                      "We could not load your allocation. This is not the same as having no rewards."}
                  </p>
                  <button
                    type="button"
                    onClick={() => void loadReward()}
                    className="pill-btn hot"
                  >
                    Retry reward lookup →
                  </button>
                </div>
              ) : rewardStatus === "empty" || !reward ? (
                <p className="text-sm leading-relaxed text-zinc-400">
                  No reward allocation exists for this wallet yet. Verified
                  stumpers and consensus Crowd votes create one after a settled
                  epoch; a verdict alone is not a balance.
                </p>
              ) : (
                <div className="space-y-5 pt-2">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <span className="font-mono text-[10px] uppercase tracking-widest text-[#ffc53d]">
                        Lifetime Allocation
                      </span>
                      <p className="display-serif mt-1 text-3xl text-white tabular-nums">
                        ${cumulativeUsdg.toFixed(2)}
                      </p>
                      <span className="font-mono text-[10px] text-zinc-500">
                        {reward.epochs ?? 1} epoch
                        {(reward.epochs ?? 1) === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div>
                      <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">
                        Already Claimed
                      </span>
                      <p className="display-serif mt-1 text-3xl text-zinc-300 tabular-nums">
                        {claimedKnown ? `$${claimedUsdg.toFixed(2)}` : "—"}
                      </p>
                      <span className="font-mono text-[10px] text-zinc-500">
                        {claimedStatus === "loading"
                          ? "Checking on-chain…"
                          : claimedStatus === "error"
                            ? "Unverified"
                            : "On-chain"}
                      </span>
                    </div>
                    <div>
                      <span className="font-mono text-[10px] uppercase tracking-widest text-[#ffc53d]">
                        Available to Claim
                      </span>
                      <p className="display-serif mt-1 text-3xl text-[#ffc53d] tabular-nums">
                        {availableUsdg !== null
                          ? `$${availableUsdg.toFixed(2)}`
                          : "—"}
                      </p>
                      <span className="font-mono text-[10px] text-zinc-500">
                        {claimedStatus === "loading"
                          ? "Verifying…"
                          : "Cumulative delta"}
                      </span>
                    </div>
                  </div>

                  {!walletReady ? (
                    <div className="rounded-xl border border-[#ffc53d]/30 bg-[#ffc53d]/10 p-4">
                      <p className="text-sm leading-relaxed text-zinc-200">
                        This browser remembers the wallet address, but no wallet
                        provider is active. We will not show a claim as
                        successful without a signer.
                      </p>
                      <button
                        type="button"
                        onClick={() => setModalOpen(true)}
                        className="pill-btn hot mt-3"
                      >
                        Reconnect Wallet →
                      </button>
                    </div>
                  ) : null}

                  {claimedStatus === "error" ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="font-mono text-xs text-rose-300">
                        {claimedError ?? "Could not verify on-chain claim status."}
                      </p>
                      <button
                        type="button"
                        onClick={() => void loadClaimed()}
                        className="pill-btn"
                      >
                        Retry verification →
                      </button>
                    </div>
                  ) : null}

                  {fullyClaimed ? (
                    <div className="space-y-2">
                      <Stamp tone="green">All caught up — fully claimed</Stamp>
                      <p className="text-sm leading-relaxed text-zinc-400">
                        Everything in this cumulative allocation has already
                        been paid to your wallet. New rewards appear here after
                        the next funded settlement epoch after its root activates.
                      </p>
                    </div>
                  ) : claimReady ? (
                    <>
                      <div className="max-w-lg">
                        <label
                          htmlFor="recipientOverride"
                          className="block font-mono text-[11px] uppercase tracking-widest text-zinc-400"
                        >
                          Destination Wallet (optional)
                        </label>
                        <input
                          id="recipientOverride"
                          type="text"
                          value={recipientOverride}
                          onChange={(e) => setRecipientOverride(e.target.value)}
                          placeholder={account}
                          className="mt-2 w-full rounded-xl border border-white/10 bg-[#070709] px-4 py-3 font-mono text-xs text-white placeholder:text-zinc-600 focus:border-[#ffc53d] focus:outline-none"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => void claim()}
                        disabled={
                          claiming ||
                          !walletReady ||
                          claimedStatus !== "ready" ||
                          availableMicro === null ||
                          availableMicro <= 0n
                        }
                        className="pill-btn hot disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                        style={{ padding: "14px 28px", fontSize: "12px" }}
                      >
                        <span>
                          {claiming
                            ? "Signing EIP-712 & claiming…"
                            : claimedStatus !== "ready"
                              ? "Verify on-chain claim status first"
                              : recipientOverride.trim()
                                ? `Claim $${(availableUsdg ?? 0).toFixed(2)} to Destination →`
                                : `Claim $${(availableUsdg ?? 0).toFixed(2)} USDG →`}
                        </span>
                      </button>
                    </>
                  ) : (
                    <div className="rounded-xl border border-white/10 bg-[#070709] p-4">
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#ffc53d]">
                        Waiting for on-chain activation
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                        {reward.activeEpoch == null
                          ? "The on-chain root state is unavailable right now. Retry before trusting any claim state."
                          : reward.pendingEpoch
                            ? `A new root (#${reward.pendingEpoch}) is staged but not active yet.`
                            : reward.rootActive === false
                              ? "No Merkle root is active yet."
                              : `Your proof is from epoch #${reward.proofEpoch ?? "?"}; the active root is epoch #${reward.activeEpoch}.`}
                        {" "}The claim button appears only when the proof's root
                        is active.
                      </p>
                      <button
                        type="button"
                        onClick={() => void loadReward()}
                        className="pill-btn mt-3"
                      >
                        ↻ Refresh proof &amp; root
                      </button>
                    </div>
                  )}

                  {txHash ? (
                    <div
                      className="rounded-xl border border-[#ffc53d]/30 bg-[#ffc53d]/10 p-4"
                      role="status"
                    >
                      <p className="font-mono text-xs text-[#ffc53d]">
                        {txStatus === "confirmed"
                          ? "Claim confirmed on-chain."
                          : txStatus === "reverted"
                            ? "Claim reverted — no funds moved."
                            : txStatus === "unknown"
                              ? "Claim submitted; confirmation still pending."
                              : "Claim submitted — waiting for confirmation…"}
                      </p>
                      <a
                        href={
                          runtime?.explorerUrl
                            ? `${runtime.explorerUrl.replace(/\/+$/, "")}/tx/${txHash}`
                            : undefined
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-zinc-300 underline"
                      >
                        {txHash.slice(0, 14)}…{txHash.slice(-8)}
                        <ArrowUpRight className="h-3 w-3" />
                      </a>
                    </div>
                  ) : null}
                </div>
              )}
              {error ? (
                <p
                  className="rounded-xl border border-rose-500/40 bg-rose-500/15 p-3 font-mono text-xs text-rose-300"
                  role="alert"
                >
                  {error}
                </p>
              ) : null}
            </div>
          )}
        </Card>
      </section>

      <WalletModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConnected={handleConnected}
      />
      <Disclaimer />
    </div>
  );
}
