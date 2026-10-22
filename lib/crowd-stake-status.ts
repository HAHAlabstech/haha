export interface CrowdStakeStatusInput {
  stakeWei: bigint;
  extraBitStakeWei: bigint;
  stakeVerified: boolean;
  crowdTier: string;
  onboardingPassed: boolean;
}

/**
 * Juror eligibility is the signed-in wallet + calibration flow. On-chain stake is
 * telemetry only; `extraBitStakeWei` is for above-quota bits, not juror access.
 */
export function buildCrowdStakeStatus(input: CrowdStakeStatusInput) {
  return {
    ok: true as const,
    mode: "calibration" as const,
    juror_access_mode: "wallet_calibration" as const,
    stake_wei: input.stakeWei.toString(),
    min_juror_stake_wei: "0",
    extra_bit_stake_wei: input.extraBitStakeWei.toString(),
    stake_verified: input.stakeVerified,
    staked_enough: null,
    crowd_tier: input.crowdTier,
    onboarding_passed: input.onboardingPassed,
  };
}
