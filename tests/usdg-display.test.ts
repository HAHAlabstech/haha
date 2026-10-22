import test from "node:test";
import assert from "node:assert/strict";
import { formatUsdgMicroDisplay } from "../lib/usdg-display";

test("formats fractional micro-USDG pools to two visible decimals", () => {
  assert.equal(formatUsdgMicroDisplay("400000"), "0.40");
  assert.equal(formatUsdgMicroDisplay("1000000"), "1.00");
  assert.equal(formatUsdgMicroDisplay("999999"), "1.00");
  assert.equal(formatUsdgMicroDisplay("0"), "0.00");
});

test("formats large USDG balances without converting through imprecise Number", () => {
  assert.equal(formatUsdgMicroDisplay("123456789012345678"), "123,456,789,012.35");
  assert.equal(formatUsdgMicroDisplay("not-a-number"), "—");
});
