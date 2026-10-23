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
 const stage=read('components/app/views/StageView.tsx');
 const productCopy=[faq,pipeline,crowd,read('README.md'),read('components/app/views/TipJarView.tsx'),read('components/ShowtimeExperience.tsx'),read('components/landing/LandingShowtimeHero.tsx'),read('components/landing/ProtocolFacts.tsx'),read('app/crowd/join/page.tsx'),stage].join('\n');
 assert.doesNotMatch(faq,/automatically buys \$HAHA/i);
 assert.doesNotMatch(faq,/minimum stake in \$HAHA/i);
 assert.doesNotMatch(pipeline,/Mic Drop permanent buyback & burn/i);
 assert.match(crowd,/Wallet \+ calibration/);
 assert.doesNotMatch(read('components/app/AppShell.tsx'),/2,840/);
 assert.doesNotMatch(productCopy,/Robinhood Testnet session|Robinhood Testnet \(Chain ID 46630\)|Robinhood Testnet\./i);
 assert.doesNotMatch(productCopy,/rewards settle on-chain .* at midnight UTC|10% lifetime royalties flow back|10% lifetime royalties flow back/i);
 assert.doesNotMatch(productCopy,/fund deflationary buybacks|triggering stake slashing|all contracts deployed, verified, and active/i);
 assert.doesNotMatch(productCopy,/Get\s+<em[^>]*>Paid\./i);
 assert.doesNotMatch(productCopy,/titleEm:\s*"Paid\."/i);
 assert.doesNotMatch(stage,/earn tonight.*Tip Jar share|Free · 5 bits \/ day · 1\.0× reward|2\.5× reward · full playbook|How To Play &amp; Earn/i);
});

test('reward copy says payouts depend on funded USDG rather than guaranteeing daily rewards',()=>{
 const faq=read('components/landing/LandingFaq.tsx');
 assert.match(faq,/verified USDG funding/i);
 assert.match(faq,/not guaranteed/i);
 assert.doesNotMatch(faq,/share real USDG rewards daily/i);
});

test('public UI copy does not reference MiMo model',()=>{
 const bitPage=read('app/bit/[id]/page.tsx');
 const contractsPage=read('app/contracts/page.tsx');
 const liveEngine=read('components/StraightManLiveEngine.tsx');
 assert.match(bitPage,/formatModelVersion/);
 assert.match(liveEngine,/OPUS 5\.5/);
 assert.doesNotMatch(liveEngine,/MIMO/i);
 assert.doesNotMatch(contractsPage,/MIMO/i);
});

test('public X links point to @HAHAstage and not legacy handle',()=>{
 const footer=read('components/SiteFooter.tsx');
 const nav=read('components/SiteNav.tsx');
 const header=read('components/app/AppHeader.tsx');
 const shell=read('components/app/AppShell.tsx');
 const all=[footer,nav,header,shell].join('\n');
 assert.match(footer,/https:\/\/x\.com\/HAHAstage/);
 assert.match(nav,/https:\/\/x\.com\/HAHAstage/);
 assert.match(header,/https:\/\/x\.com\/HAHAstage/);
 assert.match(shell,/https:\/\/x\.com\/HAHAstage/);
 assert.doesNotMatch(all,/x\.com\/HAHAlabstech/i);
 assert.doesNotMatch(all,/@HAHAlabstech/i);
});
