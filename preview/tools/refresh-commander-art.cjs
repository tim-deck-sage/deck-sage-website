#!/usr/bin/env node
'use strict';
// Build-time only: one official bulk download, never per-visitor printing searches.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),readline=require('node:readline'),crypto=require('node:crypto');
const {Readable}=require('node:stream'),{pipeline}=require('node:stream/promises');
const ROOT=path.resolve(__dirname,'../..'),UA='DeckSageCommanderArt/1.0 (https://deck-sage.com; daily public artwork refresh)';
const assert=(ok,message)=>{if(!ok)throw Error(message);};
const normalized=value=>String(value||'').trim().toLowerCase();
const image=uris=>uris?.large||uris?.normal||uris?.png||'';
function faceImages(print,name){
 const requested=normalized(name),faces=print.card_faces||[];
 const face=faces.find(f=>normalized(f.name)===requested)||faces.find(f=>normalized(f.name)===requested.split(' // ')[0]);
 return print.image_uris||face?.image_uris||faces[0]?.image_uris||{};
}
function treatment(print){return print.full_art?'full_art':print.border_color==='borderless'?'borderless':print.frame_effects?.includes('extendedart')?'extendedart':null;}
function eligible(print,oracleId){
 return print.oracle_id===oracleId&&print.games?.includes('paper')&&!print.digital&&!print.oversized&&!print.textless&&print.lang==='en'&&print.legalities?.commander==='legal'&&!['gold','silver','yellow'].includes(print.border_color)&&!['token','double_faced_token','art_series','emblem','planar','scheme','vanguard'].includes(print.layout)&&!['memorabilia','token'].includes(print.set_type)&&!['missing','placeholder'].includes(print.image_status);
}
function score(print){return ({full_art:300,borderless:200,extendedart:100}[treatment(print)]||0)+(print.highres_image?10:0)+(Date.parse(print.released_at)||0)/1e15;}
function selectPreferred(printings,oracleId,name){
 return printings.filter(p=>eligible(p,oracleId)&&treatment(p)&&image(faceImages(p,name))).sort((a,b)=>score(b)-score(a)||String(a.id).localeCompare(String(b.id)))[0]||null;
}
function validateImage(url){if(!url)return;const u=new URL(url);assert(u.protocol==='https:'&&u.hostname==='cards.scryfall.io','Untrusted image URL');assert(!u.pathname.startsWith('/art_crop/'),'Expected full-card image, not art crop');}
function buildMap(commanders,printings,canonical,{generatedAt=new Date().toISOString(),source={}}={}){
 const cards={},counts={uniqueCommanders:new Set(commanders.map(c=>c.oracleId)).size,commanderNames:commanders.length,preferred:0,fallback:0,missingImages:0,treatments:{full_art:0,borderless:0,extendedart:0}};
 const preferredIds=new Set(),fallbackIds=new Set(),missingIds=new Set();
 for(const row of commanders){
  const base=canonical.get(row.oracleId);assert(base&&base.oracleId===row.oracleId,'Missing canonical commander '+row.name);
  const raw=base.raw||{},baseImages=faceImages(raw,row.name),imageUrl=image(baseImages)||base.imageLarge||base.imageUrl||'';
  validateImage(imageUrl);
  const chosen=selectPreferred(printings.get(row.oracleId)||[],row.oracleId,row.name);
  const card={name:row.name,oracleId:row.oracleId,scryfallId:base.scryfallId||raw.id||'',imageUrl,artCropUrl:baseImages.art_crop||base.artUrl||null};
  if(chosen){const images=faceImages(chosen,row.name);card.displayArt={imageUrl:image(images),artCropUrl:images.art_crop||null,treatment:treatment(chosen),printingId:chosen.id,oracleId:chosen.oracle_id,scryfallUrl:chosen.scryfall_uri,artist:chosen.artist||chosen.card_faces?.[0]?.artist||null};validateImage(card.displayArt.imageUrl);if(!preferredIds.has(row.oracleId)){counts.treatments[card.displayArt.treatment]++;preferredIds.add(row.oracleId);}}
  else fallbackIds.add(row.oracleId);
  if(!imageUrl&&!chosen)missingIds.add(row.oracleId);
  assert(!cards[row.name]||cards[row.name].oracleId===row.oracleId,'Ambiguous commander name');cards[row.name]=card;
 }
 counts.preferred=preferredIds.size;counts.fallback=fallbackIds.size;counts.missingImages=missingIds.size;
 assert(counts.preferred+counts.fallback===counts.uniqueCommanders,'Artwork coverage does not reconcile');
 return {schemaVersion:1,generatedAt,source,coverage:counts,cards};
}
function loadInputs(preconDir,cardDir){
 const catalog=JSON.parse(fs.readFileSync(path.join(preconDir,'catalog.json'))),byName=new Map(),canonical=new Map(),shards=new Map();
 for(const deck of catalog.decks)for(const c of JSON.parse(fs.readFileSync(path.join(preconDir,deck.file))).cards.filter(c=>c.role==='commander')){assert(!byName.has(c.name)||byName.get(c.name).oracleId===c.oracleId,'Ambiguous commander name');byName.set(c.name,c);}
 for(const c of byName.values()){const prefix=c.oracleId.slice(0,2);if(!shards.has(prefix))shards.set(prefix,JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(cardDir,`cards-${prefix}.json.gz`)))));canonical.set(c.oracleId,shards.get(prefix)[c.oracleId]);}
 return {commanders:[...byName.values()].sort((a,b)=>a.name.localeCompare(b.name)),canonical,catalog};
}
async function readPrintings(file,wanted){
 const map=new Map();let records=0;const input=fs.createReadStream(file).pipe(zlib.createGunzip()),lines=readline.createInterface({input,crlfDelay:Infinity});
 for await(const line of lines){if(!line.trim())continue;const p=JSON.parse(line);records++;if(wanted.has(p.oracle_id)){if(!map.has(p.oracle_id))map.set(p.oracle_id,[]);map.get(p.oracle_id).push(p);}}
 assert(records>50000,'Default printing bulk dataset collapsed');return {map,records};
}
async function refresh({preconDir=path.join(ROOT,'preview/public/precon-data'),cardDir=path.join(ROOT,'preview/public/card-data'),bulkFile,metadataFile}={}){
 const {commanders,canonical,catalog}=loadInputs(preconDir,cardDir);
 const metadata=metadataFile?JSON.parse(fs.readFileSync(metadataFile)):await (async()=>{const r=await fetch('https://api.scryfall.com/bulk-data',{headers:{Accept:'application/json','User-Agent':UA},signal:AbortSignal.timeout(90000)});assert(r.ok,'Scryfall metadata HTTP '+r.status);return r.json();})();
 const entry=metadata.data?.find(d=>d.type==='default_cards');assert(entry&&/^https:\/\/data\.scryfall\.io\/.+\.jsonl\.gz$/.test(entry.jsonl_download_uri||'')&&Number.isFinite(Date.parse(entry.updated_at)),'Invalid official default_cards bulk metadata');
 const temporary=!bulkFile,file=bulkFile||path.join(preconDir,`.commander-printings-${process.pid}.jsonl.gz`);
 try{
  if(temporary){const r=await fetch(entry.jsonl_download_uri,{headers:{Accept:'application/gzip','User-Agent':UA},signal:AbortSignal.timeout(600000)});assert(r.ok&&r.body,'Scryfall bulk HTTP '+r.status);await pipeline(Readable.fromWeb(r.body),fs.createWriteStream(file,{flags:'wx'}));}
  const {map,records}=await readPrintings(file,new Set(commanders.map(c=>c.oracleId)));
  const digest=crypto.createHash('sha256');for await(const chunk of fs.createReadStream(file))digest.update(chunk);
  const result=buildMap(commanders,map,canonical,{source:{name:'Scryfall default_cards bulk',url:'https://scryfall.com/docs/api/bulk-data',updatedAt:entry.updated_at,downloadUrl:entry.jsonl_download_uri,sha256:digest.digest('hex'),records,catalogSourceDate:catalog.sourceDate}});
  assert(result.coverage.missingImages===0,'A commander has no verified fallback image');
  const target=path.join(preconDir,'commander-art.json'),staged=target+'.stage';fs.writeFileSync(staged,JSON.stringify(result));fs.renameSync(staged,target);return result;
 }finally{if(temporary)fs.rmSync(file,{force:true});}
}
if(require.main===module)refresh({bulkFile:process.env.SCRYFALL_DEFAULT_BULK_FILE,metadataFile:process.env.SCRYFALL_BULK_METADATA_FILE}).then(r=>console.log(JSON.stringify(r.coverage))).catch(e=>{console.error('Commander artwork refresh failed:',e.message);process.exitCode=1;});
module.exports={eligible,treatment,faceImages,selectPreferred,buildMap,loadInputs,readPrintings,refresh};
