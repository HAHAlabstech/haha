import test from "node:test";
import assert from "node:assert/strict";
import { shouldAnimateStraightMan } from "../lib/straightman-state";

test("Straight Man animation only runs while an answer is pending", () => {
  assert.equal(shouldAnimateStraightMan("screening", false), true);
  assert.equal(shouldAnimateStraightMan("answered", false), true);
  assert.equal(shouldAnimateStraightMan("answered", true), false);
  assert.equal(shouldAnimateStraightMan("rejected_prescreen", false), false);
  assert.equal(shouldAnimateStraightMan("straightman_failed", false), false);
  assert.equal(shouldAnimateStraightMan("in_crowd", false), false);
});
