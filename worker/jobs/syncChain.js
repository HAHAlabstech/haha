"use strict";
// Job: sync-chain (BullMQ */10 + on-demand). Reads launch/pool state; writes
// only verified MicDrop phase/reserve syncs when the route is configured:
// Pons graduation detection + feeRecipient takeover/freeze + USDG pause +
// MicDrop gating (HOLD pre-graduation, burn cap post-graduation: amount <=
// min(2% pool reserve, 1% price-impact), minHahaOut AFTER 1%+2% hook fees).
// Token confirmation is propose->confirmHahaToken (48h) with launchTx proof:
// feeRecipient==splitter, pool graduated + hook, pair==USDG,
// creatorTaxBps==200, buyback==false, exempt EMPTY (<=32 checked).
// NOT first-claim auto-detect (anti-spoof). Severity events -> Telegram.

const { createPublicClient, http, fallback, getAddress } = require("viem");
const { normalizeLaunch, poolIdForLaunch, poolIdForKey, decodePoolKeys, quoteCurrencyReserveUsdG } = require("../lib/ponsLaunch");

function rpcClient() {
  const env = process.env.CHAIN_ENV === "mainnet" ? "MAINNET" : "TESTNET";
  const urls = [process.env[`RPC_URL_${env}`], "https://robinhood-sepolia-rpc.publicnode.com", "https://rpc.testnet.chain.robinhood.com"].filter(Boolean);
  const id = env === "MAINNET" ? 4663 : 46630;
  return createPublicClient({ chain: { id, name: `Robinhood-${env}`, nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: urls } } }, transport: fallback(urls.map((u) => http(u))) });
}

const FEE_SPLITTER_ABI = [
  { name: "poolGraduated", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "bool" }] },
];
const USDG_ABI = [
  { name: "paused", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "bool" }] },
];
const FACTORY_ABI = [{
  type:"function", name:"getLaunchedToken", stateMutability:"view", inputs:[{type:"address"}], outputs:[{type:"tuple",components:[
    {name:"token",type:"address"},{name:"curve",type:"address"},{name:"deployer",type:"address"},{name:"creatorFeeRecipient",type:"address"},{name:"pairToken",type:"address"},{name:"graduationThreshold",type:"uint256"},{name:"poolFee",type:"uint24"},{name:"tickSpacing",type:"int24"},{name:"creatorTaxBps",type:"uint16"},{name:"buybackEnabled",type:"bool"},{name:"phase",type:"uint8"},{name:"sweptQuote",type:"uint256"},{name:"sweptTokens",type:"uint256"},{name:"sweptAt",type:"uint256"},{name:"exists",type:"bool"}
  ]}]
}];
const CURVE_ABI=[{type:"function",name:"token",stateMutability:"view",inputs:[],outputs:[{type:"address"}]},{type:"function",name:"factory",stateMutability:"view",inputs:[],outputs:[{type:"address"}]}];
const MICDROP_ABI=[{type:"function",name:"hahaToken",stateMutability:"view",inputs:[],outputs:[{type:"address"}]},{type:"function",name:"poolGraduated",stateMutability:"view",inputs:[],outputs:[{type:"bool"}]},{type:"function",name:"hasBuybackRoute",stateMutability:"view",inputs:[],outputs:[{type:"bool"}]},{type:"function",name:"getBuybackRoute",stateMutability:"view",inputs:[],outputs:[{type:"bytes"}]},{type:"function",name:"poolReserveUsdg",stateMutability:"view",inputs:[],outputs:[{type:"uint256"}]},{type:"function",name:"reserveUpdatedAt",stateMutability:"view",inputs:[],outputs:[{type:"uint256"}]},{type:"function",name:"setGraduated",stateMutability:"nonpayable",inputs:[{type:"bool"}],outputs:[]},{type:"function",name:"setPoolReserve",stateMutability:"nonpayable",inputs:[{type:"uint256"}],outputs:[]}];
const STATE_VIEW_ABI=[{type:"function",name:"getSlot0",stateMutability:"view",inputs:[{type:"bytes32"}],outputs:[{type:"uint160"},{type:"int24"},{type:"uint24"},{type:"uint24"}]},{type:"function",name:"getLiquidity",stateMutability:"view",inputs:[{type:"bytes32"}],outputs:[{type:"uint128"}]}];

