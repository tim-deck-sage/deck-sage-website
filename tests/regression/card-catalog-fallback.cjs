'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const zlib=require('node:zlib');
const {spawnSync}=require('node:child_process');
const {validateSnapshot}=require('../../preview/tools/card-catalog-fallback.cjs');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'deck-sage-catalog-fallback-'));
const refresh=path.resolve(__dirname,'../../preview/tools/refresh-card-catalog.cjs');
const firstDate='2026-11-20T10:00:00Z';
const sourceDate='2026-11-20T09:00:00Z';
const original=path.join(root,'catalog'),cache=path.join(root,'cache'),signal=path.join(root,'github-output');
const oracleFile=path.join(root,'oracle.gz'),tagsFile=path.join(root,'tags.gz');
const uuid=i=>((i%256).toString(16).padStart(2,'0'))+'000000-0000-4000-8000-'+i.toString(16).padStart(12,'0');
const writeFixture=(file,values)=>fs.writeFileSync(file,zlib.gzipSync(values.map(x=>JSON.stringify(x)).join('\n')+'\n'));
const slugs=['ramp','card-advantage','tutor','spot-removal','sweeper','counterspell','hate-graveyard','protection','recursion','sacrifice-outlet','synergy-equipment','alternate-win-condition','extra-combat-phase','overrun','repeatable-token-generator'];
const preload=path.join(root,'mock.cjs');
fs.writeFileSync(preload,`
const fs=require('node:fs');
const date=process.env.TEST_CATALOG_NOW;
const OriginalDate=Date;
global.Date=class extends OriginalDate{
 constructor(...args){super(...(args.length?args:[date]));}
 static now(){return OriginalDate.parse(date);}
};
global.fetch=async input=>{
 const url=String(input),isEmpty=process.env.TEST_CATALOG_TAGS==='empty',isShortBody=process.env.TEST_CATALOG_TAGS==='short-body';
 if(url==='https://api.scryfall.com/bulk-data')return Response.json({object:'list',data:[
  {type:'oracle_cards',updated_at:'${sourceDate}',jsonl_download_uri:'https://data.scryfall.io/fixture/oracle.jsonl.gz'},
  {type:'oracle_tags',updated_at:'${sourceDate}',compressed_size:isEmpty?20:9999,jsonl_download_uri:'https://data.scryfall.io/fixture/tags.jsonl.gz'}
 ]});
 if(url==='https://data.scryfall.io/fixture/oracle.jsonl.gz')return new Response(fs.readFileSync(${JSON.stringify(oracleFile)}));
 if(url==='https://data.scryfall.io/fixture/tags.jsonl.gz')return new Response(isShortBody?Buffer.alloc(20):fs.readFileSync(${JSON.stringify(tagsFile)}));
 throw Error('Unexpected external request (fixture stays offline): '+url);
};
`);
function run(tags,from=cache,date=firstDate){
 fs.writeFileSync(signal,'');
 const result=spawnSync(process.execPath,['--require',preload,refresh,'--output',original,'--fallback-cache',from],{
  encoding:'utf8',env:{...process.env,SCRYFALL_BULK_METADATA_URL:'https://api.scryfall.com/bulk-data',TEST_CATALOG_TAGS:tags,TEST_CATALOG_NOW:date,GITHUB_OUTPUT:signal,GITHUB_SHA:'a'.repeat(40)},timeout:120000,
 });
 assert.equal(result.error,undefined);
 return {...result,mode:fs.readFileSync(signal,'utf8')};
}
const currentManifest=()=>fs.readFileSync(path.join(original,'manifest.json'),'utf8');
try{
 writeFixture(oracleFile,Array.from({length:30000},(_,i)=>({object:'card',oracle_id:uuid(i),name:'Fixture '+i,type_line:'Creature',oracle_text:'Valid rules text',legalities:{commander:'legal'}})));
 writeFixture(tagsFile,Array.from({length:1000},(_,i)=>({object:'tag',id:'tag-'+i,slug:slugs[i]||'fixture-'+i,child_ids:[],taggings:[{oracle_id:uuid(i)}]})));
 const fresh=run('fresh');assert.equal(fresh.status,0,fresh.stderr);assert.equal(fresh.mode,'refresh_mode=fresh\n');
 const initial=validateSnapshot(cache,Date.parse(firstDate));
 assert.equal(initial.status.lastSuccessfulRefresh,new Date(firstDate).toISOString());
 assert.equal(initial.status.refreshFallback,undefined);
 assert.equal(initial.cards,30000);
 console.log('PASS Complete fresh paired source validates and seeds a separate cache');
 const empty=run('empty',cache,'2026-11-21T10:00:00Z');assert.equal(empty.status,0,empty.stderr);assert.equal(empty.mode,'refresh_mode=cache\n');
 const restored=JSON.parse(currentManifest());
 assert.deepEqual(restored.files,initial.files);
 assert.equal(restored.status.lastSuccessfulRefresh,initial.status.lastSuccessfulRefresh);
 assert.equal(restored.status.tagUpdatedAt,initial.status.tagUpdatedAt);
 assert.equal(restored.status.refreshFallback.reason,'oracle-tags-empty');
 assert.equal(restored.status.refreshFallback.servedFrom,'validated-actions-cache');
 assert.equal(validateSnapshot(cache,Date.parse(firstDate)).status.refreshFallback,undefined);
 const short=run('short-body',cache,'2026-11-21T10:01:00Z');assert.equal(short.status,0,short.stderr);assert.equal(short.mode,'refresh_mode=cache\n');
 console.log('PASS Declared empty feed or unexpectedly short body serves the entire checked previous snapshot without advancing its age');
 const recovered=run('fresh',cache,'2026-11-22T10:00:00Z');assert.equal(recovered.status,0,recovered.stderr);assert.equal(recovered.mode,'refresh_mode=fresh\n');
 assert.equal(JSON.parse(currentManifest()).status.refreshFallback,undefined);
 assert.equal(JSON.parse(currentManifest()).status.lastSuccessfulRefresh,new Date('2026-11-22T10:00:00Z').toISOString());
 console.log('PASS Recovery of the paired feed clears fallback mode and refreshes its cache');
 const preserved=currentManifest();
 const expired=run('empty',cache,'2026-11-29T10:00:00Z');assert.notEqual(expired.status,0);assert.match(expired.stderr,/over seven days old/);assert.equal(expired.mode,'');assert.equal(currentManifest(),preserved);
 const absent=run('empty',path.join(root,'not-there'),'2026-11-29T10:00:00Z');assert.notEqual(absent.status,0);assert.match(absent.stderr,/bootstrap Oracle cards.+over seven days old/);assert.equal(absent.mode,'');assert.equal(currentManifest(),preserved);
 const shard=path.join(cache,'cards-00.json.gz'),data=fs.readFileSync(shard);data[10]^=1;fs.writeFileSync(shard,data);
 const corrupt=run('empty',cache,'2026-11-22T10:02:00Z');assert.notEqual(corrupt.status,0);assert.match(corrupt.stderr,/digest mismatch/);assert.equal(corrupt.mode,'');assert.equal(currentManifest(),preserved);
 console.log('PASS Corrupt, over-age, or absent/expired-bootstrap snapshot fails without changing the target');
}finally{fs.rmSync(root,{recursive:true,force:true});}
