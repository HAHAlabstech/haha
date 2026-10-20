import { NextResponse } from "next/server";
import { HAHA_CHAIN_IDS } from "@/lib/haha-chains";
import { readChainEnv, serverRpcCall } from "@/lib/server-rpc";

export const dynamic = "force-dynamic";

/**
 * Server-only JSON-RPC proxy for Robinhood Chain (46630 testnet / 4663
 * mainnet). Keyed upstreams (Alchemy) live here — never in NEXT_PUBLIC_*
 * or the client bundle. The client talks to this route; the fanout
 * (Alchemy -> PublicNode -> public RPC) lives in lib/server-rpc.
 */

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
  const expectedChain =
    env === "mainnet" ? HAHA_CHAIN_IDS.mainnet : HAHA_CHAIN_IDS.testnet;

  try {
    const result = await serverRpcCall(env, method, params ?? [], expectedChain);
    return NextResponse.json(
      { jsonrpc: "2.0", id, result },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "All RPC upstreams failed";
    return errorResponse(id, -32000, message, 502);
  }
}
