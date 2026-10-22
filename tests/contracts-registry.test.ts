import test from "node:test";
import assert from "node:assert/strict";
import {
  ACTIVE_MAINNET_CONTRACTS,
  MAINNET_CONTRACTS_CHAIN,
  getContractExplorerUrl,
} from "../lib/deployed-contracts";
import { copyContractAddress } from "../lib/copy-contract-address";

test("active contracts registry contains exactly six mainnet product addresses", () => {
  assert.equal(MAINNET_CONTRACTS_CHAIN.id, 4663);
  assert.equal(MAINNET_CONTRACTS_CHAIN.explorerUrl, "https://robinhoodchain.blockscout.com");
  assert.equal(ACTIVE_MAINNET_CONTRACTS.length, 6);
  const addresses = ACTIVE_MAINNET_CONTRACTS.map((contract) => contract.address.toLowerCase());
  assert.equal(new Set(addresses).size, 6);
  for (const address of addresses) assert.match(address, /^0x[0-9a-f]{40}$/);
  assert.equal(ACTIVE_MAINNET_CONTRACTS.find((contract) => contract.symbol === "USDG")?.category, "external_dependency");
});

test("legacy and held contracts are not in the current product directory", () => {
  const names = ACTIVE_MAINNET_CONTRACTS.map((contract) => contract.name);
  assert.deepEqual(names, ["HAHA", "CrowdStaking", "TipJar", "ProducerGateway", "VaultRegistry", "USDG"]);
  assert.equal(names.some((name) => /FeeSplitter|MicDrop|Adapter|Mock/i.test(name)), false);
});

test("contract explorer links point to the exact Blockscout address path", () => {
  assert.equal(
    getContractExplorerUrl(ACTIVE_MAINNET_CONTRACTS[0].address),
    "https://robinhoodchain.blockscout.com/address/0xd2Da320EF90FB76809587C830A33a49512bA90D9",
  );
});

test("copy helper writes exactly the selected contract address", async () => {
  const writes: string[] = [];
  const address = ACTIVE_MAINNET_CONTRACTS[0].address;
  const copied = await copyContractAddress(address, {
    writeText: async (value) => { writes.push(value); },
  });
  assert.equal(copied, true);
  assert.deepEqual(writes, [address]);
});

test("copy helper reports unsupported or denied clipboard without throwing", async () => {
  assert.equal(await copyContractAddress("0x1234", undefined), false);
  assert.equal(await copyContractAddress("0x1234", {
    writeText: async () => { throw new Error("denied"); },
  }), false);
});