async function alert(text) {
  if (!process.env.TELEGRAM_BOT_TOKEN) { console.log(`[alert] ${text}`); return; }
  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text: `[HAHA sync-chain] ${text}` }),
  }).catch(() => {});
}

async function run(job) {
  const client = rpcClient();
  const findings = {};
  // On mainnet the only launcher input is the token CA. Verify the Pons
  // factory record and the token-specific curve before synchronizing MicDrop.
  // Unknown/ungraduated/not-bound => HOLD; do not infer pair/tax/recipient.
  if (process.env.CHAIN_ENV === "mainnet" && process.env.HAHA_TOKEN_ADDRESS && process.env.PONS_FACTORY_ADDRESS) {
    try {
      const token=getAddress(process.env.HAHA_TOKEN_ADDRESS.trim());
      const factory=getAddress(process.env.PONS_FACTORY_ADDRESS.trim());
      const record=await client.readContract({address:factory,abi:FACTORY_ABI,functionName:"getLaunchedToken",args:[token]});
      const launch=normalizeLaunch(record,token);
      const code=await client.getCode({address:launch.curve});
      if(!code || code==="0x") throw new Error("curve has no code");
      const [curveToken,curveFactory]=await Promise.all([
        client.readContract({address:launch.curve,abi:CURVE_ABI,functionName:"token"}),
        client.readContract({address:launch.curve,abi:CURVE_ABI,functionName:"factory"}),
      ]);
      if(curveToken.toLowerCase()!==token.toLowerCase() || curveFactory.toLowerCase()!==factory.toLowerCase()) throw new Error("curve/factory identity mismatch");
      findings.ponsLaunch={token,curve:launch.curve,pairToken:launch.pairToken,creatorTaxBps:launch.creatorTaxBps,creatorFeeRecipient:launch.creatorFeeRecipient,phase:launch.phaseName,graduated:launch.graduated};
      const micdrop=process.env.MICDROP_ADDRESS?.trim();
      if(micdrop && /^0x[0-9a-fA-F]{40}$/.test(micdrop)) {
        const bound=await client.readContract({address:getAddress(micdrop),abi:MICDROP_ABI,functionName:"hahaToken"});
        if(bound.toLowerCase()===token.toLowerCase()) {
          const old=await client.readContract({address:getAddress(micdrop),abi:MICDROP_ABI,functionName:"poolGraduated"});
          findings.micDropTokenBound=true;
          if(old!==launch.graduated && process.env.WORKER_CHAIN_WRITES!=="off") {
            const {client:wallet,account}=require("../lib/chain").walletClient();
            const hash=await wallet.writeContract({address:getAddress(micdrop),abi:MICDROP_ABI,functionName:"setGraduated",args:[launch.graduated],account,gas:150_000n});
            const receipt=await client.waitForTransactionReceipt({hash});
            if(receipt.status!=="success") throw new Error(`MicDrop.setGraduated failed: ${hash}`);
            findings.micDropGraduationTx=hash;
          }
          if(launch.graduated) {
            const route=await client.readContract({address:getAddress(micdrop),abi:MICDROP_ABI,functionName:"hasBuybackRoute"});
            if(!route) findings.buybackReadiness="HOLD: route unset; no buyback funds spent";
            else {
              try {
                const routeBytes=await client.readContract({address:getAddress(micdrop),abi:MICDROP_ABI,functionName:"getBuybackRoute"});
                const keys=decodePoolKeys(routeBytes);
                const ponsPoolId=poolIdForLaunch(launch,getAddress(process.env.PONS_MEME_HOOK_ADDRESS));
                const stateView=getAddress(process.env.STATE_VIEW_ADDRESS||"0xf3334192d15450cdd385c8b70e03f9a6bd9e673b");
                const readState=async id=>{
                  const [slot0,liquidity]=await Promise.all([
                    client.readContract({address:stateView,abi:STATE_VIEW_ABI,functionName:"getSlot0",args:[id]}),
                    client.readContract({address:stateView,abi:STATE_VIEW_ABI,functionName:"getLiquidity",args:[id]}),
                  ]);
                  return {slot0:{sqrtPriceX96:slot0[0]},liquidity};
                };
                const [ponsState,usdNativeState]=await Promise.all([
                  readState(ponsPoolId),
                  launch.pairToken==="0x0000000000000000000000000000000000000000"?readState(poolIdForKey(keys[0])):Promise.resolve(null),
                ]);
                const reserve=quoteCurrencyReserveUsdG(launch,keys,ponsState,usdNativeState,getAddress(process.env.USDG_ADDRESS),getAddress(process.env.PONS_MEME_HOOK_ADDRESS));
                if(reserve<=0n)throw new Error("derived reserve is zero");
                const [oldReserve,updatedAt]=await Promise.all([
                  client.readContract({address:getAddress(micdrop),abi:MICDROP_ABI,functionName:"poolReserveUsdg"}),
                  client.readContract({address:getAddress(micdrop),abi:MICDROP_ABI,functionName:"reserveUpdatedAt"}),
                ]);
                const now=Math.floor(Date.now()/1000);
                const changed=oldReserve===0n || (reserve>oldReserve?reserve-oldReserve:oldReserve-reserve)*10_000n>oldReserve*100n;
                const stale=Number(updatedAt)===0 || now-Number(updatedAt)>=10*60;
                findings.buybackReserveUsdGMicro=reserve.toString();
                findings.buybackReserveUpdated=changed||stale;
                findings.buybackReadiness="route/pool verified; execution still requires fresh quote/min-out and keeper policy";
                if((changed||stale)&&process.env.WORKER_CHAIN_WRITES!=="off") {
                  const {client:wallet,account}=require("../lib/chain").walletClient();
                  const hash=await wallet.writeContract({address:getAddress(micdrop),abi:MICDROP_ABI,functionName:"setPoolReserve",args:[reserve],account,gas:150_000n});
                  const receipt=await client.waitForTransactionReceipt({hash});
                  if(receipt.status!=="success")throw new Error(`MicDrop.setPoolReserve failed: ${hash}`);
                  findings.buybackReserveTx=hash;
                }
              } catch(err) {
                findings.buybackReadiness=`HOLD: could not refresh quoted pool reserve (${String(err.message||err).slice(0,120)})`;
                await alert(`MicDrop buyback HOLD: ${findings.buybackReadiness}`);
              }
            }
          }
        } else findings.micDropTokenBound=false;
      }
    } catch(err) {
      findings.ponsLaunchError=String(err.message||err).slice(0,200);
      await alert(`HAHA CA is not a verified Pons launch in the configured factory; MicDrop stays HOLD (${findings.ponsLaunchError})`);
    }
  }
  const splitter = process.env.FEE_SPLITTER_ADDRESS;
  if (splitter) {
    try {
      findings.poolGraduated = await client.readContract({ address: getAddress(splitter), abi: FEE_SPLITTER_ABI, functionName: "poolGraduated" });
    } catch (err) { findings.splitterError = String(err.message).slice(0, 200); }
    // pending-vs-claimable stall: pending>0 while claimable static >12h =>
    // alert + skip epoch (never publish an empty root). Chain reads feed this;
    // staleness itself is tracked in CronJobRun by daily-settlement.
    if (job.data.pendingMicro > 0 && job.data.claimableStaticHours >= 12) {
      await alert(`Pons operator sweep stall: pending=${job.data.pendingMicro} static ${job.data.claimableStaticHours}h — epoch will SKIP root publish`);
      findings.sweepStall = true;
    }
  }
  if (process.env.USDG_ADDRESS) {
    try {
      const paused = await client.readContract({ address: getAddress(process.env.USDG_ADDRESS), abi: USDG_ABI, functionName: "paused" }).catch(() => false);
      findings.usdgPaused = paused;
      if (paused) await alert("USDG paused — settlement + MicDrop HALTED");
    } catch { /* non-pausable token — fine */ }
  }
  // Operator gas float (out-of-band funded from 40% B2B ops share, never fees).
  if (job.data.operatorEth !== undefined && Number(job.data.operatorEth) < Number(process.env.OPERATOR_MIN_ETH_ALERT ?? 0.005)) {
    await alert(`operator gas low: ${job.data.operatorEth} ETH`);
    findings.gasLow = true;
  }
  return findings;
}

module.exports = { run };
