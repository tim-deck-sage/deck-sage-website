const API_ROOT='https://api.scryfall.com';
export const CARD_VALUE_CACHE_KEY='deck-sage-card-value-v2';
export const CARD_VALUE_CACHE_TTL_MS=30*60*1000;
export const SCRYFALL_BATCH_SIZE=75;
export const SCRYFALL_REQUEST_SPACING_MS=120;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const jobs=new Map();

const positive=value=>Math.max(1,Math.min(9999,Math.floor(Number(value)||1)));
const normalizedName=value=>String(value||'').normalize('NFKD').replace(/[^\x00-\x7F]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const variantOf=card=>['Normal','Foil','Full Art'].includes(card?.cardVariant)?card.cardVariant:'Normal';
const printingId=card=>{
 const candidate=card?.scryfallId||card?.scryfall_id||card?.id;
 return UUID.test(String(candidate||''))?String(candidate).toLowerCase():'';
};
const lookupFor=card=>printingId(card)?{kind:'id',value:printingId(card),key:'id:'+printingId(card)}:{kind:'name',value:String(card?.name||'').trim(),key:'name:'+normalizedName(card?.name)};
const cloneCard=card=>({...card,raw:undefined});

export function collectionValueEntries(state){
 const entries=[];
 const add=(card,quantity,location)=>{if(!card?.name)return;const lookup=lookupFor(card);entries.push({stackId:`${location.type}:${location.deckId||'bulk'}:${entries.length}`,card:cloneCard(card),name:card.name,variant:variantOf(card),quantity:positive(quantity),lookup,...location});};
 for(const card of state?.bulk||[])add(card,card.quantity,{type:'bulk',label:'Bulk'});
 for(const deck of state?.decks||[]){
  if(deck?.status==='deleted'||deck?.isDraft)continue;
  const location={type:'deck',deckId:deck.id,deckName:deck.name||'Untitled deck',label:deck.name||'Untitled deck',deckStatus:deck.status||'active'};
  const commanders=Array.isArray(deck.commanders)&&deck.commanders.length?deck.commanders:(deck.commanderCard?[deck.commanderCard]:[]);
  for(const commander of commanders)add(commander,1,location);
  for(const card of deck.cards||[])add(card,card.quantity,location);
 }
 return entries;
}

export function collectionValueFingerprint(state){
 const source=collectionValueEntries(state).map(entry=>[entry.lookup.key,entry.variant,entry.quantity,entry.type,entry.deckId||'',entry.deckName||''].join('|')).sort().join('\n');
 let hash=2166136261;for(let index=0;index<source.length;index++){hash^=source.charCodeAt(index);hash=Math.imul(hash,16777619);}
 return `v2-${(hash>>>0).toString(16).padStart(8,'0')}-${source.length}`;
}

function slimCard(card){
 return {id:card.id,name:card.name,oracle_id:card.oracle_id,tcgplayer_id:card.tcgplayer_id??null,purchase_uris:card.purchase_uris??null,prices:card.prices||{},image_uris:card.image_uris||null,card_faces:card.card_faces?.map(face=>({image_uris:face.image_uris||null}))||null,full_art:Boolean(card.full_art),border_color:card.border_color||'',frame_effects:card.frame_effects||[],promo_types:card.promo_types||[],finishes:card.finishes||[],set:card.set||'',collector_number:card.collector_number||'',released_at:card.released_at||''};
}

const responseDelay=response=>{
 const seconds=Number(response?.headers?.get?.('retry-after'));
 return Number.isFinite(seconds)&&seconds>0?seconds*1000:0;
};
async function requestJson(url,options,{fetchImpl,wait,attempts=3}){
 let lastError;
 for(let attempt=0;attempt<attempts;attempt++){
  try{
   const response=await fetchImpl(url,options);
   if(response.ok)return response.json();
   const message=response.status===429?'Scryfall is busy.':response.status===404?'A saved printing was not found.':`Scryfall returned ${response.status}.`;
   if(response.status!==429&&response.status<500)throw Object.assign(Error(message),{nonRetryable:true});
   lastError=Error(message);await wait(responseDelay(response)||400*(attempt+1));
  }catch(error){lastError=error;if(error?.nonRetryable)throw error;if(attempt<attempts-1)await wait(400*(attempt+1));}
 }
 throw lastError||Error('Current prices could not be retrieved.');
}

async function fetchCollections(lookups,{fetchImpl,wait,onProgress}){
 const cards=new Map(),unique=Array.from(new Map(lookups.map(lookup=>[lookup.key,lookup])).values());
 for(let offset=0;offset<unique.length;offset+=SCRYFALL_BATCH_SIZE){
  if(offset)await wait(SCRYFALL_REQUEST_SPACING_MS);
  const batch=unique.slice(offset,offset+SCRYFALL_BATCH_SIZE),identifiers=batch.map(lookup=>({[lookup.kind]:lookup.value}));
  const body=await requestJson(`${API_ROOT}/cards/collection`,{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json'},body:JSON.stringify({identifiers})},{fetchImpl,wait});
  const byId=new Map((body.data||[]).map(card=>[String(card.id||'').toLowerCase(),card]));
  const byName=new Map((body.data||[]).map(card=>[normalizedName(card.name),card]));
  for(const lookup of batch){const card=lookup.kind==='id'?byId.get(lookup.value):byName.get(normalizedName(lookup.value));if(card)cards.set(lookup.key,slimCard(card));}
  onProgress?.({completed:Math.min(offset+batch.length,unique.length),total:unique.length});
 }
 return cards;
}

function premiumScore(card){
 const effects=new Set(card.frame_effects||[]);
 let score=0;
 // Scryfall's legendary frame effect only describes the crown frame. It is
 // not an alternate-art treatment, nor are generic showcase/promo markers.
 if(card.full_art===true)score+=100;
 if(card.border_color==='borderless')score+=90;
 if(effects.has('extendedart'))score+=80;
 return score;
}
function hasNonfoilUsd(card){
 const raw=card?.prices?.usd;if(raw===null||raw===undefined||raw==='')return false;
 const value=Number(raw);return Number.isFinite(value)&&value>=0;
}
function choosePremium(cards){return cards.filter(card=>hasNonfoilUsd(card)&&premiumScore(card)>0).sort((a,b)=>premiumScore(b)-premiumScore(a)||String(b.released_at||'').localeCompare(String(a.released_at||'')))[0]||null;}
async function fetchPremium(baseCard,name,options){
 if(baseCard&&choosePremium([baseCard]))return baseCard;
 const escaped=String(name||'').replace(/["\\]/g,'\\$&');
 const query=baseCard?.oracle_id?`oracleid:${baseCard.oracle_id} game:paper include:extras`:`!"${escaped}" game:paper include:extras`;
 let next=`${API_ROOT}/cards/search?q=${encodeURIComponent(query)}&unique=prints&order=released&dir=desc`,pages=0,found=[];
 while(next&&pages<10){if(pages)await options.wait(SCRYFALL_REQUEST_SPACING_MS);const body=await requestJson(next,{headers:{Accept:'application/json'}},options);found.push(...(body.data||[]));next=body.has_more?body.next_page:'';pages++;}
 const chosen=choosePremium(found);return chosen?slimCard(chosen):null;
}

function unitPrice(entry,base,premium){
 const source=entry.variant==='Full Art'?premium:base;
 const raw=entry.variant==='Foil'?source?.prices?.usd_foil:source?.prices?.usd;
 if(raw===null||raw===undefined||raw==='')return null;const value=Number(raw);return Number.isFinite(value)&&value>=0?value:null;
}

export async function scanCollectionValue(state,{fetchImpl=globalThis.fetch?.bind(globalThis),wait=milliseconds=>new Promise(resolve=>setTimeout(resolve,milliseconds)),now=()=>Date.now(),onProgress}={}){
 if(!fetchImpl)throw Error('This browser cannot retrieve current prices.');
 const entries=collectionValueEntries(state),fingerprint=collectionValueFingerprint(state),cards=await fetchCollections(entries.map(entry=>entry.lookup),{fetchImpl,wait,onProgress});
 const premium=new Map(),premiumEntries=Array.from(new Map(entries.filter(entry=>entry.variant==='Full Art').map(entry=>[entry.lookup.key,entry])).values());
 for(let index=0;index<premiumEntries.length;index++){
  if(index||entries.length)await wait(SCRYFALL_REQUEST_SPACING_MS);
  const entry=premiumEntries[index],chosen=await fetchPremium(cards.get(entry.lookup.key),entry.name,{fetchImpl,wait});if(chosen)premium.set(entry.lookup.key,chosen);
 }
 const items=entries.map(entry=>{const base=cards.get(entry.lookup.key)||null,chosen=premium.get(entry.lookup.key)||null,isFullArt=entry.variant==='Full Art',pricingCard=isFullArt?chosen:base,unit=unitPrice(entry,base,chosen),replacement=isFullArt&&Boolean(chosen)&&chosen.id!==base?.id,approximate=unit!==null&&(entry.lookup.kind==='name'||replacement);return {...entry,providerCard:isFullArt?(chosen||base):base,unitPrice:unit,totalValue:unit===null?null:unit*entry.quantity,approximate,priceMatch:unit===null?'unavailable':approximate?'approximate':'exact',pricePrintingId:pricingCard?.id||'',priceStatus:unit===null?'missing':'priced'};});
 const fetchedAt=new Date(now()).toISOString();
 return {schema:2,fingerprint,fetchedAt,provider:'Scryfall',currency:'USD',basis:'daily market estimate',items};
}

export async function lookupCurrentCardValue(name,{fetchImpl=globalThis.fetch?.bind(globalThis),wait=milliseconds=>new Promise(resolve=>setTimeout(resolve,milliseconds)),now=()=>Date.now()}={}){
 const query=String(name||'').trim();if(query.length<2)throw Error('Enter at least two characters of a card name.');if(query.length>200)throw Error('Card names must be 200 characters or fewer.');if(!fetchImpl)throw Error('This browser cannot retrieve current prices.');
 let response;try{response=await requestJson(`${API_ROOT}/cards/named?fuzzy=${encodeURIComponent(query)}`,{headers:{Accept:'application/json'}},{fetchImpl,wait});}catch(error){if(error?.nonRetryable&&/not found/i.test(error.message))throw Error('No Scryfall card matched that name.');throw error;}
 const card=slimCard(response);
 const price=key=>{const raw=card.prices?.[key];if(raw===null||raw===undefined||raw==='')return null;const value=Number(raw);return Number.isFinite(value)&&value>=0?value:null;};
 return {card,name:card.name,normal:price('usd'),foil:price('usd_foil'),etched:price('usd_etched'),fetchedAt:new Date(now()).toISOString(),provider:'Scryfall',currency:'USD',basis:'daily market estimate'};
}

export function startCollectionValueScan(state,options={}){
 const fingerprint=collectionValueFingerprint(state);if(jobs.has(fingerprint))return jobs.get(fingerprint);
 const job=scanCollectionValue(state,options).finally(()=>jobs.delete(fingerprint));jobs.set(fingerprint,job);return job;
}

export function loadCollectionValueCache(storage,fingerprint){
 try{const value=JSON.parse(storage?.getItem(CARD_VALUE_CACHE_KEY)||'null');return value?.schema===2&&value.fingerprint===fingerprint&&Array.isArray(value.items)?value:null;}catch{return null;}
}
export function saveCollectionValueCache(storage,snapshot){try{storage?.setItem(CARD_VALUE_CACHE_KEY,JSON.stringify(snapshot));return true;}catch{return false;}}
export function collectionValueCacheState(snapshot,at=Date.now()){if(!snapshot?.fetchedAt)return 'missing';return at-Date.parse(snapshot.fetchedAt)<=CARD_VALUE_CACHE_TTL_MS?'fresh':'stale';}
