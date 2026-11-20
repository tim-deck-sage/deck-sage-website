'use strict';
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const zlib=require('node:zlib');

const hour=60*60*1000,maxAge=7*24*hour;
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const requireValid=(condition,message)=>{if(!condition)throw Error('Last-known-good catalog: '+message);};
const files=['search-index.json.gz',...Array.from({length:256},(_,i)=>'cards-'+i.toString(16).padStart(2,'0')+'.json.gz')];
const bootstrap={
 catalogVersion:'20261117100201-4832ed8b82c9',
 lastSuccessfulRefresh:'2026-11-17T16:58:55.064Z',
 appCommit:'756402c58707a74911c1ea8f1b7a33f321d2ef47',
 oracle:{type:'oracle_cards',updated_at:'2026-11-17T10:02:01.401Z',jsonl_download_uri:'https://data.scryfall.io/oracle-cards/oracle-cards-20261117100201.jsonl.gz',sha256:'51305ae67913463acc864af6f896fe28ade7a3f5c3cd43e0484c5c1d3b15b31e'},
 tags:{type:'oracle_tags',updated_at:'2026-11-17T10:00:37.426Z',jsonl_download_uri:'https://data.scryfall.io/oracle-tags/oracle-tags-20261117100037.jsonl.gz',sha256:'422c897950e75d904c1bc20ede0fe3716160e1a41130201815ca19eadcd3074f'},
};
function checkAge(value,label,now){
 const time=Date.parse(value);
 requireValid(Number.isFinite(time)&&time<=now&&now-time<=maxAge,label+' is missing, in the future, or over seven days old.');
}
function checkBootstrap(now){
 checkAge(bootstrap.oracle.updated_at,'bootstrap Oracle cards',now);
 checkAge(bootstrap.tags.updated_at,'bootstrap Oracle tags',now);
 checkAge(bootstrap.lastSuccessfulRefresh,'bootstrap validation',now);
}
function validateSnapshot(dir,now=Date.now()){
 requireValid(fs.lstatSync(dir).isDirectory(),'path is not a real directory.');
 const names=fs.readdirSync(dir);
 requireValid(names.length===258&&names.includes('manifest.json'),'expected the manifest and all 257 catalogs.');
 const manifestPath=path.join(dir,'manifest.json');
 requireValid(fs.lstatSync(manifestPath).isFile(),'manifest is not a real file.');
 const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8')),s=manifest.status;
 requireValid(manifest.version===2&&manifest.schema==='deck-sage-static-v2'&&manifest.publicDataOnly===true&&s?.integrity==='ok','missing validation provenance.');
 requireValid(manifest.cards===s.cards&&Number.isInteger(s.fullDataCards)&&s.fullDataCards>=30000&&s.fullDataCards<=s.cards&&s.roleTaggedCards>0&&s.totalTaggings>=1000&&s.orphanTaggings>=0&&s.orphanTaggings/s.totalTaggings<.08,'card or tag counts are invalid.');
 requireValid([s.appCommit,s.archiveSha256,s.tagsArchiveSha256].every((hash,i)=>typeof hash==='string'&&(i===0?/^[a-f0-9]{40}$/:/^[a-f0-9]{64}$/).test(hash)),'archive or originating application digests are missing.');
 for(const field of ['lastSuccessfulRefresh','bulkUpdatedAt','tagUpdatedAt'])checkAge(s[field],field,now);
 requireValid(s.generatedAt===s.lastSuccessfulRefresh&&Date.parse(s.generatedAt)>=Math.max(Date.parse(s.bulkUpdatedAt),Date.parse(s.tagUpdatedAt)),'freshness metadata is inconsistent.');
 requireValid(Object.keys(manifest.files||{}).length===files.length,'unexpected manifest file list.');
 let identities=null;
 for(const name of files){
  const entry=manifest.files[name],file=path.join(dir,name);
  requireValid(entry&&Number.isSafeInteger(entry.bytes)&&entry.bytes>0&&entry.bytes<=16*1024*1024&&/^[a-f0-9]{64}$/.test(entry.sha256),'invalid metadata for '+name);
  const stat=fs.lstatSync(file);
  requireValid(stat.isFile()&&stat.size===entry.bytes,'invalid file or size for '+name);
  const blob=fs.readFileSync(file);
  requireValid(sha(blob)===entry.sha256,'digest mismatch for '+name);
  const data=JSON.parse(zlib.gunzipSync(blob,{maxOutputLength:64*1024*1024}));
  if(name==='search-index.json.gz'){
   const position=data.fields.indexOf('oracle_id');
   requireValid(position>=0&&Array.isArray(data.cards)&&data.cards.length===manifest.cards,'invalid search index.');
   identities=new Set(data.cards.map(row=>row[position]));
   requireValid(identities.size===manifest.cards&&[...identities].every(id=>/^[a-f0-9-]{36}$/i.test(id)),'invalid or duplicated card identities.');
   const version=s.bulkUpdatedAt.replace(/[^0-9]/g,'').slice(0,14)+'-'+entry.sha256.slice(0,12);
   requireValid(version===manifest.catalogVersion&&version===s.catalogVersion,'catalog fingerprint mismatch.');
  }else{
   const prefix=name.slice(6,8);
   for(const [id,card] of Object.entries(data)){
    requireValid(id.startsWith(prefix)&&card.oracleId===id&&identities.delete(id),'invalid, misplaced or unknown identity in '+name);
   }
  }
 }
 requireValid(identities?.size===0,'index contains identities missing from card shards.');
 return manifest;
}
module.exports={bootstrap,checkBootstrap,validateSnapshot};
