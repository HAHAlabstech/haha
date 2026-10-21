import { NextResponse } from "next/server";
import {
  concat,
  createPublicClient,
  encodeAbiParameters,
  http,
  keccak256,
} from "viem";
import { getChainForEnv } from "@/lib/haha-chains";
import {
  getServerContracts,
  isDeployed,
  tipJarAbi,
} from "@/lib/haha-contracts";
import { readChainEnv } from "@/lib/server";

export const dynamic = "force-dynamic";

function tipJarLeafHash(account: `0x${string}`, cumulativeMicro: bigint): `0x${string}` {
  const inner = keccak256(
    encodeAbiParameters(
      [{ type: "address" }, { type: "uint256" }],
      [account, cumulativeMicro],
    ),
  );
  return keccak256(concat([inner]));
}

function verifyMerkleProof(
  proof: `0x${string}`[],
  root: `0x${string}`,
  leaf: `0x${string}`,
): boolean {
  let acc = leaf;
  for (const sib of proof) {
    acc = keccak256(
      concat(
        acc.toLowerCase() < sib.toLowerCase() ? [acc, sib] : [sib, acc],
      ),
    );
  }
  return acc.toLowerCase() === root.toLowerCase();
}

function proofEpochOf(reward: {
  merkle_proof: unknown;
  epoch: { epoch_number: number };
}): number {
  const proof = reward.merkle_proof;
  if (proof != null && typeof proof === "object" && "epoch" in proof) {
    const n = Number((proof as { epoch?: unknown }).epoch);
    if (Number.isInteger(n) && n > 0) return n;
  }
  return reward.epoch.epoch_number;
}

// GET /api/rewards/me?account=0x... (alias: ?wallet=0x...)
// Returns aggregate cumulative micro-USDG + the latest Merkle proof for
// TipJar.claim(). Aggregation is cross-epoch AND cross-role per wallet
// (matches the Merkle leaf). The response also reports which epoch the proof
// belongs to and which epoch is active on-chain, so the UI never presents a
// proof for a pending/unactivated root as immediately claimable.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("account") ?? searchParams.get("wallet") ?? "";
  const wallet = raw.toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(wallet)) {
    return NextResponse.json({ error: "invalid account" }, { status: 400 });
  }
  try {
    const { PrismaClient } = await import("@prisma/client");
    const g = globalThis as unknown as {
      __hahaPrisma?: InstanceType<typeof PrismaClient>;
    };
    g.__hahaPrisma ??= new PrismaClient();
    const prisma = g.__hahaPrisma;
    const user = await prisma.user.findUnique({
      where: { wallet },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: "no rewards" }, { status: 404 });
    }
    const rewards = await prisma.reward.findMany({
      where: { user_id: user.id },
      orderBy: [{ created_at: "asc" }],
      select: {
        amount_micro_usdg: true,
        merkle_proof: true,
        epoch_id: true,
        created_at: true,
        epoch: { select: { epoch_number: true } },
      },
    });
    if (rewards.length === 0) {
      return NextResponse.json({ error: "no rewards" }, { status: 404 });
    }
    let cumulative = 0n;
    for (const r of rewards) cumulative += BigInt(r.amount_micro_usdg);

    // Reward rows are per (epoch, role); the proof to use is the newest one.
    // The settlement worker stores the proof epoch inside the JSON and updates
    // every row for a wallet, so a wallet with no new reward still gets a
    // current proof. Fall back to the reward epoch for legacy rows.
    let latest = rewards[0]!;
    for (const r of rewards) {
      const re = proofEpochOf(r);
      const le = proofEpochOf(latest);
      if (
        re > le ||
        (re === le && r.epoch.epoch_number >= latest.epoch.epoch_number)
      ) {
        latest = r;
      }
    }
    const proof =
      latest.merkle_proof != null &&
      typeof latest.merkle_proof === "object" &&
      Array.isArray((latest.merkle_proof as { proof?: unknown }).proof)
        ? ((latest.merkle_proof as { proof: string[] }).proof as `0x${string}`[])
        : [];

    const chainEnv = readChainEnv();
    const chain = getChainForEnv(chainEnv);
    const contracts = getServerContracts();
    let activeEpoch: number | null = null;
    let pendingEpoch: number | null = null;
    let pendingEta: number | null = null;
    let rootActive = false;
    let activeMerkleRoot: `0x${string}` | null = null;
    try {
      if (isDeployed(contracts, "tipJar")) {
        const override =
          chainEnv === "mainnet"
            ? process.env.RPC_URL_MAINNET?.trim()
            : process.env.RPC_URL_TESTNET?.trim();
        const rpcUrl =
          override && override.length > 0
            ? override
            : (chain.rpcUrls.default.http[0] as string);
        const client = createPublicClient({ chain, transport: http(rpcUrl) });
        const [currentEpoch, merkleRoot, pending, eta] = await Promise.all([
          client.readContract({
            address: contracts.tipJar,
            abi: tipJarAbi,
            functionName: "currentEpoch",
          }),
          client.readContract({
            address: contracts.tipJar,
            abi: tipJarAbi,
            functionName: "merkleRoot",
          }),
          client.readContract({
            address: contracts.tipJar,
            abi: tipJarAbi,
            functionName: "pendingEpoch",
          }),
          client.readContract({
            address: contracts.tipJar,
            abi: tipJarAbi,
            functionName: "pendingEta",
          }),
        ]);
        activeEpoch = Number(currentEpoch);
        activeMerkleRoot = merkleRoot as `0x${string}`;
        rootActive =
          merkleRoot !==
          "0x0000000000000000000000000000000000000000000000000000000000000000";
        const pendingNumber = Number(pending);
        pendingEpoch = pendingNumber > 0 ? pendingNumber : null;
        const etaNumber = Number(eta);
        pendingEta = etaNumber > 0 ? etaNumber : null;
      }
    } catch {
      // Chain read is best-effort. The UI shows "verification unavailable"
      // rather than claiming the allocation is claimable.
    }

    const proofEpoch = proofEpochOf(latest);
    const proofMatchesActiveRoot =
      rootActive &&
      activeMerkleRoot !== null &&
      verifyMerkleProof(
        proof,
        activeMerkleRoot,
        tipJarLeafHash(wallet as `0x${string}`, cumulative),
      );
    // A Merkle proof is valid if it cryptographically verifies against the
    // on-chain merkleRoot (or if its epoch label equals activeEpoch when no
    // pending root is queued).
    const claimReady =
      activeEpoch !== null &&
      rootActive &&
      (proofMatchesActiveRoot ||
        (proofEpoch === activeEpoch && pendingEpoch === null));

    return NextResponse.json(
      {
        cumulativeMicroUsdg: cumulative.toString(),
        proof,
        proofEpoch,
        tipJar: contracts.tipJar,
        chainId: chain.id,
        epochs: rewards.length,
        activeEpoch,
        pendingEpoch,
        pendingEta,
        rootActive,
        claimReady,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "rewards unavailable" }, { status: 503 });
  }
}
