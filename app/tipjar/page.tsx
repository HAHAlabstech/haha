"use client";

import { useCallback, useEffect, useState } from "react";
import { encodeFunctionData, type Address } from "viem";
import { Card, Disclaimer, PageHero, SectionTitle } from "@/components/ui";
import WalletModal from "@/components/WalletModal";
import { tipJarAbi } from "@/lib/haha-contracts";
import type { ChainEnv, HahaRuntimeConfig } from "@/lib/haha-chains";
import { getChainId, switchOrAddChain, truncateAddress } from "@/lib/wallets";

interface RewardInfo {
  cumulativeMicroUsdg: string;
  proof: string[];
  tipJar: string;
  chainId?: number;
  epochs?: number;
}

export default function TipJarPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<import("@/lib/wallets").Eip1193Provider | null>(null);
  const [runtime, setRuntime] = useState<HahaRuntimeConfig | null>(null);
  const [contracts, setContracts] = useState<Record<string, string> | null>(null);
  const [reward, setReward] = useState<RewardInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/config")
      .then((r) => (r.ok ? r.json() : null))
      .then((cfg) => {
        if (!cancelled && cfg) {
          setRuntime(cfg as HahaRuntimeConfig);
          setContracts((cfg as { contracts?: Record<string, string> }).contracts ?? null);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Re-resolve the active EIP-1193 provider after connect (modal owns it).
  const handleConnected = useCallback((accs: string[]) => {
    setAccount(accs[0] ?? null);
    const w = window as unknown as { ethereum?: import("@/lib/wallets").Eip1193Provider };
    if (w.ethereum) setProvider(w.ethereum);
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
        // Backend not live yet: show empty reward state instead of failing.
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
    if (!provider || !account || !reward) return;
    setClaiming(true);
    setError(null);
    setTxHash(null);
    try {
      const env: ChainEnv = runtime?.chainEnv ?? "testnet";
      void env;
      const targetChain = reward.chainId || runtime?.chainId || 46_630;
      await switchOrAddChain(provider, targetChain);

      const tipJar = (contracts?.tipJar ?? reward.tipJar) as Address;
      const recipient = account as Address;
      const cumulative = BigInt(reward.cumulativeMicroUsdg);
      if (cumulative <= 0n) throw new Error("Nothing to claim yet.");
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800);
      // Fresh on-chain nonce (TipJar.nonces) — never cached, anti-replay.
      const nonceHex = (await provider.request({
        method: "eth_call",
        params: [
          {
            to: tipJar,
            data: encodeFunctionData({
              abi: [
                {
                  type: "function",
                  name: "nonces",
                  stateMutability: "view",
                  inputs: [{ name: "account", type: "address" }],
                  outputs: [{ name: "", type: "uint256" }],
                },
              ] as const,
              functionName: "nonces",
              args: [account as Address],
            }),
          },
          "latest",
        ],
      })) as string;
      const nonce = BigInt(nonceHex);
      // EIP-712 authorization signed by the earner (matches TipJar.CLAIM_TYPEHASH).
      const signature = (await provider.request({
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
      const r = `0x${signature.slice(2, 66)}` as Address;
      const s = `0x${signature.slice(66, 130)}` as Address;
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
          { v, r, s },
          (reward.proof ?? []) as readonly `0x${string}`[],
        ],
      });
      const walletChain = await getChainId(provider).catch(() => null);
      if (walletChain !== targetChain) {
        throw new Error("Wallet is on the wrong network.");
      }
      const hash = (await provider.request({
        method: "eth_sendTransaction",
        params: [{ from: account, to: tipJar, data }],
      })) as string;
      setTxHash(hash);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Claim failed in wallet.");
    } finally {
      setClaiming(false);
    }
  }, [account, contracts, provider, reward, runtime]);

  const explorer = runtime?.explorerUrl ?? "";
  const cumulativeUsdg =
    reward != null ? Number(BigInt(reward.cumulativeMicroUsdg)) / 1_000_000 : 0;

  return (
    <div className="space-y-10">
      <PageHero
        kicker="The Tip Jar"
        title="Trading fees pay the humans who beat AI."
        lede="70% of $HAHA creator fees flow here and are split daily among winners — 80% to comedians, 20% to the crowd jurors who agreed with the outcome. Claim whenever you like; one transaction covers all epochs."
      />

      <section aria-label="Claim your rewards">
        <SectionTitle hint="cumulative Merkle claim · you pay gas">
          Your rewards
        </SectionTitle>
        <Card>
          {!account ? (
            <div>
              <p className="text-sm text-zinc-300">
                Connect a wallet to see your cumulative rewards and claim
                proof.
              </p>
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="mt-3 rounded-full bg-amber-300 px-6 py-2.5 text-sm font-semibold text-black hover:bg-amber-200"
              >
                Connect wallet
              </button>
            </div>
          ) : (
            <div>
              <p className="font-mono text-sm text-emerald-200">
                {truncateAddress(account)}
              </p>
              {loading ? (
                <p className="mt-2 text-sm text-zinc-400">
                  Loading rewards…
                </p>
              ) : reward ? (
                <div className="mt-3">
                  <p className="text-3xl font-bold text-amber-50">
                    +{cumulativeUsdg.toFixed(2)}{" "}
                    <span className="text-base font-medium text-zinc-400">
                      USDG lifetime
                    </span>
                  </p>
                  <button
                    type="button"
                    onClick={() => void claim()}
                    disabled={claiming}
                    className="mt-3 rounded-full bg-amber-300 px-6 py-2.5 text-sm font-semibold text-black hover:bg-amber-200 disabled:opacity-50"
                  >
                    {claiming ? "Waiting for wallet…" : "Claim to this wallet"}
                  </button>
                  {txHash ? (
                    <p className="mt-2 font-mono text-xs text-emerald-200" role="status">
                      Claimed: {txHash}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="mt-2 text-sm text-zinc-400">
                  No rewards yet — or the settlement backend isn&apos;t live.
                  Killed-it bits in a settled epoch will show up here with a
                  Merkle proof.
                </p>
              )}
              {error ? (
                <p className="mt-2 text-sm text-red-200" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
          )}
        </Card>
      </section>

      <section aria-label="How the Tip Jar works">
        <SectionTitle>Money in, money out</SectionTitle>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <h3 className="font-semibold text-amber-50">In: creator fees</h3>
            <p className="mt-1 font-mono text-2xl text-zinc-200">—</p>
            <p className="mt-1 text-xs text-zinc-500">
              Claimed from the Pons fee escrow and split 70 / 30.
            </p>
          </Card>
          <Card>
            <h3 className="font-semibold text-amber-50">Out: paid to humans</h3>
            <p className="mt-1 font-mono text-2xl text-zinc-200">—</p>
            <p className="mt-1 text-xs text-zinc-500">
              Total USDG claimed by comedians and jurors.
            </p>
          </Card>
          <Card>
            <h3 className="font-semibold text-amber-50">Mic Drop burns</h3>
            <p className="mt-1 font-mono text-2xl text-zinc-200">—</p>
            <p className="mt-1 text-xs text-zinc-500">
              The other 30% buys $HAHA and burns it. History below.
            </p>
          </Card>
        </div>
      </section>

      <section aria-label="Mic Drop history">
        <SectionTitle>Mic Drop history</SectionTitle>
        <Card>
          <p className="text-sm text-zinc-400">
            No burns yet. Each buyback-and-burn will list amount in, $HAHA
            burned, and the explorer transaction.
            {explorer ? (
              <>
                {" "}
                <a
                  href={explorer}
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-zinc-200"
                >
                  Open the explorer →
                </a>
              </>
            ) : null}
          </p>
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
