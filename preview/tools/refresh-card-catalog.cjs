#!/usr/bin/env node
'use strict';

const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const readline=require('node:readline');
const {Readable,Transform}=require('node:stream');
const {pipeline}=require('node:stream/promises');
const zlib=require('node:zlib');

const repo=path.resolve(__dirname,'../..');
const defaultOutput=path.join(repo,'preview/public/card-data');
const outputArg=process.argv.indexOf('--output');
const output=path.resolve(outputArg>=0?process.argv[outputArg+1]:defaultOutput);
const metadataUrl=process.env.SCRYFALL_BULK_METADATA_URL||'https://api.scryfall.com/bulk-data';
const userAgent='DeckSageCatalog/1.0 (https://deck-sage.com; daily public catalog refresh)';
const roleRoots={
 ramp:['ramp'],
 card_advantage:['card-advantage'],
 tutors:['tutor'],
 spot_removal:['spot-removal'],
 board_wipes:['sweeper'],
 counterspells:['counterspell'],
 graveyard_hate:['hate-graveyard'],
 protection:['protection'],
 recursion:['recursion'],
 sacrifice_outlets:['sacrifice-outlet'],
 equipment_support:['synergy-equipment'],
 game_closers:['alternate-win-condition','extra-combat-phase','overrun'],
 token_makers:['repeatable-token-generator'],
};
const fields=['oracle_id','name','normalized_name','type_line','oracle_text','color_identity','cmc','rarity','commander_legal','layout','source','role_tags'];

