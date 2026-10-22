import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(`${process.cwd()}/package.json`);
let shareCardModule: { shareCardUrlForBit?: (input: { status: string; hasOutcome: boolean; storedUrl?: string | null }) => string | null } | null = null;
try {
  shareCardModule = require("./lib/share-card-state");
} catch {
  // RED phase: assert the missing share-card guard is observable.
}

test("does not expose a share-card URL for a self-conceded Got It bit", () => {
  const resolve = shareCardModule?.shareCardUrlForBit;
  assert.equal(typeof resolve, "function");
  if (!resolve) throw new Error("shareCardUrlForBit is missing");
  assert.equal(resolve({ status: "bombed", hasOutcome: false, storedUrl: null }), null);
});

test("does not expose a card URL until a Crowd outcome card has been stored", () => {
  const resolve = shareCardModule?.shareCardUrlForBit;
  assert.equal(typeof resolve, "function");
  if (!resolve) throw new Error("shareCardUrlForBit is missing");
  assert.equal(resolve({ status: "killed_it", hasOutcome: true, storedUrl: null }), null);
});

test("exposes the stored card URL after a Crowd outcome has been rendered", () => {
  const resolve = shareCardModule?.shareCardUrlForBit;
  assert.equal(typeof resolve, "function");
  if (!resolve) throw new Error("shareCardUrlForBit is missing");
  const url = "https://cards.example/bit.png";
  assert.equal(resolve({ status: "killed_it", hasOutcome: true, storedUrl: url }), url);
});
