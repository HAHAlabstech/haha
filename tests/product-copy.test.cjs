const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('public copy does not promise Pons buyback or require HAHA for juror access',()=>{
 const faq=read('components/landing/LandingFaq.tsx');
 const pipeline=read('components/landing/ProcessPipeline.tsx');
 const crowd=read('components/app/views/CrowdView.tsx');
 assert.doesNotMatch(faq,/automatically buys \$HAHA/i);
 assert.doesNotMatch(faq,/minimum stake in \$HAHA/i);
 assert.doesNotMatch(pipeline,/Mic Drop permanent buyback & burn/i);
 assert.match(crowd,/Wallet \+ calibration/);
 assert.doesNotMatch(read('components/app/AppShell.tsx'),/2,840/);
});

test('reward copy says payouts depend on funded USDG rather than guaranteeing daily rewards',()=>{
 const faq=read('components/landing/LandingFaq.tsx');
 assert.match(faq,/verified USDG funding/i);
 assert.match(faq,/not guaranteed/i);
 assert.doesNotMatch(faq,/share real USDG rewards daily/i);
});
