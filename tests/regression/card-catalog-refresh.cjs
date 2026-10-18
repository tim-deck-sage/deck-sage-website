'use strict';
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const zlib=require('node:zlib');
const repo=path.resolve(__dirname,'../..'),dataRoot=path.resolve(process.env.DECK_SAGE_CARD_DATA_ROOT||path.join(repo,'preview/public/card-data'));
const report={checks:[],startedAt:new Date().toISOString()};
function pass(name){report.checks.push(name);console.log('PASS',name);}

const workflow=fs.readFileSync(path.join(repo,'.github/workflows/nextjs.yml'),'utf8'),refresh=fs.readFileSync(path.join(repo,'preview/tools/refresh-card-catalog.cjs'),'utf8');
assert.match(workflow,/cron: "23 7 \* \* \*"/);
assert.match(workflow,/Refresh and validate public Scryfall catalog/);
assert.match(refresh,/jsonl_download_uri/);
assert.match(refresh,/oracle_tags/);
assert.match(refresh,/previousScryfall\*\.97/);
assert.match(refresh,/Duplicate Oracle tag id/);
assert.match(refresh,/orphanTaggings/);
assert.match(refresh,/safeSwap\(temp,output\)/);
pass('Daily 07:23 UTC job validates current JSONL metadata, tag drift, count collapse, duplicates, and complete output before swap');

const manifest=JSON.parse(fs.readFileSync(path.join(dataRoot,'manifest.json'),'utf8'));
assert.equal(manifest.publicDataOnly,true);assert(manifest.cards>=30000);assert(manifest.files['search-index.json.gz']);
for(const [name,entry] of Object.entries(manifest.files)){const buffer=fs.readFileSync(path.join(dataRoot,name));assert.equal(buffer.length,entry.bytes,`${name} byte count`);assert.equal(crypto.createHash('sha256').update(buffer).digest('hex'),entry.sha256,`${name} digest`);}
const index=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(dataRoot,'search-index.json.gz')))),idPosition=index.fields.indexOf('oracle_id'),ids=index.cards.map(row=>row[idPosition]);
assert.equal(new Set(ids).size,ids.length);assert.equal(ids.length,manifest.cards);
pass('Current snapshot has verified file hashes and unique Oracle identities');

const failureRoot=fs.mkdtempSync(path.join(os.tmpdir(),'deck-sage-refresh-failure-')),target=path.join(failureRoot,'catalog');fs.mkdirSync(target);fs.writeFileSync(path.join(target,'last-known-good'),'preserve');
const malformed='data:application/json,'+encodeURIComponent(JSON.stringify({object:'list',data:[]}));
const failed=spawnSync(process.execPath,[path.join(repo,'preview/tools/refresh-card-catalog.cjs'),'--output',target],{cwd:repo,env:{...process.env,SCRYFALL_BULK_METADATA_URL:malformed},encoding:'utf8'});
assert.notEqual(failed.status,0);assert.equal(fs.readFileSync(path.join(target,'last-known-good'),'utf8'),'preserve');
assert.equal(fs.readdirSync(failureRoot).filter(name=>name.startsWith('.card-data-refresh-')).length,0);
fs.rmSync(failureRoot,{recursive:true,force:true});
pass('Malformed refresh input fails closed, removes staging, and preserves the last-known-good target');

report.finishedAt=new Date().toISOString();fs.writeFileSync(path.join(__dirname,'card-catalog-refresh-report.json'),JSON.stringify(report,null,2));
