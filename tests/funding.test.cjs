const { test } = require('node:test');
const assert = require('node:assert/strict');
const { encodeEventTopics, encodeAbiParameters, parseAbi } = require('viem');
const { distribute } = require('../worker/lib/rewards');
const funding = require('../worker/lib/funding');
const gateway = '0x0000000000000000000000000000000000000011';
const usdg = '0x0000000000000000000000000000000000000022';
const tipJar = '0x0000000000000000000000000000000000000033';
const buyer = '0x0000000000000000000000000000000000000044';
const hash = '0x' + '12'.repeat(32), batch = '0x' + '34'.repeat(32);
const purchase = parseAbi(['event ProducerPurchase(bytes32 indexed orderId,bytes32 indexed batchId,address indexed buyer,uint8 planType,uint256 operatorShare,uint256 tipJarGeneralShare,uint256 royaltyShare,uint256 micDropShare)']);
const transfer = parseAbi(['event Transfer(address indexed from,address indexed to,uint256 value)']);
function receipt() {
 const transferLog=(index,from,to,amount)=>({address:usdg,logIndex:index,topics:encodeEventTopics({abi:transfer,eventName:'Transfer',args:{from,to}}),data:encodeAbiParameters([{type:'uint256'}],[amount])});
 return { status:'success',transactionHash:hash,blockNumber:10n,logs:[
  {address:gateway,logIndex:7,topics:encodeEventTopics({abi:purchase,eventName:'ProducerPurchase',args:{orderId:hash,batchId:batch,buyer}}),data:encodeAbiParameters([{type:'uint8'},...Array(4).fill({type:'uint256'})],[0,1200n,900n,300n,600n])},
  transferLog(8,buyer,gateway,3000n),transferLog(9,gateway,'0x0000000000000000000000000000000000000055',1200n),transferLog(10,gateway,tipJar,900n),transferLog(11,gateway,tipJar,300n),transferLog(12,gateway,'0x0000000000000000000000000000000000000066',600n),
 ]};
}
test('receipt funding uses actual paid event amounts, not plan list price', () => {
 const rows=funding.decodeFundingReceipt(receipt(),{chainId:4663,gateway,usdg,tipJar});
 assert.equal(rows.length,1);assert.equal(rows[0].general_micro_usdg,900n);assert.equal(rows[0].royalty_remaining_micro,300n);assert.equal(rows[0].log_index,7);
});
test('failed, wrong-emitter and unbacked receipts never create reward capital', () => {
 assert.throws(()=>funding.decodeFundingReceipt({...receipt(),status:'reverted'},{chainId:4663,gateway,usdg,tipJar}),/reverted/);
 assert.throws(()=>funding.decodeFundingReceipt({...receipt(),logs:receipt().logs.slice(0,1)},{chainId:4663,gateway,usdg,tipJar}),/transfer/);
 assert.throws(()=>funding.decodeFundingReceipt(receipt(),{chainId:4663,gateway:buyer,usdg,tipJar}),/funding event/);
});
test('gateway event without buyer USDG transfer is rejected even if TipJar got a transfer',()=>{
 const r=receipt();r.logs=r.logs.filter(x=>x.logIndex!==8);
 assert.throws(()=>funding.decodeFundingReceipt(r,{chainId:4663,gateway,usdg,tipJar}),/buyer transfer/);
});
test('royalties without a snapshot remain reserved, not a general reward pool', () => {
 const r=funding.splitFundingPools([{general_micro_usdg:900n,royalty_remaining_micro:300n,contributors_json:null}]);
 assert.deepEqual(r,{general:900n,royalty:0n,reservedRoyalty:300n});
});
test('per-account score aggregation never overwrites multiple bits by one wallet', () => {
 const d=distribute(100_000_000n,[{account:'alice',score:1},{account:'alice',score:1},...Array.from({length:38},(_,i)=>({account:'u'+i,score:1}))]);
 assert.equal(d.payouts.get('alice'),5_000_000n);
 assert.equal([...d.payouts.values()].reduce((s,x)=>s+x,0n)+d.rollover,100_000_000n);
});
test('scopes cannot import legacy testnet allocations into mainnet', () => {
 assert.deepEqual(funding.epochScope({chainId:4663,tipJar}),{chain_id:4663,tipjar_address:tipJar});
 assert.equal(funding.epochScope({chainId:46630,tipJar}).OR.length,2);
});
