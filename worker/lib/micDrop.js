// MicDrop V4 buyback helper: safe buyback caps, multi-hop routing, and per-hop price floors.

function maxSafeBuyback(balance, reserve, maxPercentBps = 200, maxImpactBps = 100) {
  const balBi = BigInt(balance);
  const resBi = BigInt(reserve);
  if (resBi <= 0n || balBi <= 0n) return 0n;

  const percentBps = BigInt(maxPercentBps);
  const impactBps = BigInt(maxImpactBps);

  const reserveCap = (resBi * percentBps) / 10_000n;
  const impactCap = (resBi * impactBps) / (10_000n - impactBps);

  const cap = reserveCap < impactCap ? reserveCap : impactCap;
  return balBi < cap ? balBi : cap;
}

function buildHopQuotes(keys, startCurrency) {
  if (!Array.isArray(keys) || keys.length === 0) {
    throw new Error("route starts with empty pool keys");
  }

  let current = String(startCurrency).toLowerCase();
  const hops = [];

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const c0 = String(key.currency0).toLowerCase();
    const c1 = String(key.currency1).toLowerCase();

    if (current !== c0 && current !== c1) {
      if (i === 0) {
        throw new Error(`route starts with invalid input currency: expected ${current}`);
      }
      throw new Error(`route disconnected at hop ${i}: currency mismatch with ${current}`);
    }

    const zeroForOne = current === c0;
    const input = zeroForOne ? key.currency0 : key.currency1;
    const output = zeroForOne ? key.currency1 : key.currency0;

    hops.push({
      key,
      input,
      output,
      zeroForOne,
    });

    current = String(output).toLowerCase();
  }

  return hops;
}

function hopFloorX36(amountIn, amountOut, slippageBps = 100) {
  const inBi = BigInt(amountIn);
  const outBi = BigInt(amountOut);
  if (inBi <= 0n || outBi <= 0n) return 0n;

  const margin = 10_000n - BigInt(slippageBps);
  return (outBi * (1n << 36n) * margin / 10_000n) / inBi;
}

module.exports = {
  maxSafeBuyback,
  buildHopQuotes,
  hopFloorX36,
};
