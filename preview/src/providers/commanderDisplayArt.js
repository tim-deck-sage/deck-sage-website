const SCRYFALL_SEARCH_URL='https://api.scryfall.com/cards/search';
export const SCRYFALL_REQUEST_SPACING_MS=125;

const normalized=value=>String(value||'').trim().toLowerCase();
const cardIdentity=card=>normalized(card?.oracleId||card?.oracle_id||card?.name||card?.id);
const exactNameQuery=name=>`!"${String(name||'').replaceAll('\\','\\\\').replaceAll('"','\\"')}"`;
const completeImage=uris=>uris?.large||uris?.normal||uris?.png||uris?.small||'';

export function commanderFallbackImage(card){
 return card?.premiumImageUrl||card?.imageUrl||card?.imageLarge||'';
}

export function commanderPrintingImage(print,commanderName=''){
 const direct=completeImage(print?.image_uris);
 if(direct)return direct;
 const faces=Array.isArray(print?.card_faces)?print.card_faces:[];
 const requested=normalized(String(commanderName||'').split(' // ')[0]);
 const face=faces.find(item=>normalized(item?.name)===requested)||faces.find(item=>requested&&requested.startsWith(normalized(item?.name)))||faces.find(item=>completeImage(item?.image_uris));
 return completeImage(face?.image_uris);
}

function treatment(print){
 if(print?.full_art===true)return 'full_art';
 return Array.isArray(print?.frame_effects)&&print.frame_effects.includes('extendedart')?'extendedart':'';
}

function score(print){
 const kind=treatment(print),paper=Array.isArray(print?.games)&&print.games.includes('paper'),highres=print?.highres_image===true||print?.image_status==='highres_scan';
 return (kind==='full_art'?2000:kind==='extendedart'?1000:0)+(paper?100:0)+(highres?10:0)+(Date.parse(print?.released_at||'')||0)/1e15;
}

export function selectPreferredCommanderPrinting(printings,identity,commanderName){
 const wanted=normalized(identity),eligible=(Array.isArray(printings)?printings:[]).filter(print=>(!wanted||normalized(print?.oracle_id)===wanted)&&treatment(print)&&commanderPrintingImage(print,commanderName));
 eligible.sort((a,b)=>score(b)-score(a));
 const printing=eligible[0];
 if(!printing)return null;
 return {imageUrl:commanderPrintingImage(printing,commanderName),printingId:printing.id||'',oracleId:printing.oracle_id||'',treatment:treatment(printing)};
}

export function createCommanderArtLookup({fetchImpl=globalThis.fetch,spacingMs=SCRYFALL_REQUEST_SPACING_MS,now=()=>Date.now(),wait=milliseconds=>new Promise(resolve=>setTimeout(resolve,milliseconds)),timeoutMs=8000}={}){
 const cache=new Map();let queue=Promise.resolve(),nextRequestAt=0;
 const request=url=>{const run=queue.then(async()=>{const pause=Math.max(0,nextRequestAt-now());if(pause)await wait(pause);nextRequestAt=now()+spacingMs;const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);try{return await fetchImpl(url,{headers:{Accept:'application/json'},signal:controller.signal});}finally{clearTimeout(timer);}});queue=run.catch(()=>{});return run;};
 async function find(card){
  const identity=cardIdentity(card),name=String(card?.name||'').trim();
  if(!identity||!name||typeof fetchImpl!=='function')return null;
  const params=new URLSearchParams({q:exactNameQuery(name),unique:'prints',order:'released',dir:'desc',include_variations:'true'});let url=`${SCRYFALL_SEARCH_URL}?${params}`,printings=[],pages=0;
  while(url&&pages<8){const response=await request(url);if(!response.ok)throw Error(`Scryfall printing lookup failed (${response.status}).`);const page=await response.json();printings=printings.concat(Array.isArray(page?.data)?page.data:[]);url=page?.has_more&&page?.next_page?page.next_page:'';pages++;}
  return selectPreferredCommanderPrinting(printings,card.oracleId||card.oracle_id||'',name);
 }
 return card=>{const key=cardIdentity(card);if(!key)return Promise.resolve(null);if(!cache.has(key))cache.set(key,find(card).catch(()=>null));return cache.get(key);};
}

export const getPreferredCommanderArt=createCommanderArtLookup({fetchImpl:(...args)=>globalThis.fetch(...args)});
