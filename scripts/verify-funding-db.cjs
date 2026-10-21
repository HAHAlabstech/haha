// Creates a dedicated local verification database. Never uses project .env.
const {execFileSync,spawnSync}=require('node:child_process');
const {readFileSync}=require('node:fs');
const info=JSON.parse(execFileSync('wsl.exe',['-d','Ubuntu-22.04','--','docker','inspect','haha-db-local'],{encoding:'utf8'}))[0];
const env=Object.fromEntries(info.Config.Env.map(s=>[s.slice(0,s.indexOf('=')),s.slice(s.indexOf('=')+1)]));
const dbName='haha_ca_only_verify';
// This exact DB name is reserved by this verifier; never target project/VPS DBs.
const dropped=spawnSync('wsl.exe',['-d','Ubuntu-22.04','--','docker','exec','haha-db-local','dropdb','--if-exists','-U',env.POSTGRES_USER,dbName],{encoding:'utf8'});
if(dropped.status!==0)throw Error(dropped.stderr);
const created=spawnSync('wsl.exe',['-d','Ubuntu-22.04','--','docker','exec','haha-db-local','createdb','-U',env.POSTGRES_USER,dbName],{encoding:'utf8'});
if(created.status!==0 && !created.stderr.includes('already exists'))throw Error(created.stderr);
const port=info.NetworkSettings.Ports['5432/tcp'][0].HostPort;
const url=`postgresql://${encodeURIComponent(env.POSTGRES_USER)}:${encodeURIComponent(env.POSTGRES_PASSWORD)}@127.0.0.1:${port}/${dbName}`;
const childEnv={...process.env,DATABASE_URL:url,DIRECT_URL:url,WORKER_CHAIN_WRITES:'off'};
for(const args of [['node_modules/prisma/build/index.js','migrate','deploy'],['--test','tests/settlement.integration.cjs']]){
 const r=spawnSync(process.execPath,args,{env:childEnv,stdio:'inherit'});if(r.status!==0)process.exit(r.status||1);
}
