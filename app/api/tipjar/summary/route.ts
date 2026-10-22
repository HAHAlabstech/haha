import { NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { getChainForEnv } from "@/lib/haha-chains";
import {
  erc20Abi,
  getServerContracts,
  isDeployed,
  tipJarAbi,
} from "@/lib/haha-contracts";
import { getPrisma, readChainEnv } from "@/lib/server";
import { epochScope } from "@/worker/lib/funding";
import { formatUsdgMicroDisplay } from "@/lib/usdg-display";

export const dynamic = "force-dynamic";

// GET /api/tipjar/summary -> escrow balances via server-side viem reads
// (best-effort, zeros on failure), launch proof, MicDrop history, and
// feeRecipient / takeover / freeze status fields.
export async function GET() {
  const chainEnv = readChainEnv();
  const chain = getChainForEnv(chainEnv);
  const contracts = getServerContracts();

  let tipJarMicroUsdg = "0";
  let feeSplitterMicroUsdg = "0";
  let micDropMicroUsdg = "0";
  let totalPaidOutMicroUsdg = "0";
  let chainEpoch = 0;

  try {
    const override =
      chainEnv === "mainnet"
        ? process.env.RPC_URL_MAINNET?.trim()
        : process.env.RPC_URL_TESTNET?.trim();
    const rpcUrl =
      override && override.length > 0
        ? override
        : (chain.rpcUrls.default.http[0] as string);
    const client = createPublicClient({
      chain,
      transport: http(rpcUrl),
    });

    if (isDeployed(contracts, "usdg")) {
      const reads = await Promise.allSettled([
        isDeployed(contracts, "tipJar")
          ? client.readContract({
              address: contracts.usdg,
              abi: erc20Abi,
              functionName: "balanceOf",
              args: [contracts.tipJar],
            })
          : Promise.resolve(0n),
        isDeployed(contracts, "feeSplitter")
          ? client.readContract({
              address: contracts.usdg,
              abi: erc20Abi,
              functionName: "balanceOf",
              args: [contracts.feeSplitter],
            })
          : Promise.resolve(0n),
        isDeployed(contracts, "micDrop")
          ? client.readContract({
              address: contracts.usdg,
              abi: erc20Abi,
              functionName: "balanceOf",
              args: [contracts.micDrop],
            })
          : Promise.resolve(0n),
        isDeployed(contracts, "tipJar")
          ? client.readContract({
              address: contracts.tipJar,
              abi: tipJarAbi,
              functionName: "totalPaidOut",
            })
          : Promise.resolve(0n),
        isDeployed(contracts, "tipJar")
          ? client.readContract({
              address: contracts.tipJar,
              abi: tipJarAbi,
              functionName: "currentEpoch",
            })
          : Promise.resolve(0n),
      ]);
      if (reads[0].status === "fulfilled") {
        tipJarMicroUsdg = (reads[0].value as bigint).toString();
      }
      if (reads[1].status === "fulfilled") {
        feeSplitterMicroUsdg = (reads[1].value as bigint).toString();
      }
      if (reads[2].status === "fulfilled") {
        micDropMicroUsdg = (reads[2].value as bigint).toString();
      }
      if (reads[3].status === "fulfilled") {
        totalPaidOutMicroUsdg = (reads[3].value as bigint).toString();
      }
      if (reads[4].status === "fulfilled") {
        chainEpoch = Number(reads[4].value as bigint);
      }
    }
  } catch {
    // RPC unreachable: fall back to 0 strings.
  }

  let micDropEvents: {
    id: string;
    asset_in: string;
    amount_in_base_units: string;
    haha_bought_wei: string;
    haha_burned_wei: string;
    tx_hash: string;
    executed_at: string;
  }[] = [];
  let latestEpoch = 0;

  try {
    const prisma = getPrisma();
    const [drops, ep] = await Promise.all([
      prisma.micDropEvent.findMany({
        orderBy: { executed_at: "desc" },
        take: 10,
      }),
      prisma.epoch.findFirst({
        where: epochScope({ chainId: chain.id, tipJar: contracts.tipJar }),
        orderBy: { epoch_number: "desc" },
        select: { epoch_number: true },
      }),
    ]);
    micDropEvents = drops.map((d) => ({
      id: d.id,
      asset_in: d.asset_in,
      amount_in_base_units: d.amount_in_base_units.toString(),
      haha_bought_wei: d.haha_bought_wei.toString(),
      haha_burned_wei: d.haha_burned_wei.toString(),
      tx_hash: d.tx_hash,
      executed_at: d.executed_at.toISOString(),
    }));
    latestEpoch = ep?.epoch_number ?? 0;
  } catch {
    // DB optional for summary endpoint.
  }

  const tipJarMicro = Number(tipJarMicroUsdg) || 0;

  return NextResponse.json(
    {
      chainEnv,
      chainId: chain.id,
      // Hero/header badge number (USDG, whole units) consumed by landing +
      // AppShell navbar. Keep in sync with escrow.tipJar.microUsdg.
      dailyPoolUSDG: Math.round(tipJarMicro / 1_000_000),
      dailyPoolUSDGDisplay: formatUsdgMicroDisplay(tipJarMicroUsdg),
      escrow: {
        tipJar: { address: contracts.tipJar, microUsdg: tipJarMicroUsdg },
        feeSplitter: {
          address: contracts.feeSplitter,
          microUsdg: feeSplitterMicroUsdg,
        },
        micDrop: { address: contracts.micDrop, microUsdg: micDropMicroUsdg },
      },
      totalPaidOutMicroUsdg,
      // Chain is the source of truth; DB epoch rows lag the rewrite path.
      latestEpoch: chainEpoch || latestEpoch,
      micDropEvents,
      launched: isDeployed(contracts, "hahaToken"),
      launchProof: {
        txHash: null,
        exemptCount: 0,
        note: "Standalone HAHA deployment; no Pons launch proof or creator-fee exemptions are assumed",
      },
      feeRecipient: contracts.feeSplitter,
      takeoverArmed: false,
      frozen: false,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
