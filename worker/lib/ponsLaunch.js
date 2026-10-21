"use strict";
const { encodeAbiParameters, decodeAbiParameters, keccak256 } = require("viem");

function normalizeLaunch(launch, expectedToken) {
  if (!launch || launch.exists !== true) throw new Error("[pons] CA is not registered in configured Pons V2 factory");
  if (String(launch.token).toLowerCase() !== String(expectedToken).toLowerCase()) throw new Error("[pons] factory token mismatch");
  if (!/^0x[0-9a-f]{40}$/i.test(launch.curve) || /^0x0{40}$/i.test(launch.curve)) throw new Error("[pons] launch curve missing");
  const phase=Number(launch.phase);
  if (![0,1,2,3].includes(phase)) throw new Error("[pons] unknown launch phase");
  return {
    token:String(launch.token).toLowerCase(), curve:String(launch.curve).toLowerCase(),
    deployer:String(launch.deployer).toLowerCase(), creatorFeeRecipient:String(launch.creatorFeeRecipient).toLowerCase(),
    pairToken:String(launch.pairToken).toLowerCase(), graduationThreshold:BigInt(launch.graduationThreshold),
    poolFee:Number(launch.poolFee), tickSpacing:Number(launch.tickSpacing), creatorTaxBps:Number(launch.creatorTaxBps),
    buybackEnabled:Boolean(launch.buybackEnabled), phase, phaseName:["NotGraduated","Swept","PoolCreated","Rescued"][phase],
    graduated:phase===2, sweptQuote:BigInt(launch.sweptQuote), sweptTokens:BigInt(launch.sweptTokens),
  };
}
function poolKeyForLaunch(launch, hook) {
  if (!launch.graduated) throw new Error("[pons] pool key unavailable until full graduation");
  const token=launch.token.toLowerCase(), pair=launch.pairToken.toLowerCase(), hookAddress=String(hook).toLowerCase();
  if (token===pair || !/^0x[0-9a-f]{40}$/i.test(hookAddress)) throw new Error("[pons] invalid pool currencies or hook");
  const [currency0,currency1]=token<pair?[token,pair]:[pair,token];
  if(!Number.isInteger(launch.poolFee)||launch.poolFee<0||launch.poolFee>0xffffff||!Number.isInteger(launch.tickSpacing)||launch.tickSpacing<=0) throw new Error("[pons] invalid pool fee/tick spacing");
  return {currency0,currency1,fee:launch.poolFee,tickSpacing:launch.tickSpacing,hooks:hookAddress};
}
function poolIdForLaunch(launch, hook) {
  const key=poolKeyForLaunch(launch,hook);
  return poolIdForKey(key);
}
function poolIdForKey(key) {
  return keccak256(encodeAbiParameters([{type:"address"},{type:"address"},{type:"uint24"},{type:"int24"},{type:"address"}],[key.currency0,key.currency1,key.fee,key.tickSpacing,key.hooks]));
}
const POOL_KEY_ABI={type:"tuple[]",components:[{name:"currency0",type:"address"},{name:"currency1",type:"address"},{name:"fee",type:"uint24"},{name:"tickSpacing",type:"int24"},{name:"hooks",type:"address"}]};
function decodePoolKeys(route) { return decodeAbiParameters([POOL_KEY_ABI],route)[0]; }
function eqKey(a,b) { return a.currency0.toLowerCase()===b.currency0.toLowerCase() && a.currency1.toLowerCase()===b.currency1.toLowerCase() && Number(a.fee)===Number(b.fee) && Number(a.tickSpacing)===Number(b.tickSpacing) && a.hooks.toLowerCase()===b.hooks.toLowerCase(); }
function virtualReserves(slot0,liquidity) {
  const sqrt=BigInt(slot0.sqrtPriceX96),L=BigInt(liquidity),Q96=1n<<96n;
  if(sqrt<=0n||L<=0n)throw new Error("[pons] pool has no active liquidity/price");
  return {reserve0:L*Q96/sqrt,reserve1:L*sqrt/Q96};
}
function quoteCurrencyReserveUsdG(launch,routeKeys,ponsState,usdNativeState,usdgAddress,ponsHook) {
  if(!launch.graduated)throw new Error("[pons] pool not fully graduated");
  const ponsKey=poolKeyForLaunch(launch,ponsHook);
  if(!routeKeys.length||!eqKey(routeKeys.at(-1),ponsKey))throw new Error("[pons] route does not end in the token's registered Pons pool");
  const reserves=virtualReserves(ponsState.slot0,ponsState.liquidity);
  if(launch.pairToken.toLowerCase()===usdgAddress.toLowerCase()) {
    if(routeKeys.length!==1)throw new Error("[pons] USDG pair must use direct exact-input route");
    return routeKeys[0].currency0.toLowerCase()===usdgAddress.toLowerCase()?reserves.reserve0:reserves.reserve1;
  }
  if(launch.pairToken!=="0x0000000000000000000000000000000000000000")throw new Error("[pons] only USDG or native-ETH quote is supported");
  if(routeKeys.length!==2||!usdNativeState)throw new Error("[pons] USDG/native pool state required for native-quote valuation");
  const first=routeKeys[0],native="0x0000000000000000000000000000000000000000";
  if(![first.currency0.toLowerCase(),first.currency1.toLowerCase()].includes(native)||![first.currency0.toLowerCase(),first.currency1.toLowerCase()].includes(usdgAddress.toLowerCase()))throw new Error("[pons] route first hop is not USDG/native");
  const sqrt=BigInt(usdNativeState.slot0.sqrtPriceX96),Q192=1n<<192n;
  const priceMicroPerEth=first.currency0.toLowerCase()===native?sqrt*sqrt*10n**18n/Q192:Q192*10n**18n/(sqrt*sqrt);
  const nativeReserve=ponsKey.currency0.toLowerCase()===native?reserves.reserve0:reserves.reserve1;
  return nativeReserve*priceMicroPerEth/10n**18n;
}
module.exports={normalizeLaunch,poolKeyForLaunch,poolIdForLaunch,poolIdForKey,decodePoolKeys,virtualReserves,quoteCurrencyReserveUsdG};
