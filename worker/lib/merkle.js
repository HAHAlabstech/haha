"use strict";
// Cumulative Merkle tree (plan §5.1 TipJar).
// THE LEAF MUST BE EXACTLY TipJar.leafHash(account, cumulativeMicro):
//   leaf = keccak256(bytes.concat(keccak256(abi.encode(account, cumulativeMicro))))
// The contract already applies the double hash; the backend keeps leaves
// PRE-HASHED and must NOT hash them again. A previous draft fed
// keccak(abi.encode(account, cumulative)) into StandardMerkleTree, whose
// standardLeafHash keccak'd it once more — leaves ended TRIPLE-hashed and
// every claim reverted InvalidProof on-chain, even though the staged root
// matched (the on-chain root was built from those same wrong leaves).
// Backend tree = @openzeppelin/merkle-tree SimpleMerkleTree, which takes the
// leaf values VERBATIM (formatLeaf = abi.encode(["bytes32"], [v]) = identity
// for 32-byte hex) and hashes sorted pairs with keccak256(msg-order) — the
// exact semantics of the on-chain OZ Solidity MerkleProof.verify. When OZ
// is unavailable we fail LOUD: a silently inconsistent tree is worse than
// no settlement. Empty reward sets produce the canonical empty root.
// BigInt micro only; tree JSON mirrored to R2 private/merkle/epoch-{n}.json.

const { keccak256, encodeAbiParameters, concat } = require("viem");

function innerHash(account, cumulativeMicro) {
  return keccak256(encodeAbiParameters(
    [{ type: "address" }, { type: "uint256" }],
    [account, BigInt(cumulativeMicro)],
  ));
}

/// Canonical TipJar-compatible leaf (double-hash): keccak(inner).
function leafHash(account, cumulativeMicro) {
  return keccak256(concat([innerHash(account, cumulativeMicro)]));
}

// pairs: [{ account, cumulativeMicro: bigint|number|string }]
// Returns { root, proofs: Map(account->hex[]), treeJson }.
async function buildTree(pairs) {
  if (!pairs || pairs.length === 0) {
    const empty = keccak256("0x");
    return { root: empty, proofs: new Map(), treeJson: JSON.stringify({ root: empty, leaves: [] }) };
  }

  const { SimpleMerkleTree } = await import("@openzeppelin/merkle-tree");

  const entries = pairs.map((p) => ({
    account: String(p.account).toLowerCase(),
    cumulativeMicro: BigInt(p.cumulativeMicro).toString(),
    leaf: leafHash(p.account, p.cumulativeMicro),
  }));

  // Simple tree keeps the 32-byte leaves verbatim.
  const tree = SimpleMerkleTree.of(entries.map((e) => e.leaf));

  // Map leaf -> value index (independent of how OZ orders values).
  const leafIndex = new Map();
  for (const [i, leafHex] of tree.entries()) {
    if (leafIndex.has(leafHex)) throw new Error("[merkle] duplicate leaf hash in reward set");
    leafIndex.set(leafHex, i);
  }

  const proofs = new Map();
  for (const e of entries) {
    const idx = leafIndex.get(e.leaf);
    if (idx === undefined) throw new Error("[merkle] internal error: leaf missing from tree entries");
    const proof = tree.getProof(idx);

    // Fail loud BEFORE the root ever reaches the chain: the proof must roll
    // leaf -> root with plain sorted-pair keccak (MerkleProof.verify semantics).
    let acc = e.leaf;
    for (const sib of proof) {
      acc = keccak256(concat(acc < sib ? [acc, sib] : [sib, acc]));
    }
    if (acc !== tree.root) {
      throw new Error(`[merkle] self-verification failed for ${e.account}: got ${acc} expected ${tree.root}`);
    }
    proofs.set(e.account, proof);
  }

  const treeJson = JSON.stringify({
    root: tree.root,
    leaves: entries.map((e) => ({ account: e.account, cumulativeMicro: e.cumulativeMicro, leaf: e.leaf })),
  });
  return { root: tree.root, proofs, treeJson };
}

module.exports = { innerHash, leafHash, buildTree };
