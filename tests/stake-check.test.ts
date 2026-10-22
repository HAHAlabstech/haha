import test from "node:test";
import assert from "node:assert/strict";
import { buildCrowdStakeStatus } from "../lib/crowd-stake-status";

test("juror access follows calibration, not the extra-bit HAHA stake", () => {
  const status = buildCrowdStakeStatus({
    stakeWei: 0n,
    extraBitStakeWei: 10n * 10n ** 18n,
    stakeVerified: true,
    crowdTier: "walk_in",
    onboardingPassed: true,
  });
  assert.equal(status.juror_access_mode, "wallet_calibration");
  assert.equal(status.onboarding_passed, true);
  assert.equal(status.min_juror_stake_wei, "0");
  assert.equal(status.extra_bit_stake_wei, "10000000000000000000");
  assert.equal(status.staked_enough, null);
});

test("stake status does not approve eligibility when the chain read failed", () => {
  const status = buildCrowdStakeStatus({
    stakeWei: 0n,
    extraBitStakeWei: 10n * 10n ** 18n,
    stakeVerified: false,
    crowdTier: "walk_in",
    onboardingPassed: false,
  });
  assert.equal(status.stake_verified, false);
  assert.equal(status.juror_access_mode, "wallet_calibration");
  assert.equal(status.onboarding_passed, false);
});
