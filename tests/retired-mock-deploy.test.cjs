const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const path=require('node:path');
test('retired public-mint mock deployment script refuses without reading a wallet key',()=>{
 const p=spawnSync(process.execPath,[path.resolve(__dirname,'../scripts/deploy-temp-haha.mjs')],{encoding:'utf8',env:{PATH:process.env.PATH}});
 assert.equal(p.status,2);assert.match(p.stderr,/public-mint MockHAHA/);assert.doesNotMatch(p.stderr,/Tx hash|Broadcasting deployment/);
});
