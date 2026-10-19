"use client";

import { useCallback, useEffect, useState } from "react";
import { encodeFunctionData, type Address } from "viem";
import { Card, Disclaimer, SectionTitle, Stamp } from "@/components/ui";
import WalletModal from "@/components/WalletModal";
import { CheckCircle2, ArrowUpRight, Coins } from "lucide-react";
import { tipJarAbi } from "@/lib/haha-contracts";
import type { ChainEnv, HahaRuntimeConfig } from "@/lib/haha-chains";
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
  const [recipientOverride, setRecipientOverride] = useState("");
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    if (!account) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(
        `/api/rewards/me?account=${encodeURIComponent(account)}`,
      );
      if (!r.ok) {
        setReward(null);
        return;
      }
      const data = (await r.json()) as RewardInfo;
      setReward(data);
    } catch {
      setReward(null);
    } finally {
      setLoading(false);
    }
  }, [account]);

  useEffect(() => {
    if (account) void loadReward();
  }, [account, loadReward]);

  const claim = useCallback(async () => {
    const activeProv = provider ?? (await resolveActiveProvider());
    if (!activeProv || !account || !reward) return;
    setClaiming(true);
    setError(null);
    setTxHash(null);
    try {
      const env: ChainEnv = runtime?.chainEnv ?? "testnet";
      void env;
      const targetChain = reward.chainId || runtime?.chainId || 46_630;
      await switchOrAddChain(activeProv, targetChain);

      const tipJar = (contracts?.tipJar ?? reward.tipJar) as Address;
      const cleanOverride = recipientOverride.trim();
      if (cleanOverride && !/^0x[0-9a-fA-F]{40}$/.test(cleanOverride)) {
        throw new Error("Invalid alternate recipient address.");
      }
      const recipient = (cleanOverride || account) as Address;
      const cumulative = BigInt(reward.cumulativeMicroUsdg);
      if (cumulative <= 0n) throw new Error("Nothing to claim yet.");
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Claim failed in wallet.");
    } finally {
      setClaiming(false);
    }
  }, [account, contracts, provider, recipientOverride, reward, runtime]);

  const cumulativeUsdg =
    reward != null ? Number(BigInt(reward.cumulativeMicroUsdg)) / 1_000_000 : 0;
  const inEscrowUsdg = fmtUsdg(summary?.escrow?.tipJar?.microUsdg);
  const paidOutUsdg = fmtUsdg(summary?.totalPaidOutMicroUsdg);
  const micDropUsdg = fmtUsdg(summary?.escrow?.micDrop?.microUsdg);

  return (
    <div className="mx-auto max-w-[1440px] px-[clamp(16px,3vw,36px)] py-8 space-y-12">
      {/* Header */}
      <div className="grid gap-8 border-b border-white/10 pb-8 lg:grid-cols-[1.3fr_1fr] lg:items-end">
        <div>
          <span className="eyebrow">The Tip Jar · Daily Merkle Escrow</span>
          <h1 className="display-serif mt-2 text-4xl text-[#fff6ed] md:text-5xl">
            Trading fees pay the humans who <em>beat AI.</em>
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
            70% of creator fees and producer revenues flow into{" "}
            <code className="font-mono text-xs text-[#efe8dc]">TipJar.sol</code>{" "}
            and are settled daily via cumulative Merkle trees — 80% to winning
            comedians, 20% to consensus Crowd jurors. Claim any time in a single
            transaction.
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
            <dd className="display-serif text-3xl text-emerald-400 tabular-nums">
              {paidOutUsdg}
            </dd>
          </div>
          <div>
            <dt>Mic Drop Reserve</dt>
            <dd className="font-mono text-base text-[#fff6ed] tabular-nums">
              {micDropUsdg}
            </dd>
          </div>
          <div>
            <dt>Latest Epoch</dt>
            <dd className="font-mono text-base text-[#fff6ed]">
              #{summary?.latestEpoch ?? 0}
            </dd>
          </div>
        </dl>
      </div>

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
              {loading ? (
                <p className="font-mono text-xs uppercase tracking-widest text-zinc-400">
                  Querying cumulative Merkle tree…
                </p>
              ) : reward && BigInt(reward.cumulativeMicroUsdg || "0") > 0n ? (
                <div className="space-y-5 pt-2">
                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-[#ffc53d]">
                      Lifetime Cumulative Allocation
                    </span>
                    <p className="display-serif mt-1 text-5xl text-[#fff6ed] tabular-nums">
                      +${cumulativeUsdg.toFixed(2)}{" "}
                      <span className="font-mono text-sm uppercase tracking-widest text-zinc-400">
                        USDG ({reward.epochs ?? 1} epoch
                        {(reward.epochs ?? 1) === 1 ? "" : "s"})
                      </span>
                    </p>
                  </div>

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
                      className="mt-2 w-full rounded-xl border border-white/10 bg-[#0c0a08] px-4 py-3 font-mono text-xs text-[#fff6ed] placeholder:text-zinc-600 focus:border-[#ffc53d] focus:outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => void claim()}
                    disabled={claiming}
                    className="pill-btn hot disabled:opacity-50 cursor-pointer"
                    style={{ padding: "14px 28px", fontSize: "12px" }}
                  >
                    <span>
                      {claiming
                        ? "Signing EIP-712 & claiming…"
                        : recipientOverride.trim()
                          ? "Claim to Destination Wallet →"
                          : "Claim USDG to This Wallet →"}
                    </span>
                  </button>

                  {txHash ? (
                    <p
                      className="font-mono text-xs text-emerald-400 flex items-center gap-1.5"
                      role="status"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Claim transaction broadcast: {txHash}</span>
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm leading-relaxed text-zinc-400">
                  No claimable rewards yet. Verified stumpers and consensus
                  Crowd votes in a settled epoch automatically appear here with
                  their Merkle proof.
                </p>
              )}
              {error ? (
                <p
                  className="rounded-xl border border-rose-500/40 bg-rose-500/15 p-3 font-mono text-xs text-[#ffc53d]"
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
