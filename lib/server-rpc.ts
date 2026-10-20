import { HAHA_CHAIN_IDS, type ChainEnv } from "@/lib/haha-chains";

/**
 * Server-only JSON-RPC fanout for Robinhood Chain (46630 testnet / 4663
 * mainnet). Keyed upstreams (Alchemy) live here — never in NEXT_PUBLIC_*
 * or the client bundle. Shared by /api/rpc (full JSON-RPC proxy) and the
 * read-only balance endpoint.
 */

export function readChainEnv(): ChainEnv {
  const raw = (process.env.CHAIN_ENV ?? "").toLowerCase();
  return raw === "mainnet" ? "mainnet" : "testnet";
}

/** Ordered upstream URLs for `env`, server-side only. */
export function upstreamUrls(env: ChainEnv): string[] {
  const alchemyKey = process.env.ALCHEMY_API_KEY?.trim();
  const override =
    env === "mainnet"
      ? process.env.RPC_URL_MAINNET?.trim()
      : process.env.RPC_URL_TESTNET?.trim();

  const urls: string[] = [];
  if (override) urls.push(override);
  if (alchemyKey) {
    urls.push(
      env === "mainnet"
        ? `https://robinhood-mainnet.g.alchemy.com/v2/${alchemyKey}`
        : `https://robinhood-testnet.g.alchemy.com/v2/${alchemyKey}`,
    );
  }
  if (env === "mainnet") {
    urls.push(
      "https://robinhood-rpc.publicnode.com",
      "https://rpc.mainnet.chain.robinhood.com",
    );
  } else {
    urls.push(
      "https://robinhood-sepolia-rpc.publicnode.com",
      "https://rpc.testnet.chain.robinhood.com",
    );
  }
  return [...new Set(urls)];
}

/**
 * POST one allowed JSON-RPC method to the first healthy upstream.
 * Returns `result` on success; throws with a readable message otherwise.
 */
export async function serverRpcCall(
  env: ChainEnv,
  method: string,
  params: unknown,
  expectedChainId?: number,
): Promise<unknown> {
  const payload = JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method,
    params: Array.isArray(params) ? params : [],
  });

  let lastError = "All RPC upstreams failed";
  for (const url of upstreamUrls(env)) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12_000);
      let res: Response;
      try {
        res = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: payload,
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }
      if (!res.ok) {
        lastError = `Upstream HTTP ${res.status}`;
        continue;
      }
      const data = (await res.json()) as {
        result?: unknown;
        error?: { message?: string };
      };
      if (data.error?.message) {
        lastError = `RPC error: ${data.error.message}`;
        continue;
      }
      const chainGuard =
        expectedChainId ??
        (env === "mainnet" ? HAHA_CHAIN_IDS.mainnet : HAHA_CHAIN_IDS.testnet);
      // Guard: a chain-mismatch response from a misconfigured upstream
      // must not be passed through blindly for eth_chainId.
      if (method === "eth_chainId" && typeof data.result === "string") {
        const got = Number.parseInt(data.result, 16);
        if (got !== chainGuard) {
          lastError = `Upstream chain mismatch (got ${got})`;
          continue;
        }
      }
      return data.result;
    } catch (e) {
      lastError =
        e instanceof Error ? `Upstream error: ${e.message}` : String(e);
    }
  }
  throw new Error(lastError);
}
