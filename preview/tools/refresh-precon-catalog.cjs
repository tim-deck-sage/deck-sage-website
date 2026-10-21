#!/usr/bin/env node
'use strict';
// Public MTGJSON data only. A failed refresh never replaces the previous snapshot.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib');
const ROOT=path.resolve(__dirname,'../..'),BASE='https://mtgjson.com/api/v5/',TYPES=new Set(['Commander Deck','MTGO Commander Deck']);
const source={name:'MTGJSON',url:'https://mtgjson.com/',license:'MIT',licenseUrl:'https://mtgjson.com/license/'};
function assert(ok,message){if(!ok)throw Error(message);}
function hash(s){return crypto.createHash('sha256').update(s).digest('hex');}
function stableId(row){return `${row.code}-${row.name}`.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')+'-'+hash(`${row.code}\n${row.name}`).slice(0,8);}
function safeSourceUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&['magic.wizards.com','wizards.com','www.wizards.com','mtg.wiki','mtgjson.com'].includes(u.hostname)?u.href:null;}catch{return null;}}
function normalize(row,payload,now=new Date()){
 const d=payload.data;assert(d&&d.name===row.name&&d.code===row.code&&d.type===row.type,'Deck identity mismatch: '+row.fileName);
 const cards=[],colors=new Set();
 for(const [field,role] of [['commander','commander'],['mainBoard','main'],['sideBoard','sideboard']]){
  assert(Array.isArray(d[field]||[]),'Invalid zone '+field);const seen=new Map(),seenUuids=new Set();
  for(const c of d[field]||[]){
   if(c.isOversized)continue;
   if(c.uuid){assert(!seenUuids.has(c.uuid),'Duplicate source card record: '+c.name);seenUuids.add(c.uuid);}
   assert(typeof c.name==='string'&&c.name.length&&Number.isInteger(c.count)&&c.count>0&&c.count<=100,'Invalid card quantity/name');
   const sid=c.identifiers?.scryfallId,oid=c.identifiers?.scryfallOracleId;
   assert(sid&&oid,'Card has no resolvable Scryfall identity: '+c.name);
   // Back-face records are not additional physical cards.
   if(c.side&&c.side!=='a')continue;
   const existing=seen.get(oid);
   if(existing){existing.quantity+=c.count;continue;}
   const card={name:c.name,quantity:c.count,role,scryfallId:sid,oracleId:oid};seen.set(oid,card);cards.push(card);
   for(const color of c.colorIdentity||[])colors.add(color);
  }
 }
 const commanders=cards.filter(c=>c.role==='commander'),cardCount=cards.filter(c=>c.role!=='sideboard').reduce((n,c)=>n+c.quantity,0);
 assert(commanders.length>0,'No designated commander');assert(cardCount===100,'Commander list is not 100 cards: '+cardCount);
 assert(commanders.every(c=>c.quantity===1),'Invalid commander quantity');
 const ids=new Set(commanders.map(c=>c.oracleId));assert(!cards.some(c=>c.role==='main'&&ids.has(c.oracleId)),'Commander duplicated in main board');
 const releaseDate=row.releaseDate||d.releaseDate||null;assert(!releaseDate||/^\d{4}-\d{2}-\d{2}$/.test(releaseDate),'Invalid release date');
 const id=stableId(row),status=!releaseDate?'unknown':releaseDate>now.toISOString().slice(0,10)?'upcoming':'released';
 return {schemaVersion:1,id,name:row.name,releaseDate,setCode:row.code,category:row.type,medium:row.type==='MTGO Commander Deck'?'digital':'paper',format:'commander',sourceUrl:BASE+'decks/'+row.fileName+'.json',officialSourceUrl:safeSourceUrl(d.source||row.source),status,cardCount,commanders:commanders.map(c=>c.name),colors:['W','U','B','R','G'].filter(c=>colors.has(c)),file:'decks/'+id+'.json',source,sourceVersion:payload.meta?.version,sourceDate:payload.meta?.date,sourceChecksum:hash(JSON.stringify(payload)),validation:{complete:true,cardCount,unresolvedCount:0},cards};
}
async function request(url){
 const r=await fetch(url,{headers:{Accept:'application/gzip','User-Agent':'DeckSagePrecons/1.0 (https://deck-sage.com)'},signal:AbortSignal.timeout(90000)});
 assert(r.ok,'Upstream HTTP '+r.status+' '+url);const b=Buffer.from(await r.arrayBuffer());assert(b.length<25000000,'Oversized source');return JSON.parse(zlib.gunzipSync(b));
}
function validatePrevious(previous,next){
 if(!previous)return;
 assert(previous.schemaVersion===1,'Unsupported previous schema');
 if(previous.sourceDate&&next.sourceDate)assert(next.sourceDate>=previous.sourceDate,'Upstream snapshot is older than the previous catalog');
 const ids=new Set(next.decks.map(d=>d.id));
 for(const deck of previous.decks)assert(ids.has(deck.id),'Previous deck missing; refusing partial replacement: '+deck.name);
 assert(next.coverage.listedDecks>=previous.coverage.listedDecks,'Upstream Commander index shrank');
}
function publish(output,catalog,details){
 const temp=output+'.stage-'+process.pid,backup=output+'.backup-'+process.pid;
 fs.rmSync(temp,{recursive:true,force:true});fs.mkdirSync(path.join(temp,'decks'),{recursive:true});
 try{
  for(const d of details)fs.writeFileSync(path.join(temp,d.file),JSON.stringify(d));
  fs.writeFileSync(path.join(temp,'catalog.json'),JSON.stringify(catalog));
  fs.copyFileSync(path.join(ROOT,'preview/source/mtgjson-LICENSE.txt'),path.join(temp,'LICENSE.txt'));
  const previous=fs.existsSync(output);if(previous)fs.renameSync(output,backup);
  try{fs.renameSync(temp,output);}catch(e){if(previous)fs.renameSync(backup,output);throw e;}
  fs.rmSync(backup,{recursive:true,force:true});
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
}
async function refresh({output=path.join(ROOT,'preview/public/precon-data'),get=request,now=new Date()}={}){
 const index=await get(BASE+'DeckList.json.gz');assert(Array.isArray(index.data)&&index.data.length>1000,'Invalid or collapsed product index');
 const rows=index.data.filter(d=>TYPES.has(d.type));assert(rows.length>=150,'Commander index is unexpectedly small');
 const ids=new Set();for(const r of rows){assert(/^[a-zA-Z0-9_-]+$/.test(r.fileName),'Unsafe source filename');const id=stableId(r);assert(!ids.has(id),'Duplicate deck identity');ids.add(id);}
 const details=[],incomplete=[];let cursor=0;
 await Promise.all(Array.from({length:6},async()=>{while(cursor<rows.length){const row=rows[cursor++];const payload=await get(BASE+'decks/'+row.fileName+'.json.gz');assert(payload.meta?.date===index.meta?.date,'Source snapshot changed during refresh; retry next run');try{details.push(normalize(row,payload,now));}catch(e){incomplete.push({id:stableId(row),name:row.name,reason:e.message});}}}));
 details.sort((a,b)=>(b.releaseDate||'').localeCompare(a.releaseDate||'')||a.name.localeCompare(b.name));
 const generatedAt=now.toISOString(),decks=details.map(detail=>{const {cards,...d}=detail;return {...d,sha256:hash(JSON.stringify(detail))};});
 const catalog={schemaVersion:1,generatedAt,source,sourceVersion:index.meta?.version,sourceDate:index.meta?.date,coverage:{scope:'Commander preconstructed decks indexed by MTGJSON',status:incomplete.length?'partial':'source-complete',description:'Complete 100-card Commander decklists in the MTGJSON index; not an independently exhaustive list of every product.',listedDecks:rows.length,includedDecks:decks.length,excludedProducts:index.data.length-rows.length,incompleteDecks:incomplete,notes:['Only Commander Deck and MTGO Commander Deck categories. Other products are excluded.','Upcoming decks are labelled by UTC release date. Alternate display commanders are not assigned to the command zone.']},decks};
 const old=path.join(output,'catalog.json');validatePrevious(fs.existsSync(old)?JSON.parse(fs.readFileSync(old,'utf8')):null,catalog);
 assert(details.length>=150,'Too few validated Commander decks');publish(output,catalog,details);return catalog;
}
if(require.main===module)refresh().then(c=>console.log(`Precons: ${c.decks.length}/${c.coverage.listedDecks} validated; ${c.coverage.incompleteDecks.length} incomplete; source ${c.sourceDate}`)).catch(e=>{console.error('Precon refresh failed; previous snapshot preserved:',e.message);process.exitCode=1;});
module.exports={normalize,stableId,validatePrevious,publish,refresh};
