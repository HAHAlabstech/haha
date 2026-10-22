const {test}=require('node:test');
const assert=require('node:assert/strict');
const {run}=require('../worker/jobs/syncChain');

test('standalone sync reports product mode and holds buyback without Pons polling',async()=>{
 const keys=['PONS_LAUNCH_MODE','CHAIN_ENV','HAHA_TOKEN_ADDRESS','PONS_FACTORY_ADDRESS'];
 const previous=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
 process.env.PONS_LAUNCH_MODE='standalone';
 process.env.CHAIN_ENV='mainnet';
 process.env.HAHA_TOKEN_ADDRESS='0x0000000000000000000000000000000000000001';
 process.env.PONS_FACTORY_ADDRESS='0x0000000000000000000000000000000000000002';
 try {
  const result=await run({data:{}});
  assert.equal(result.productMode,'standalone');
  assert.equal(result.buybackReadiness,'HOLD: standalone token has no configured market route');
  assert.equal(result.ponsLaunch,undefined);
  assert.equal(result.ponsLaunchError,undefined);
 } finally {
  for(const key of keys) {
   if(previous[key]===undefined)delete process.env[key];
   else process.env[key]=previous[key];
  }
 }
});
