import { NextResponse } from "next/server";
import { HAHA_CHAIN_IDS, type ChainEnv } from "@/lib/haha-chains";

export const dynamic = "force-dynamic";

/**
 * Server-only JSON-RPC proxy for Robinhood Chain (46630 testnet / 4663
 * mainnet). Keyed upstreams (Alchemy) live here — never in NEXT_PUBLIC_*
 * or the client bundle. The client talks to this route; this route fans
 * out to Alchemy -> PublicNode -> public RPC with failover.
 */

const ALLOWED_CHAIN_IDS = new Set<number>([
  HAHA_CHAIN_IDS.testnet,
  HAHA_CHAIN_IDS.mainnet,
]);

// Read-only methods plus raw-tx broadcast. Everything else (e.g.
// account management, mining, debug/trace namespaces) is rejected.
const ALLOWED_METHODS = new Set<string>([
  "eth_chainId",
  "eth_blockNumber",
  "eth_getBalance",
  "eth_getTransactionCount",
  "eth_gasPrice",
  "eth_maxPriorityFeePerGas",
  "eth_feeHistory",
  "eth_call",
  "eth_estimateGas",
  "eth_getBlockByNumber",
  "eth_getBlockByHash",
  "eth_getTransactionByHash",
  "eth_getTransactionReceipt",
  "eth_sendRawTransaction",
]);

const MAX_BODY_BYTES = 64 * 1024;

function readChainEnv(): ChainEnv {
  const raw = (process.env.CHAIN_ENV ?? "").toLowerCase();
  return raw === "mainnet" ? "mainnet" : "testnet";
}

/** Ordered upstream URLs for `env`, server-side only. */
function upstreamUrls(env: ChainEnv): string[] {
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

interface RpcRequest {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: unknown;
}

function errorResponse(
  id: string | number | null,
  code: number,
  message: string,
  status = 200,
) {
  return NextResponse.json(
    { jsonrpc: "2.0", id: id ?? null, error: { code, message } },
    { status },
  );
}

export async function POST(req: Request) {
  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return errorResponse(null, -32700, "Failed to read request body", 400);
  }
  if (raw.length > MAX_BODY_BYTES) {
    return errorResponse(null, -32600, "Request too large", 413);
  }

  let body: RpcRequest;
  try {
    body = JSON.parse(raw) as RpcRequest;
  } catch {
    return errorResponse(null, -32700, "Parse error", 400);
  }

  const { id = null, method, params } = body;
  if (typeof method !== "string" || !ALLOWED_METHODS.has(method)) {
    return errorResponse(id, -32601, "Method not allowed", 403);
  }

  const env = readChainEnv();
  const expectedChain = env === "mainnet" ? 4663 : 46630;
  // Belt-and-braces: never proxy for any other chain id.
  if (!ALLOWED_CHAIN_IDS.has(expectedChain)) {
    return errorResponse(id, -32602, "Chain not allowed", 403);
  }

  const payload = JSON.stringify({
    jsonrpc: "2.0",
    id,
    method,
    params: params ?? [],
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
      // Guard: a chain-mismatch response from a misconfigured upstream
      // must not be passed through blindly for eth_chainId.
      if (method === "eth_chainId" && typeof data.result === "string") {
        const got = Number.parseInt(data.result, 16);
        if (got !== expectedChain) {
          lastError = `Upstream chain mismatch (got ${got})`;
          continue;
        }
      }
      return NextResponse.json(data, {
        headers: { "cache-control": "no-store" },
      });
    } catch (e) {
      lastError =
        e instanceof Error ? `Upstream error: ${e.message}` : String(e);
    }
  }

  return errorResponse(id, -32000, lastError, 502);
}
