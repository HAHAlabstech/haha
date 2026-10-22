/** Prisma where filters for public product data that must follow CHAIN_ENV. */
export function buildChainDataScope(chainId: number) {
  const publicStatuses = ["killed_it", "bombed", "in_crowd", "answered"] as const;
  return {
    killedBits: { chain_id: chainId, status: "killed_it" as const },
    publicBits: {
      chain_id: chainId,
      is_holdout: false,
      share_public: true,
      status: { in: [...publicStatuses] },
    },
    votedAssignments: {
      is_plant: false,
      voted_at: { not: null },
      bit: { chain_id: chainId },
    },
    publishedSnapshots: { chain_id: chainId, tx_hash: { not: null } },
    batchSnapshots: {
      chain_id: chainId,
      tx_hash: { not: null },
      r2_dataset_key: { not: null },
    },
    revenue: { chain_id: chainId },
  };
}
