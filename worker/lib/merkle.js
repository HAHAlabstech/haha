"use strict";
// Cumulative Merkle tree (plan §5.1 TipJar). Leaf MUST be double-hashed on
// BOTH sides (contract + worker) or every proof fails:
//   leaf = keccak256(bytes.concat(keccak256(abi.encode(account, cumulativeMicroUsdg))))
// Canonical construction with @openzeppelin/merkle-tree (same pinned OZ
// version as contracts): feed the INNER hash as a bytes32 value, so OZ's
// leaf = keccak256(abi.encode(inner)) == keccak256(bytes.concat(inner)).
// BigInt micro only; tree JSON mirrored to R2 private/merkle/epoch-{n}.json.

const { keccak256, encodeAbiParameters, concat } = require("viem");

function innerHash(account, cumulativeMicro) {
  return keccak256(encodeAbiParameters(
    [{ type: "address" }, { type: "uint256" }],
    [account, BigInt(cumulativeMicro)],
  ));
}

function leafHash(account, cumulativeMicro) {
  return keccak256(concat([innerHash(account, cumulativeMicro)]));
}

// pairs: [{ account, cumulativeMicro: bigint|number|string }]
// Returns { root, proofs: Map(account->hex[]), treeJson }.
async function buildTree(pairs) {
  const inners = pairs.map((p) => ({ account: p.account, cum: BigInt(p.cumulativeMicro).toString(), inner: innerHash(p.account, p.cumulativeMicro) }));
  try {
    const { StandardMerkleTree } = await import("@openzeppelin/merkle-tree");
    const tree = StandardMerkleTree.of(inners.map((e) => [e.inner]), ["bytes32"]);
    const proofs = new Map();
    for (const [i, e] of tree.entries()) proofs.set(inners[i].account, tree.getProof(i));
    const treeJson = JSON.stringify({ root: tree.root, leaves: inners.map((e) => ({ account: e.account, cumulativeMicro: e.cum, inner: e.inner, leaf: leafHash(e.account, e.cum) })) });
    return { root: tree.root, proofs, treeJson };
  } catch (err) {
    console.warn(`[merkle] OZ lib unavailable (${err.message}) — minimal sorted-pair fallback with identical leaf hashing`);
    const leaves = inners
      .map((e) => ({ ...e, hash: keccak256(concat([e.inner])) }))
      .sort((a, b) => (a.hash < b.hash ? -1 : 1));
    const layers = [leaves.map((l) => l.hash)];
    while (layers[layers.length - 1].length > 1) {
      const prev = layers[layers.length - 1];
      const next = [];
      for (let i = 0; i < prev.length; i += 2) {
        const a = prev[i], b = prev[i + 1] ?? prev[i];
        const [x, y] = a < b ? [a, b] : [b, a];
        next.push(keccak256(concat([x, y])));
      }
      layers.push(next);
    }
    const root = layers[layers.length - 1][0] ?? keccak256("0x");
    const proofs = new Map();
    leaves.forEach((leaf, idx) => {
      const proof = [];
      let i = idx;
      for (let l = 0; l < layers.length - 1; l++) {
        proof.push(i % 2 === 0 ? (layers[l][i + 1] ?? layers[l][i]) : layers[l][i - 1]);
        i = Math.floor(i / 2);
      }
      proofs.set(leaf.account, proof);
    });
    return { root, proofs, treeJson: JSON.stringify({ root, leaves: leaves.map((l) => ({ account: l.account, cumulativeMicro: l.cum, leaf: l.hash })) }) };
  }
}

module.exports = { innerHash, leafHash, buildTree };
