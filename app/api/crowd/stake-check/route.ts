import { NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { getChainForEnv } from "@/lib/haha-chains";
import { crowdStakingAbi, getServerContracts, isDeployed } from "@/lib/haha-contracts";
import { getPrisma, readChainEnv } from "@/lib/server";
import { buildCrowdStakeStatus } from "@/lib/crowd-stake-status";

export const dynamic = "force-dynamic";

// GET /api/crowd/stake-check?wallet=0x... -> reports calibration and optional on-chain stake telemetry.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = (searchParams.get("wallet") ?? "").toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(wallet)) {
    return NextResponse.json({ error: "invalid wallet" }, { status: 400 });
  }

  const contracts = getServerContracts(process.env);
  const chainEnv = readChainEnv();
  const chain = getChainForEnv(chainEnv);
  const override =
    chainEnv === "mainnet"
      ? process.env.RPC_URL_MAINNET?.trim()
      : process.env.RPC_URL_TESTNET?.trim();
  const rpcUrl =
    override && override.length > 0
      ? override
      : (chain.rpcUrls.default.http[0] as string);

  let stakeWei = 0n;
  let extraBitStakeWei = 0n;
  let onchainChecked = false;

  if (rpcUrl && isDeployed(contracts, "crowdStaking")) {
    try {
      const client = createPublicClient({ chain, transport: http(rpcUrl) });
      const [s, extraBit] = await Promise.all([
        client.readContract({
          address: contracts.crowdStaking,
          abi: crowdStakingAbi,
          functionName: "stakes",
          args: [wallet as `0x${string}`],
        }),
        client.readContract({
          address: contracts.crowdStaking,
          abi: crowdStakingAbi,
          functionName: "extraBitStake",
        }),
      ]);
      stakeWei = s as bigint;
      extraBitStakeWei = extraBit as bigint;
      onchainChecked = true;
    } catch {
      // Keep stake telemetry unverified if the RPC is unreachable.
    }
  }

  let dbTier = "walk_in";
  let onboardingPassed = false;
  try {
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({ where: { wallet } });
    if (user) {
      dbTier = user.crowd_tier;
      onboardingPassed = user.onboarding_passed;
    }
  } catch {
    // non-fatal
  }

  return NextResponse.json(
    {
      wallet,
      ...buildCrowdStakeStatus({
        stakeWei,
        extraBitStakeWei,
        stakeVerified: onchainChecked,
        crowdTier: dbTier,
        onboardingPassed,
      }),
    },
    { headers: { "cache-control": "no-store" } },
  );
}
