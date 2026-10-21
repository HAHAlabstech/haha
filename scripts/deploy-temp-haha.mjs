import { createPublicClient, createWalletClient, http, fallback, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config();

const pk = process.env.OPERATOR_PRIVATE_KEY;
if (!pk) {
  console.error("OPERATOR_PRIVATE_KEY is missing from .env");
  process.exit(1);
}

const account = privateKeyToAccount(pk);
console.log("Deployer address:", account.address);

const rpcs = [process.env.RPC_URL_MAINNET, "https://robinhood-rpc.publicnode.com"].filter(Boolean);
const transport = fallback(rpcs.map(u => http(u, { timeout: 15000 })));

const chain = {
  id: 4663,
  name: 'Robinhood Chain',
  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: rpcs } }
};

const publicClient = createPublicClient({ chain, transport });
const walletClient = createWalletClient({ chain, transport, account });

async function main() {
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`Deployer balance: ${formatEther(balance)} ETH`);
  if (balance === 0n) {
    console.error("Deployer has 0 ETH!");
    process.exit(1);
  }

  const artifactPath = path.resolve('contracts/out/MockHAHA.sol/MockHAHA.json');
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  const bytecode = artifact.bytecode.object;
  const abi = artifact.abi;

  console.log("Broadcasting deployment of temporary $HAHA token on Robinhood Chain Mainnet (4663)...");
  const hash = await walletClient.deployContract({
    abi,
    bytecode,
    account
  });

  console.log("Tx hash:", hash);
  console.log("Waiting for transaction receipt...");
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  if (receipt.status !== 'success') {
    console.error("Deployment failed! Status:", receipt.status);
    process.exit(1);
  }

  const tokenAddress = receipt.contractAddress;
  console.log("🎉 SUCCESS! $HAHA deployed at:", tokenAddress);
  console.log("Block number:", receipt.blockNumber);
  console.log("Gas used:", receipt.gasUsed.toString());

  // Verify on-chain details
  const name = await publicClient.readContract({ address: tokenAddress, abi, functionName: 'name' });
  const symbol = await publicClient.readContract({ address: tokenAddress, abi, functionName: 'symbol' });
  const decimals = await publicClient.readContract({ address: tokenAddress, abi, functionName: 'decimals' });
  const supply = await publicClient.readContract({ address: tokenAddress, abi, functionName: 'totalSupply' });

  console.log("\n--- Verified Token Details ---");
  console.log("Name:", name);
  console.log("Symbol:", symbol);
  console.log("Decimals:", decimals);
  console.log("Total Supply:", formatEther(supply), symbol);

  return tokenAddress;
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
