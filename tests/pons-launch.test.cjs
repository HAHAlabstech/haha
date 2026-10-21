const {test}=require('node:test');
const assert=require('node:assert/strict');
const {normalizeLaunch,poolIdForLaunch,decodePoolKeys,quoteCurrencyReserveUsdG}=require('../worker/lib/ponsLaunch');
const token='0x96003d7d4f6b8d7466ce423fcecc916f7f901c90';
const factory='0x7ed598bcef8bd9edd8c97a195c6d13f40801ec7e';
const launch={token,curve:'0x04b57f99b3023e949eb2fce73dc1764e7524681d',deployer:'0x0000000000000000000000000000000000000001',creatorFeeRecipient:'0x0000000000000000000000000000000000000002',pairToken:'0x0000000000000000000000000000000000000000',graduationThreshold:1n,poolFee:0,tickSpacing:200,creatorTaxBps:192,buybackEnabled:false,phase:0,sweptQuote:0n,sweptTokens:0n,exists:true};
test('launch identity accepts native ETH and preserves observed tax/recipient without assuming ownership',()=>{
 const got=normalizeLaunch(launch,token);
 assert.equal(got.pairToken,'0x0000000000000000000000000000000000000000');assert.equal(got.creatorTaxBps,192);assert.equal(got.creatorFeeRecipient,launch.creatorFeeRecipient);assert.equal(got.graduated,false);
});
test('phase only marks graduated after full pool creation',()=>{
 assert.equal(normalizeLaunch({...launch,phase:1},token).graduated,false);
 assert.equal(normalizeLaunch({...launch,phase:2},token).graduated,true);
});
test('factory record with wrong token or absent launch fails closed',()=>{
 assert.throws(()=>normalizeLaunch({...launch,token:launch.deployer},token),/token mismatch/);
 assert.throws(()=>normalizeLaunch({...launch,exists:false},token),/not registered/);
});
test('pool id derives from exact sorted token/pair, fee, tick spacing and Pons hook',()=>{
 assert.equal(poolIdForLaunch(normalizeLaunch({...launch,phase:2},token),'0xe5e702641ea86f4ae6cc3cdaed2b886f976be044'),'0xf8195d1f494bef04945bb382411240ef8cfd9dc6ac23696208666d2ffea28e52');
});
test('USDG-paired graduated pool produces its active USDG-side reserve estimate',()=>{
 const l=normalizeLaunch({...launch,pairToken:'0x0000000000000000000000000000000000000011',phase:2},token);
 const hook='0xe5e702641ea86f4ae6cc3cdaed2b886f976be044';
 const ponsKey={currency0:l.pairToken,currency1:l.token,fee:0,tickSpacing:200,hooks:hook};
 const route=[ponsKey];const encoded=require('viem').encodeAbiParameters([{type:'tuple[]',components:[{type:'address',name:'currency0'},{type:'address',name:'currency1'},{type:'uint24',name:'fee'},{type:'int24',name:'tickSpacing'},{type:'address',name:'hooks'}]}],[route]);
 const l2={...l,pairToken:'0x0000000000000000000000000000000000000011'};
 assert.equal(quoteCurrencyReserveUsdG(l2,decodePoolKeys(encoded),{slot0:{sqrtPriceX96:1n<<96n},liquidity:100_000_000n},null,'0x0000000000000000000000000000000000000011',hook),100_000_000n);
});
test('native-paired Pons pool requires connected USDG/native route and quote state',()=>{
 const l=normalizeLaunch({...launch,phase:2},token);const hook='0xe5e702641ea86f4ae6cc3cdaed2b886f976be044';
 const usdNative={currency0:l.pairToken,currency1:'0x0000000000000000000000000000000000000011',fee:3000,tickSpacing:60,hooks:'0x0000000000000000000000000000000000000000'};
 const pons={currency0:l.pairToken,currency1:l.token,fee:0,tickSpacing:200,hooks:hook};
 assert.throws(()=>quoteCurrencyReserveUsdG(l,[usdNative],{slot0:{sqrtPriceX96:1n<<96n},liquidity:10n},null,'0x0000000000000000000000000000000000000011',hook),/route does not end/);
 assert.equal(quoteCurrencyReserveUsdG(l,[usdNative,pons],{slot0:{sqrtPriceX96:1n<<96n},liquidity:10_000_000_000_000_000_000n},{slot0:{sqrtPriceX96:1n<<96n},liquidity:10_000_000_000n},'0x0000000000000000000000000000000000000011',hook),10_000_000_000_000_000_000n);
});
