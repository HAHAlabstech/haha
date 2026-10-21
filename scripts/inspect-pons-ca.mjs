#!/usr/bin/env node
// Read-only Pons V2 CA discovery. No key, signing, eth_sendTransaction or logs.
import { createPublicClient, http, getAddress, encodeAbiParameters, keccak256, formatUnits } from "viem";

const args = process.argv.slice(2);
const raw = args.find((x) => x.startsWith("--ca="))?.slice(5);
const splitterArg = args.find((x) => x.startsWith("--fee-splitter="))?.slice(15);
if (!raw || !/^0x[0-9a-fA-F]{40}$/.test(raw)) throw new Error("usage: node scripts/inspect-pons-ca.mjs --ca=0x<40 hex>");
const ca = getAddress(raw);
const factory = getAddress(process.env.PONS_FACTORY_ADDRESS || "0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e");
const hook = getAddress(process.env.PONS_MEME_HOOK_ADDRESS || "0xE5e702641Ea86F4ae6cC3cDaeD2B886f976Be044");
const stateView = getAddress(process.env.STATE_VIEW_ADDRESS || "0xf3334192d15450cdd385c8b70e03f9a6bd9e673b");
const feeSplitter = splitterArg || process.env.FEE_SPLITTER_ADDRESS;
const rpc = process.env.RPC_URL_MAINNET || "https://robinhood-rpc.publicnode.com";
const client = createPublicClient({ chain:{id:4663,name:"Robinhood Chain",nativeCurrency:{name:"ETH",symbol:"ETH",decimals:18},rpcUrls:{default:{http:[rpc]}}},transport:http(rpc) });
const chainId=await client.getChainId();
if(chainId!==4663) throw new Error(`STOP: expected mainnet 4663; RPC reports ${chainId}`);
const [tokenCode,factoryCode]=await Promise.all([client.getBytecode({address:ca}),client.getBytecode({address:factory})]);
if(!tokenCode||tokenCode==="0x"||!factoryCode||factoryCode==="0x") throw new Error("CA or configured Pons factory has no code");
const launchedAbi=[{type:"function",name:"getLaunchedToken",stateMutability:"view",inputs:[{name:"token",type:"address"}],outputs:[{name:"launch",type:"tuple",components:[
 {name:"token",type:"address"},{name:"curve",type:"address"},{name:"deployer",type:"address"},{name:"creatorFeeRecipient",type:"address"},{name:"pairToken",type:"address"},{name:"graduationThreshold",type:"uint256"},{name:"poolFee",type:"uint24"},{name:"tickSpacing",type:"int24"},{name:"creatorTaxBps",type:"uint16"},{name:"buybackEnabled",type:"bool"},{name:"phase",type:"uint8"},{name:"sweptQuote",type:"uint256"},{name:"sweptTokens",type:"uint256"},{name:"sweptAt",type:"uint256"},{name:"exists",type:"bool"}
]}]}];
const rec=await client.readContract({address:factory,abi:launchedAbi,functionName:"getLaunchedToken",args:[ca]});
const launch={...rec};
if(!launch.exists||launch.token.toLowerCase()!==ca.toLowerCase()) throw new Error("CA is not registered in this configured Pons V2 factory");
const phaseName=["NotGraduated","Swept","PoolCreated","Rescued"][Number(launch.phase)]||`Unknown(${launch.phase})`;
let tokenMeta={};
for(const [name,type] of [["name","string"],["symbol","string"],["decimals","uint8"],["totalSupply","uint256"]]){
 try{tokenMeta[name]=await client.readContract({address:ca,abi:[{type:"function",name,stateMutability:"view",inputs:[],outputs:[{type}]}],functionName:name});}
 catch{tokenMeta[name]=null;}
}
let curve={address:launch.curve,code:false,reserves:null,feeBps:null,creatorTaxBps:null,creatorFeeRecipient:null};
if(launch.curve!=="0x0000000000000000000000000000000000000000"){
 curve.code=!!(await client.getBytecode({address:launch.curve}));
  for(const [name,field,type] of [["getReserves","reserves","tuple"],["feeBps","feeBps","uint256"],["creatorTaxBps","creatorTaxBps","uint256"],["buybackCreatorRecipient","creatorFeeRecipient","address"]]){
  const outputs=type==="tuple"?[{type:"uint256"},{type:"uint256"}]:[{type}];
  try{const v=await client.readContract({address:launch.curve,abi:[{type:"function",name,stateMutability:"view",inputs:[],outputs}],functionName:name});curve[field]=Array.isArray(v)?v.map(x=>typeof x==="bigint"?x.toString():x):typeof v==="bigint"?v.toString():v;}
  catch{curve[field]=null;}
 }
}
let v4=null;
if(Number(launch.phase)===2){
 const pair=launch.pairToken.toLowerCase();
 const [currency0,currency1]=pair<ca.toLowerCase()?[pair,ca.toLowerCase()]:[ca.toLowerCase(),pair];
 const poolKey={currency0,currency1,fee:Number(launch.poolFee),tickSpacing:Number(launch.tickSpacing),hooks:hook.toLowerCase()};
 const poolId=keccak256(encodeAbiParameters([{type:"address"},{type:"address"},{type:"uint24"},{type:"int24"},{type:"address"}],[poolKey.currency0,poolKey.currency1,poolKey.fee,poolKey.tickSpacing,poolKey.hooks]));
 try{
  const [slot0,liquidity]=await Promise.all([
   client.readContract({address:stateView,abi:[{type:"function",name:"getSlot0",stateMutability:"view",inputs:[{type:"bytes32"}],outputs:[{type:"uint160"},{type:"int24"},{type:"uint24"},{type:"uint24"}]}],functionName:"getSlot0",args:[poolId]}),
   client.readContract({address:stateView,abi:[{type:"function",name:"getLiquidity",stateMutability:"view",inputs:[{type:"bytes32"}],outputs:[{type:"uint128"}]}],functionName:"getLiquidity",args:[poolId]})
  ]);
  v4={poolKey,poolId,sqrtPriceX96:slot0[0].toString(),tick:Number(slot0[1]),protocolFee:Number(slot0[2]),lpFee:Number(slot0[3]),activeLiquidity:liquidity.toString()};
 }catch(e){v4={poolKey,poolId,state:"unresolved",error:(e.shortMessage||e.message).slice(0,180)};}
}
const result={chainId,ca,token:tokenMeta,ponsFactory:factory,launch:{curve:launch.curve,deployer:launch.deployer,creatorFeeRecipient:launch.creatorFeeRecipient,pairToken:launch.pairToken,graduationThreshold:launch.graduationThreshold.toString(),poolFee:Number(launch.poolFee),tickSpacing:Number(launch.tickSpacing),creatorTaxBps:Number(launch.creatorTaxBps),buybackEnabled:launch.buybackEnabled,phase:phaseName,sweptQuote:launch.sweptQuote.toString(),sweptTokens:launch.sweptTokens.toString()},curve,v4,
 interpretation:{creatorFeesBelongToHaha:feeSplitter?launch.creatorFeeRecipient.toLowerCase()===feeSplitter.toLowerCase():null,automaticBuybackReady:false,reason:Number(launch.phase)!==2?"Pons pool not fully graduated":"V4 pool data discovered; USDG route, quote, reserve cap and MicDrop route must still be configured/verified"}};
console.log(JSON.stringify(result,(_,v)=>typeof v==="bigint"?v.toString():v,2));
