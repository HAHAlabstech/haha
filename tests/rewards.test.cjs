const {test}=require('node:test');
const assert=require('node:assert/strict');
const {distributeProRata}=require('../worker/lib/rewards');
test('batch royalty pro-rata does not incorrectly apply the general pool 5% cap',()=>{
 const r=distributeProRata(1_000_000n,[{account:'0xaaa',score:1}]);
 assert.equal(r.payouts.get('0xaaa'),1_000_000n);assert.equal(r.rollover,0n);
});
test('batch royalty floors split integer micro-USDG and leaves only rounding dust',()=>{
 const r=distributeProRata(1_000_001n,[{account:'0xaaa',score:1},{account:'0xbbb',score:1}]);
 assert.equal(r.payouts.get('0xaaa'),500_000n);assert.equal(r.payouts.get('0xbbb'),500_000n);assert.equal(r.rollover,1n);
});