function invariant(condition,message){if(!condition)throw Error(message);}
function normalized(value){return String(value||'').normalize('NFKD').replace(/[^\x00-\x7F]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
function json(value){return Buffer.from(JSON.stringify(value));}
function sha(buffer){return crypto.createHash('sha256').update(buffer).digest('hex');}
function readGzip(file){return JSON.parse(zlib.gunzipSync(fs.readFileSync(file)));}
function writeGzip(folder,name,value,files){const blob=zlib.gzipSync(json(value),{level:9,mtime:0});fs.writeFileSync(path.join(folder,name),blob);files[name]={bytes:blob.length,sha256:sha(blob)};}
function imageUris(card){const faces=card.card_faces||[];return card.image_uris||faces.find(face=>face.image_uris)?.image_uris||{};}
function joined(card,key){return card[key]||(card.card_faces||[]).map(face=>face[key]).filter(Boolean).join(' // ');}
function publicCard(card){
 const images=imageUris(card),faces=card.card_faces||[];
 return {id:card.oracle_id,oracleId:card.oracle_id,scryfallId:card.id,name:card.name,manaCost:joined(card,'mana_cost'),cmc:Number(card.cmc)||0,typeLine:joined(card,'type_line'),oracleText:joined(card,'oracle_text'),colors:card.colors||[],colorIdentity:card.color_identity||[],power:card.power??null,toughness:card.toughness??null,loyalty:card.loyalty??null,defense:card.defense??null,keywords:card.keywords||[],legalities:card.legalities||{},imageUrl:images.normal||null,artUrl:images.art_crop||null,imageLarge:images.large||null,setName:card.set_name||null,setCode:card.set||null,collectorNumber:card.collector_number||null,rarity:card.rarity||null,prices:card.prices||{},flavorText:card.flavor_text||null,artist:card.artist||null,releasedAt:card.released_at||null,faces,layout:card.layout||null,scryfallUrl:card.scryfall_uri||null,dataSource:'scryfall-oracle-bulk',dataNote:null,metadataComplete:true,raw:card};
}
function loadPrevious(folder){
 const manifestPath=path.join(folder,'manifest.json');
 if(!fs.existsSync(manifestPath))return {manifest:null,cards:[],aliases:[]};
 const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8')),index=readGzip(path.join(folder,'search-index.json.gz'));
 const positions=Object.fromEntries(index.fields.map((field,index)=>[field,index])),historical=[];
 for(const row of index.cards){
  if(row[positions.source]==='scryfall-oracle-bulk')continue;
  const id=row[positions.oracle_id],shard=readGzip(path.join(folder,`cards-${id.slice(0,2)}.json.gz`));
  invariant(shard[id],`Previous historical record ${id} is missing from its shard.`);historical.push(shard[id]);
 }
 return {manifest,cards:historical,aliases:index.aliases||[],previousScryfall:index.cards.length-historical.length};
}
async function requestJson(url){
 const response=await fetch(url,{headers:{Accept:'application/json','User-Agent':userAgent}});
 invariant(response.ok,`Scryfall metadata request failed with HTTP ${response.status}.`);
 return response.json();
}
function validateDataset(entry,type){
 invariant(entry?.type===type,`Missing ${type} bulk metadata.`);
 invariant(/^https:\/\/data\.scryfall\.io\/.+\.jsonl\.gz$/.test(entry.jsonl_download_uri||''),`${type} did not provide a trusted JSONL download URI.`);
 invariant(Number.isFinite(Date.parse(entry.updated_at)),`${type} did not provide a valid update timestamp.`);
}
async function download(entry,file){
 const response=await fetch(entry.jsonl_download_uri,{headers:{Accept:'application/gzip','User-Agent':userAgent}});
 invariant(response.ok&&response.body,`${entry.type} download failed with HTTP ${response.status}.`);
 const digest=crypto.createHash('sha256');let bytes=0;
 const meter=new Transform({transform(chunk,encoding,done){bytes+=chunk.length;digest.update(chunk);done(null,chunk);}});
 await pipeline(Readable.fromWeb(response.body),meter,fs.createWriteStream(file,{flags:'wx'}));
 invariant(bytes>1024,`${entry.type} download was unexpectedly small.`);
 return {bytes,sha256:digest.digest('hex')};
}
async function eachJsonl(file,callback){
 const input=fs.createReadStream(file).pipe(zlib.createGunzip()),lines=readline.createInterface({input,crlfDelay:Infinity});let count=0;
 for await(const line of lines){if(!line.trim())continue;let value;try{value=JSON.parse(line);}catch{throw Error(`Malformed JSONL record at line ${count+1} of ${path.basename(file)}.`);}await callback(value,count);count++;}
 return count;
}
async function readTags(file){
 const tags=[],ids=new Set();
 const count=await eachJsonl(file,tag=>{invariant(tag?.object==='tag'&&typeof tag.id==='string'&&typeof tag.slug==='string'&&Array.isArray(tag.taggings),`Invalid Oracle tag record ${tag?.id||'(unknown)'}.`);invariant(!ids.has(tag.id),`Duplicate Oracle tag id ${tag.id}.`);ids.add(tag.id);tags.push(tag);});
 invariant(count>=1000,`Oracle tag dataset collapsed to ${count} records.`);return tags;
}
function roleAssignments(tags){
 const byId=new Map(tags.map(tag=>[tag.id,tag])),bySlug=new Map(tags.map(tag=>[tag.slug,tag])),assigned=new Map();
 for(const [role,roots] of Object.entries(roleRoots)){
  const selected=new Set(),queue=[];
  for(const slug of roots){const tag=bySlug.get(slug);invariant(tag,`Required Oracle tag ${slug} is missing.`);queue.push(tag.id);}
  while(queue.length){const id=queue.pop();if(selected.has(id))continue;selected.add(id);for(const child of byId.get(id)?.child_ids||[])queue.push(child);}
  for(const id of selected)for(const tagging of byId.get(id)?.taggings||[]){if(!assigned.has(tagging.oracle_id))assigned.set(tagging.oracle_id,new Set());assigned.get(tagging.oracle_id).add(role);}
 }
 return assigned;
}
function enhanceRoles(card,roles){
 const found=new Set(roles||[]),oracle=joined(card,'oracle_text').toLowerCase(),typeLine=joined(card,'type_line').toLowerCase();
 if(/\bequipment\b/.test(typeLine))found.add('equipment_cards');else found.delete('equipment_cards');
 if(/\bequipment\b/.test(typeLine))found.delete('equipment_support');
 if(/\bcreate(?:s|d)?\b[\s\S]{0,140}\btoken\b|\b(investigate|amass|incubate)\b/.test(oracle))found.add('token_makers');
 return [...found].sort();
}
function addAlias(map,name,id,confidence){const key=normalized(name);if(!key)return;const identity=`${key}\0${id}`,existing=map.get(identity);if(!existing||confidence>existing[2])map.set(identity,[key,id,confidence]);}
function historicalRow(card){return [card.oracleId||card.id,card.name,normalized(card.name),card.typeLine||'',card.oracleText||'',(card.colorIdentity||[]).join(''),Number(card.cmc)||0,card.rarity||'',card.legalities?.commander==='legal'?1:0,card.layout||'',card.dataSource||'historical-app-snapshot',null];}
function safeSwap(temp,target){
 const backup=`${target}.previous-${process.pid}`;let moved=false;
 try{if(fs.existsSync(target)){fs.renameSync(target,backup);moved=true;}fs.renameSync(temp,target);if(moved)fs.rmSync(backup,{recursive:true,force:true});}
 catch(error){if(!fs.existsSync(target)&&moved&&fs.existsSync(backup))fs.renameSync(backup,target);throw error;}
}

async function main(){
 const previous=loadPrevious(output),parent=path.dirname(output),temp=fs.mkdtempSync(path.join(parent,'.card-data-refresh-'));
 try{
  const metadata=await requestJson(metadataUrl);invariant(metadata?.object==='list'&&Array.isArray(metadata.data),'Scryfall bulk metadata did not contain a data list.');
  const oracleEntry=metadata.data.find(item=>item.type==='oracle_cards'),tagEntry=metadata.data.find(item=>item.type==='oracle_tags');validateDataset(oracleEntry,'oracle_cards');validateDataset(tagEntry,'oracle_tags');
  const oracleFile=path.join(temp,'oracle.jsonl.gz'),tagFile=path.join(temp,'tags.jsonl.gz');
  const [oracleArchive,tagArchive]=await Promise.all([download(oracleEntry,oracleFile),download(tagEntry,tagFile)]);
  const tags=await readTags(tagFile),roles=roleAssignments(tags),cards=new Map(),oracleRaw=new Map(),duplicateIds=[];
  const oracleCount=await eachJsonl(oracleFile,card=>{
   invariant(card?.object==='card'&&/^[0-9a-f-]{36}$/i.test(card.oracle_id||'')&&typeof card.name==='string'&&typeof card.type_line==='string'&&card.legalities&&typeof card.legalities==='object',`Invalid Oracle card record ${card?.id||'(unknown)'}.`);
   if(cards.has(card.oracle_id)){duplicateIds.push(card.oracle_id);return;}
   const full=publicCard(card);cards.set(card.oracle_id,full);oracleRaw.set(card.oracle_id,card);
  });
  invariant(duplicateIds.length===0,`Oracle dataset contained duplicate identities: ${duplicateIds.slice(0,3).join(', ')}.`);
  invariant(oracleCount>=30000,`Oracle dataset collapsed to ${oracleCount} records.`);
  if(previous.previousScryfall)invariant(oracleCount>=Math.floor(previous.previousScryfall*.97),`Oracle dataset dropped from ${previous.previousScryfall} to ${oracleCount} records.`);
  for(const historical of previous.cards){const id=historical.oracleId||historical.id;if(!cards.has(id))cards.set(id,historical);}
  const aliases=new Map();
  for(const [name,id,confidence] of previous.aliases)if(cards.has(id))addAlias(aliases,name,id,Number(confidence)||0);
  const rows=[],shards=new Map();let rulesTextCards=0,roleTaggedCards=0,orphanTaggings=0,totalTaggings=0;
  for(const tag of tags)for(const tagging of tag.taggings){totalTaggings++;if(!cards.has(tagging.oracle_id))orphanTaggings++;}
  invariant(orphanTaggings/Math.max(totalTaggings,1)<.08,`Oracle tags contained too many unmatched identities (${orphanTaggings}/${totalTaggings}).`);
  for(const [id,full] of cards){
   const raw=oracleRaw.get(id);let row;
   if(raw){
    const assigned=enhanceRoles(raw,roles.get(id));if(assigned.length)roleTaggedCards++;
    const typeLine=joined(raw,'type_line'),oracleText=joined(raw,'oracle_text');if(oracleText)rulesTextCards++;
    row=[id,raw.name,normalized(raw.name),typeLine,oracleText,(raw.color_identity||[]).join(''),Number(raw.cmc)||0,raw.rarity||'',raw.legalities.commander==='legal'?1:0,raw.layout||'', 'scryfall-oracle-bulk',assigned];
    addAlias(aliases,raw.name,id,1);for(const face of raw.card_faces||[])addAlias(aliases,face.name,id,.99);
   }else{row=historicalRow(full);if(full.oracleText)rulesTextCards++;addAlias(aliases,full.name,id,1);}
   rows.push(row);const shard=id.slice(0,2);if(!shards.has(shard))shards.set(shard,{});shards.get(shard)[id]=full;
  }
  rows.sort((a,b)=>a[2].localeCompare(b[2])||a[0].localeCompare(b[0]));const aliasRows=[...aliases.values()].sort((a,b)=>a[0].localeCompare(b[0])||b[2]-a[2]||a[1].localeCompare(b[1]));
  invariant(rows.length===cards.size,'Search index identity count did not match full-card identity count.');invariant(shards.size>=250,'Too few identity shards were generated.');
  fs.rmSync(oracleFile);fs.rmSync(tagFile);const files={};writeGzip(temp,'search-index.json.gz',{fields,cards:rows,aliases:aliasRows},files);for(const [shard,value] of [...shards].sort())writeGzip(temp,`cards-${shard}.json.gz`,value,files);
  invariant(Object.keys(files).length===257,'Catalog did not produce one index and 256 shards.');
  for(const [name,entry] of Object.entries(files)){const blob=fs.readFileSync(path.join(temp,name));invariant(blob.length===entry.bytes&&sha(blob)===entry.sha256,`Generated file validation failed for ${name}.`);}
  const indexHash=files['search-index.json.gz'].sha256,catalogVersion=`${oracleEntry.updated_at.replace(/[^0-9]/g,'').slice(0,14)}-${indexHash.slice(0,12)}`,generatedAt=new Date().toISOString();
  const status={appCommit:process.env.GITHUB_SHA||previous.manifest?.status?.appCommit||null,sourceDatabaseSha256:previous.manifest?.status?.sourceDatabaseSha256||null,sourceDatabaseCards:previous.manifest?.status?.sourceDatabaseCards||null,cards:rows.length,fullDataCards:oracleCount,historicalCards:previous.cards.length,rulesTextCards,aliases:aliasRows.length,roleTaggedCards,bulkUpdatedAt:oracleEntry.updated_at,tagUpdatedAt:tagEntry.updated_at,lastSuccessfulRefresh:generatedAt,catalogVersion,archiveSha256:oracleArchive.sha256,tagsArchiveSha256:tagArchive.sha256,orphanTaggings,totalTaggings,integrity:'ok',generatedAt,source:'https://scryfall.com/docs/api/bulk-data',classificationSource:'Scryfall Oracle Tags (community-maintained) plus narrow rules-text fallbacks',mode:'browser-local-static',cloudConnected:false,modelInstalled:false,databaseReadOnly:true};
  const manifest={version:2,catalogVersion,cards:rows.length,status,files,publicDataOnly:true,schema:'deck-sage-static-v2'};fs.writeFileSync(path.join(temp,'manifest.json'),json(manifest));
  safeSwap(temp,output);console.log(JSON.stringify({catalogVersion,cards:rows.length,scryfallCards:oracleCount,historicalCards:previous.cards.length,aliases:aliasRows.length,roleTaggedCards,orphanTaggings,totalTaggings,bulkUpdatedAt:oracleEntry.updated_at,tagUpdatedAt:tagEntry.updated_at,compressedBytes:Object.values(files).reduce((sum,file)=>sum+file.bytes,0)},null,2));
 }catch(error){fs.rmSync(temp,{recursive:true,force:true});throw error;}
}

main().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
