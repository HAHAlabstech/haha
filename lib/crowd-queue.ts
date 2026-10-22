export const OPEN_CROWD_BIT_STATUSES = ["disputed", "in_crowd"] as const;

export function canAcceptCrowdVote(status: string): boolean {
  return (OPEN_CROWD_BIT_STATUSES as readonly string[]).includes(status);
}

export function crowdQueueBitFilter(chainId: number) {
  return {
    chain_id: chainId,
    status: { in: [...OPEN_CROWD_BIT_STATUSES] },
  };
}
