'use strict';
const normalized=value=>String(value||'').normalize('NFKD').replace(/[^\x00-\x7F]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const compare=(a,b)=>a<b?-1:a>b?1:0;
const shardPromises=new Map();let manifestPromise,indexPromise;
const settledShards=new Set();
let activeLoads=0;const loadQueue=[];
async function boundedLoad(action){if(activeLoads>=4)await new Promise(resolve=>loadQueue.push(resolve));activeLoads++;try{return await action();}finally{activeLoads--;loadQueue.shift()?.();}}
async function fetchJson(url){const response=await fetch(url,{cache:'no-cache'});if(!response.ok)throw Error('Card library file could not load. Check your connection and try again.');return response.json();}
function manifest(){if(!manifestPromise)manifestPromise=fetchJson('/card-data/manifest.json').catch(e=>{manifestPromise=null;throw e});return manifestPromise;}
async function gzipFile(name){
 if(typeof DecompressionStream==='undefined')throw Error('This preview needs a current browser with compressed-data support. Please update your browser.');
 const meta=await manifest(),file=meta.files[name];if(!file)throw Error('Card library file is not in the verified snapshot.');
 const response=await fetch('/card-data/'+name).catch(()=>{throw Error('Card library file could not load. Check your connection and try again.');});if(!response.ok)throw Error('Card library file could not load. Check your connection and try again.');
 const bytes=await response.arrayBuffer();const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
 if(digest!==file.sha256)throw Error('Card library snapshot changed or is incomplete. Refresh the page and try again.');
 try{return JSON.parse(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text());}catch{throw Error('Card library file is damaged. Refresh this page and try again.');}
}
function index(){if(!indexPromise)indexPromise=gzipFile('search-index.json.gz').then(data=>{const cards=data.cards.map(row=>Object.fromEntries(data.fields.map((field,i)=>[field,row[i]])));const byId=new Map(cards.map(card=>[card.oracle_id,card])),aliases=new Map();for(const [name,id,confidence] of data.aliases){if(!aliases.has(name))aliases.set(name,[]);aliases.get(name).push({id,confidence});}return {cards,byId,aliases};}).catch(e=>{indexPromise=null;throw e});return indexPromise;}
function touchShard(key){settledShards.delete(key);settledShards.add(key);while(settledShards.size>24){const oldest=settledShards.values().next().value;settledShards.delete(oldest);shardPromises.delete(oldest);}}
function shard(id){const key=String(id).slice(0,2);if(settledShards.has(key))touchShard(key);if(!shardPromises.has(key))shardPromises.set(key,boundedLoad(()=>gzipFile('cards-'+key+'.json.gz')).then(value=>{touchShard(key);return value}).catch(e=>{shardPromises.delete(key);settledShards.delete(key);throw e}));return shardPromises.get(key);}
async function card(id){return (await shard(id))[id]||null;}
async function resolve(name){const data=await index(),key=normalized(name);if(!key)return null;const exact=data.cards.filter(c=>c.normalized_name===key).sort((a,b)=>compare(b.source,a.source));if(exact.length)return card(exact[0].oracle_id);const candidates=(data.aliases.get(key)||[]).map(a=>({...data.byId.get(a.id),confidence:a.confidence}));const special=c=>['art_series','token','double_faced_token','emblem'].includes(c.layout)?1:0;candidates.sort((a,b)=>special(a)-special(b)||((a.source==='scryfall-oracle-bulk'?0:1)-(b.source==='scryfall-oracle-bulk'?0:1))||b.confidence-a.confidence||compare(a.name,b.name));return candidates.length?card(candidates[0].oracle_id):null;}
const roleTerms={ramp:['add {','add one mana','search your library for a basic land','treasure token'],draw:['draw a card','draw two cards','draw three cards','draw cards','draw X cards'],removal:['destroy target','exile target','counter target','return target'],protection:['hexproof','indestructible','protection from','phase out'],tokens:['create','token'],recursion:['return','graveyard']};
async function search(params){
 const data=await index(),query=String(params.q||'').trim().slice(0,180),norm=normalized(query),limit=Math.max(1,Math.min(Number(params.limit)||24,100)),offset=Math.max(0,Math.min(Number(params.offset)||0,50000));
 if(query&&!norm)return {cards:[],total:0,limit,offset};
 const aliasIds=new Set();if(query&&params.mode!=='text')for(const [name,aliases] of data.aliases)if(name.startsWith(norm))for(const a of aliases)aliasIds.add(a.id);
 const terms=norm.split(' ').slice(0,16),chosen=new Set(String(params.colors||'').split('').filter(c=>'WUBRG'.includes(c)));
 let found=data.cards.filter(c=>{
  if(query){if(params.mode==='text'){const words=normalized(c.name+' '+c.type_line+' '+c.oracle_text).split(' ');if(!terms.every(term=>words.some(word=>word.startsWith(term))))return false;}else if(!c.normalized_name.startsWith(norm)&&!aliasIds.has(c.oracle_id)&&!c.name.toLowerCase().includes(query.toLowerCase()))return false;}
  if(params.type&&!c.type_line.toLowerCase().includes(params.type.toLowerCase()))return false;
  if(params.colors!==undefined&&String(params.colors)!==''&&[...c.color_identity].some(color=>!chosen.has(color)))return false;
  if(params.commander==='true'&&(!c.commander_legal||!(/Legendary.*Creature/i.test(c.type_line)||/can be your commander/i.test(c.oracle_text))))return false;
  if(params.commander!=='true'&&params.legal==='true'&&!c.commander_legal)return false;
  if(params.rarity&&c.rarity!==params.rarity)return false;
  if(params.cmc!==undefined&&params.cmc!==''&&c.cmc>Number(params.cmc))return false;
  if(roleTerms[params.role]&&!roleTerms[params.role].some(term=>c.oracle_text.toLowerCase().includes(term.toLowerCase())))return false;
  return true;
 });
 const rank=c=>c.normalized_name===norm?0:c.normalized_name.startsWith(norm)?1:2;
 found.sort((a,b)=>(query&&params.mode!=='text'?rank(a)-rank(b):0)||compare(a.normalized_name,b.normalized_name)||compare(a.oracle_id,b.oracle_id));
 const cards=await Promise.all(found.slice(offset,offset+limit).map(c=>card(c.oracle_id)));return {cards,total:found.length,limit,offset};
}
async function dispatch(path,params,body){
 if(path==='/api/status')return (await manifest()).status;
 if(path==='/api/cards')return search(params);
 if(path==='/api/card')return {card:params.name?await resolve(params.name):await card(params.id)};
 if(path==='/api/resolve')return {cards:await Promise.all((body?.names||[]).map(resolve))};
 if(path==='/api/retrieve'){const result=await search({...params,limit:Math.min(Number(params.limit)||8,20)});return {schema:'deck-sage-context-v1',query:params.q||'',totalMatches:result.total,cards:result.cards.map(c=>Object.fromEntries(['oracleId','name','manaCost','cmc','typeLine','oracleText','colorIdentity','keywords','power','toughness','legalities','dataSource','dataNote','metadataComplete'].map(k=>[k,c[k]]))),sourceUpdatedAt:(await manifest()).status.bulkUpdatedAt};}
 throw Error('Unsupported card request.');
}
self.onmessage=async({data})=>{try{self.postMessage({id:data.id,result:await dispatch(data.path,data.params||{},data.body)});}catch(error){self.postMessage({id:data.id,error:error.message||'Card library request failed.'});}};
