#!/usr/bin/env node
'use strict';
// Build-time only. No visitor searches, inventory access, credentials, or paid APIs.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto');
const {Readable}=require('node:stream'),{pipeline}=require('node:stream/promises');
const art=require('./refresh-commander-art.cjs');
const ROOT=path.resolve(__dirname,'../..'),UA='DeckSageCombos/1.0 (https://deck-sage.com)',SOURCE='https://json.commanderspellbook.com/variants.json.gz';
const assert=(ok,message)=>{if(!ok)throw Error(message);},hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const image=c=>c.image_uris||c.card_faces?.find(f=>f.image_uris)?.image_uris||{};
async function get(url){const r=await fetch(url,{headers:{Accept:'application/json','User-Agent':UA},signal:AbortSignal.timeout(600000)});assert(r.ok,'Source HTTP '+r.status);return r;}
function validateCommanderCatalog(cards,total,pages=[]){
 assert(cards.length===total&&total>3000,'Incomplete commander catalog');
 const identities=new Map();
 for(let i=0;i<cards.length;i++){const c=cards[i],rows=identities.get(c.oracle_id)||[];rows.push({name:c.name,printingId:c.id,page:pages[i]});identities.set(c.oracle_id,rows);}
 const duplicates=[...identities].filter(([,rows])=>rows.length>1);
 assert(!duplicates.length,'Duplicate Oracle identities: '+JSON.stringify({duplicateIdentities:duplicates.length,records:duplicates.slice(0,10).map(([oracleId,rows])=>({oracleId,rows}))}));
 return cards;
}
// Each refresh uses one cache namespace: mixed-age source pages can shift pagination boundaries.
async function commanders(){
 let url='https://api.scryfall.com/cards/search?'+new URLSearchParams({q:'(is:commander or (t:legendary t:background)) game:paper',unique:'cards',order:'name',dir:'asc'}),cards=[],total=0,pageNumber=0,pages=[],refreshToken=crypto.randomUUID();
 while(url){
  assert(/^https:\/\/api\.scryfall\.com\/cards\/search\?/.test(url),'Untrusted next page');
  const request=new URL(url);request.searchParams.set('_ds_refresh',refreshToken);
  const page=await (await get(request.href)).json();
  assert(Array.isArray(page.data),'Invalid commander page');
  assert(!pageNumber||page.total_cards===total,'Commander catalog total changed across pages: '+total+' -> '+page.total_cards+' on page '+(pageNumber+1));
  total=page.total_cards;pageNumber++;cards.push(...page.data);pages.push(...page.data.map(()=>pageNumber));
  url=page.has_more?page.next_page:null;
  if(url)await new Promise(r=>setTimeout(r,550));
 }
 return validateCommanderCatalog(cards,total,pages);
}
function normalizeCard(c){const im=image(c);return {oracleId:c.oracle_id,id:c.oracle_id,name:c.name,cmc:c.cmc,manaCost:c.mana_cost||c.card_faces?.[0]?.mana_cost||'',typeLine:c.type_line,oracleText:c.oracle_text||(c.card_faces||[]).map(f=>f.oracle_text||'').join('\n'),keywords:c.keywords||[],colorIdentity:c.color_identity,legalities:c.legalities,power:c.power,releasedAt:c.released_at,imageUrl:im.large||im.normal||im.png||'',scryfallUrl:c.scryfall_uri,artist:c.artist||c.card_faces?.[0]?.artist||'',background:/\bBackground\b/.test(c.type_line),faces:(c.card_faces||[]).filter(f=>f.image_uris).map(f=>({name:f.name,imageUrl:f.image_uris.large||f.image_uris.normal}))};}
function normalizeVariant(v){
 assert(typeof v.id==='string'&&/^[a-zA-Z0-9_-]+$/.test(v.id)&&Array.isArray(v.uses)&&v.uses.length&&Array.isArray(v.requires)&&Array.isArray(v.produces),'Invalid Spellbook variant');
 for(const u of v.uses)assert(u.card?.oracleId&&u.card.name&&Number.isInteger(u.quantity)&&u.quantity>0&&Array.isArray(u.zoneLocations),'Invalid combo ingredient');
 return {...Object.fromEntries(['id','identity','status','spoiler','legalities','bracketTag','manaNeeded','manaValueNeeded','easyPrerequisites','notablePrerequisites','description','notes','popularity'].filter(k=>v[k]!==undefined).map(k=>[k,v[k]])),uses:v.uses.map(u=>({...u,card:{oracleId:u.card.oracleId,name:u.card.name,imageUrl:u.card.imageUriFrontLarge||u.card.imageUrl||'',backImageUrl:u.card.imageUriBackLarge||u.card.backImageUrl||''}})),requires:v.requires,produces:v.produces,sourceUrl:'https://commanderspellbook.com/combo/'+v.id+'/'};
}
function parseBulk(input){
 const bytes=input[0]===31&&input[1]===139?zlib.gunzipSync(input,{maxOutputLength:2000000000}):input;
 const marker=bytes.indexOf('"variants"'),start=bytes.indexOf('[',marker),prefix=bytes.subarray(0,marker).toString('utf8');
 assert(marker>0&&marker<4096&&start>marker,'Invalid bulk layout');
 const timestamp=prefix.match(/"timestamp"\s*:\s*"([^"]+)"/)?.[1],version=prefix.match(/"version"\s*:\s*"([^"]+)"/)?.[1];
 const variants=[];let depth=0,quoted=false,escaped=false,record=-1,complete=false;
 // Scan bytes, not a giant JS string. JSON strings cannot contain unescaped ASCII quote/bracket bytes.
 for(let i=start+1;i<bytes.length;i++){const b=bytes[i];if(quoted){if(escaped)escaped=false;else if(b===92)escaped=true;else if(b===34)quoted=false;continue;}if(b===34){quoted=true;continue;}if(b===123||b===91){if(depth===0)record=i;depth++;}else if(b===125||b===93){if(depth===0&&b===93){complete=true;break;}depth--;if(depth===0){variants.push(normalizeVariant(JSON.parse(bytes.subarray(record,i+1).toString('utf8'))));record=-1;}}}
 assert(complete&&depth===0&&!quoted,'Truncated bulk export');return {timestamp,version,variants};
}
function strength(v){const names=v.produces.map(p=>p.feature?.name||'').join(' ');return [/win the game|each opponent loses|infinite (?:damage|life loss)|infinite combat/i.test(names)?3:/infinite/i.test(names)?2:1,v.uses.reduce((n,u)=>n+u.quantity,0)+(v.requires||[]).reduce((n,u)=>n+(u.quantity||1),0),Number.isFinite(v.manaValueNeeded)?v.manaValueNeeded:999];}
function compare(a,b){const x=strength(a),y=strength(b);return y[0]-x[0]||x[1]-y[1]||x[2]-y[2]||a.id.localeCompare(b.id);}
function loadImages(){const images=new Map(),folder=path.join(ROOT,'preview/public/card-data');for(const name of fs.readdirSync(folder).filter(n=>/^cards-[a-f0-9]{2}\.json\.gz$/.test(n))){const shard=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(folder,name))));for(const c of Object.values(shard))images.set(c.oracleId,{imageUrl:c.imageLarge||c.imageUrl||'',backImageUrl:c.faces?.[1]?.image_uris?.large||''});}return images;}
function hydrateImages(variants,images){for(const v of variants)for(const u of v.uses){const image=images.get(u.card.oracleId);if(image){u.card.imageUrl=u.card.imageUrl||image.imageUrl;u.card.backImageUrl=u.card.backImageUrl||image.backImageUrl;}}}
function build(rawCards,payload,printings=new Map(),now=new Date()){
 assert(payload&&Array.isArray(payload.variants)&&payload.variants.length>10000&&Number.isFinite(Date.parse(payload.timestamp))&&payload.version,'Invalid Spellbook bulk envelope');
 const cards=rawCards.map(normalizeCard),byId=new Map(cards.map(c=>[c.oracleId,c])),combos=new Map(cards.map(c=>[c.oracleId,[]])),seen=new Set();
 for(const raw of payload.variants){const v=normalizeVariant(raw);assert(!seen.has(v.id),'Duplicate combo ID');seen.add(v.id);for(const id of new Set(v.uses.map(u=>u.card.oracleId)))if(combos.has(id))combos.get(id).push(v);}
 const files={},contents={};
 for(const c of cards){const allPrints=printings.get(c.oracleId)||[],released=allPrints.filter(p=>p.games?.includes('paper')&&!p.oversized&&p.released_at).map(p=>p.released_at).sort();if(released.length)c.releasedAt=released[0];const chosen=art.selectPreferred(allPrints.filter(p=>p.released_at<=now.toISOString().slice(0,10)),c.oracleId,c.name);if(chosen){const im=art.faceImages(chosen,c.name);c.imageUrl=im.large||im.normal||im.png;c.treatment=art.treatment(chosen);c.artist=chosen.artist||chosen.card_faces?.[0]?.artist||c.artist;c.scryfallUrl=chosen.scryfall_uri;}else c.treatment='normal';
  c.status=c.releasedAt>now.toISOString().slice(0,10)?'unreleased':c.legalities?.commander==='legal'?'legal':'illegal';
  const rows=combos.get(c.oracleId).sort(compare);c.comboCount=rows.length;c.comboFiles=[];
  for(let offset=0;offset<rows.length;offset+=40){const blob=zlib.gzipSync(JSON.stringify({schemaVersion:1,oracleId:c.oracleId,combos:rows.slice(offset,offset+40)}),{level:9}),digest=hash(blob),name=c.oracleId+'-'+digest.slice(0,16)+'.json.gz';contents[name]=blob;files[name]={sha256:digest,bytes:blob.length};c.comboFiles.push({file:name,...files[name]});}
 }
 cards.sort((a,b)=>a.name.localeCompare(b.name));
 return {index:{schemaVersion:1,generatedAt:now.toISOString(),source:{name:'Commander Spellbook',url:'https://commanderspellbook.com/',bulkUrl:SOURCE,updatedAt:payload.timestamp,version:payload.version,totalVariants:payload.variants.length},coverage:'Documented variants containing the selected card in Commander Spellbook. This is a bounded source snapshot, not every possible combo. Color compatibility alone is not association.',ranking:'Estimated strength: potential winning/damage/combat outcomes first, then other infinite engines, then other outcomes. Ties prefer fewer required pieces, then less stated setup mana, then stable source ID. Infinite mana is not automatically a win. This heuristic ignores interaction, consistency and metagame; it is not a deck power rating. Spellbook category labels are subjective source categories, not numerical ratings.',cards},contents};
}
function publish(output,result){
 fs.mkdirSync(output,{recursive:true});const shardDir=path.join(output,'shards');fs.mkdirSync(shardDir,{recursive:true});
 // Content-addressed shards are immutable; publish index last. Retain older shards for in-flight clients.
 for(const [name,b] of Object.entries(result.contents))if(!fs.existsSync(path.join(shardDir,name)))fs.writeFileSync(path.join(shardDir,name),b,{flag:'wx'});
 const json=JSON.stringify(result.index),blob=zlib.gzipSync(json,{level:9}),digest=hash(blob),file='catalog-'+digest.slice(0,16)+'.json.gz';
 fs.writeFileSync(path.join(output,file),blob);
 const staged=path.join(output,'catalog.json.stage');fs.writeFileSync(staged,json);fs.renameSync(staged,path.join(output,'catalog.json'));
 const manifest=path.join(output,'manifest.json.stage');fs.writeFileSync(manifest,JSON.stringify({schemaVersion:1,file,sha256:digest,generatedAt:result.index.generatedAt}));fs.renameSync(manifest,path.join(output,'manifest.json'));
}
async function refresh({output=path.join(ROOT,'preview/public/combo-data'),bulkFile=process.env.SPELLBOOK_BULK_FILE,printingFile=process.env.SCRYFALL_DEFAULT_BULK_FILE}={}){
 const rawCards=await commanders(),bytes=bulkFile?fs.readFileSync(bulkFile):Buffer.from(await (await get(SOURCE)).arrayBuffer());assert(bytes.length<2000000000,'Spellbook payload too large');const payload=parseBulk(bytes);
 const metadata=await (await get('https://api.scryfall.com/bulk-data')).json(),entry=metadata.data.find(d=>d.type==='default_cards');assert(/^https:\/\/data\.scryfall\.io\/.+\.jsonl\.gz$/.test(entry?.jsonl_download_uri||''),'Invalid artwork source');
 hydrateImages(payload.variants,loadImages());
 const temporary=!printingFile,file=printingFile||path.join(ROOT,'preview','.combo-printings-'+process.pid+'.gz');
 try{if(temporary){const response=await get(entry.jsonl_download_uri);await pipeline(Readable.fromWeb(response.body),fs.createWriteStream(file,{flags:'wx'}));}
  const prints=await art.readPrintings(file,new Set(rawCards.map(c=>c.oracle_id))),result=build(rawCards,payload,prints.map);result.index.source.sha256=hash(bytes);result.index.cardSource={name:'Scryfall',url:'https://scryfall.com/docs/api',updatedAt:entry.updated_at,query:'(is:commander or (t:legendary t:background)) game:paper'};
  const previous=path.join(output,'catalog.json');if(fs.existsSync(previous)){const old=JSON.parse(fs.readFileSync(previous));assert(result.index.source.updatedAt>=old.source.updatedAt,'Stale Spellbook source');assert(result.index.cards.length>=old.cards.length*.97,'Commander catalog collapsed');assert(payload.variants.length>=old.source.totalVariants*.97,'Spellbook catalog collapsed');}
  publish(output,result);return result.index;
 }finally{if(temporary)fs.rmSync(file,{force:true});}
}
if(require.main===module)refresh().then(r=>console.log(JSON.stringify({commanders:r.cards.length,variants:r.source.totalVariants,updatedAt:r.source.updatedAt}))).catch(e=>{console.error('Combo refresh failed; previous snapshot retained:',e.message);process.exitCode=1;});
module.exports={commanders,validateCommanderCatalog,normalizeCard,normalizeVariant,parseBulk,strength,compare,loadImages,hydrateImages,build,publish,refresh};
