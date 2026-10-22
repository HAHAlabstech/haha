import test from "node:test";
import assert from "node:assert/strict";
import { ensureSiweSession, type Eip1193Provider } from "../lib/wallets";

test("SIWE reconciles a stale saved account with the wallet's currently exposed account", async () => {
  const stale = "0x1111111111111111111111111111111111111111";
  const active = "0x560E0000000000000000000000000000000014AD";
  let signedAddress = "";
  let signedMessage = "";
  const provider: Eip1193Provider = {
    async request({ method, params }) {
      if (method === "eth_accounts") return [active];
      if (method === "eth_chainId") return "0x1237";
      if (method === "personal_sign") {
        const [message, address] = params as [string, string];
        signedAddress = address;
        signedMessage = message;
        if (address.toLowerCase() !== active.toLowerCase()) {
          throw new Error("signature address does not match connected wallet");
        }
        return `0x${"1".repeat(130)}`;
      }
      throw new Error(`Unexpected provider request: ${method}`);
    },
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({
    ok: true,
    wallet: active.toLowerCase(),
    sessionToken: `${active.toLowerCase()}.nonce.${Date.now() + 86_400_000}.mac`,
  }), { status: 200, headers: { "content-type": "application/json" } })) as typeof fetch;

  try {
    const result = await ensureSiweSession(provider, stale);
    assert.equal(result.ok, true);
    assert.equal(result.wallet, active.toLowerCase());
    assert.equal(signedAddress.toLowerCase(), active.toLowerCase());
    assert.ok(signedMessage.includes(active));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
