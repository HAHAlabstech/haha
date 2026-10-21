const {test}=require('node:test');
const assert=require('node:assert/strict');
const {maxSafeBuyback,buildHopQuotes,hopFloorX36}=require('../worker/lib/micDrop');
const usd='0x0000000000000000000000000000000000000011';
const eth='0x0000000000000000000000000000000000000000';
const token='0x0000000000000000000000000000000000000022';
test('buyback amount is bounded by balance, reserve 2% and 1% impact',()=>{
 assert.equal(maxSafeBuyback(10_000_000_000n,100_000_000_000n,200,100),1_010_101_010n);
 assert.equal(maxSafeBuyback(100n,100_000n,200,100),100n);
 assert.equal(maxSafeBuyback(10n,0n,200,100),0n);
});
test('multi-hop direction follows exact currency order and continuity',()=>{
 const keys=[{currency0:eth,currency1:usd,fee:0,tickSpacing:10,hooks:eth},{currency0:eth,currency1:token,fee:0,tickSpacing:200,hooks:'0x0000000000000000000000000000000000000033'}];
 const hops=buildHopQuotes(keys,usd);
 assert.deepEqual(hops.map(h=>[h.input,h.output,h.zeroForOne]),[[usd,eth,false],[eth,token,true]]);
});
test('route disconnected from USDG input fails closed',()=>{
 assert.throws(()=>buildHopQuotes([{currency0:eth,currency1:token,fee:0,tickSpacing:200,hooks:eth}],usd),/route starts/);
});
test('min-hop floor includes selected one-percent slippage margin',()=>{
 assert.equal(hopFloorX36(1_000_000n,2_000_000n,100),(2_000_000n*(1n<<36n)*9900n/10000n)/1_000_000n);
});
