const assert=require('node:assert/strict');
const esbuild=require('esbuild');
const built=esbuild.buildSync({stdin:{contents:"export * from './preview/src/providers/cardValuePricing';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',write:false});
const loaded={exports:{}};new Function('module','exports','require',built.outputFiles[0].text)(loaded,loaded.exports,require);
const {CARD_VALUE_CACHE_TTL_MS,SCRYFALL_BATCH_SIZE,collectionValueCacheState,collectionValueEntries,collectionValueFingerprint,loadCollectionValueCache,lookupCurrentCardValue,saveCollectionValueCache,scanCollectionValue}=loaded.exports;
let checks=0;const pass=name=>{checks++;console.log('PASS CARD VALUE '+name);};
const ids={normal:'11111111-1111-4111-8111-111111111111',foil:'22222222-2222-4222-8222-222222222222',premium:'33333333-3333-4333-8333-333333333333',commander:'44444444-4444-4444-8444-444444444444'};
const card=(id,name,prices,extra={})=>({id,name,oracle_id:'oracle-'+name,prices,image_uris:{normal:`https://cards.scryfall.io/${id}.jpg`},released_at:'2026-10-18',...extra});
const state={bulk:[
 {id:ids.normal,name:'Known Normal',quantity:2,cardVariant:'Normal'},
 {id:ids.foil,name:'Missing Foil',quantity:1,cardVariant:'Foil'},
 {id:'legacy-name',name:'Name Fallback',quantity:3,cardVariant:'Normal'},
 {id:ids.premium,name:'Premium Card',quantity:1,cardVariant:'Full Art'},
],decks:[
 {id:'deck-1',name:'Vault Deck',status:'active',commanders:[{id:ids.commander,name:'Lead One',role:'primary'},{id:'partner-name',name:'Lead Two',role:'partner'}],commanderCard:{id:ids.commander,name:'Lead One'},cards:[{id:ids.normal,name:'Known Normal',quantity:4,cardVariant:'Normal'}]},
 {id:'draft',name:'Planning Only',isDraft:true,cards:[{id:ids.normal,name:'Known Normal',quantity:99}],commanderCard:null},
 {id:'deleted',name:'Deleted',status:'deleted',cards:[{id:ids.normal,name:'Known Normal',quantity:99}],commanderCard:null},
]};
const records=new Map([
 [ids.normal,card(ids.normal,'Known Normal',{usd:'2.50',usd_foil:'9.00'})],
 [ids.foil,card(ids.foil,'Missing Foil',{usd:'1.00',usd_foil:null})],
 [ids.premium,card(ids.premium,'Premium Card',{usd:'4.00',usd_foil:null})],
 [ids.commander,card(ids.commander,'Lead One',{usd:'5.00',usd_foil:null})],
 ['name fallback',card('55555555-5555-4555-8555-555555555555','Name Fallback',{usd:'3.00',usd_foil:null})],
 ['lead two',card('66666666-6666-4666-8666-666666666666','Lead Two',{usd:'6.00',usd_foil:null})],
]);
const requests=[],waits=[];
const response=(body,status=200,headers={})=>({ok:status>=200&&status<300,status,headers:{get:name=>headers[name.toLowerCase()]||null},json:async()=>body});
async function fetchImpl(url,options={}){
 requests.push({url,options});
 if(url.includes('/cards/collection')){
  const identifiers=JSON.parse(options.body).identifiers,data=[];
  for(const identifier of identifiers){const found=records.get(identifier.id||String(identifier.name).toLowerCase());if(found)data.push(found);}
  return response({object:'list',data,not_found:[]});
 }
  if(url.includes('/cards/named'))return response(card('88888888-8888-4888-8888-888888888888','Outside Card',{usd:'8.00',usd_foil:null}));
 if(url.includes('/cards/search'))return response({data:[card('77777777-7777-4777-8777-777777777777','Premium Card',{usd:'17.25',usd_foil:null},{full_art:true})],has_more:false});
 throw Error('Unexpected URL '+url);
}

(async()=>{
 const entries=collectionValueEntries(state);
 assert.equal(entries.length,7);assert.equal(entries.filter(entry=>entry.name==='Lead One').length,1);assert.equal(entries.find(entry=>entry.name==='Known Normal'&&entry.type==='deck').quantity,4);
 pass('owned quantities, multiple commanders, active decks, and bulk are inventoried without draft/deleted cards or duplicate primaries');
 assert.match(collectionValueFingerprint(state),/^v1-[0-9a-f]{8}-/);assert.notEqual(collectionValueFingerprint(state),collectionValueFingerprint({...state,bulk:[...state.bulk,{name:'Change',quantity:1}]}));
 pass('cache fingerprint changes with the valued inventory');
 const snapshot=await scanCollectionValue(state,{fetchImpl,wait:async milliseconds=>waits.push(milliseconds),now:()=>Date.parse('2026-10-18T12:00:00Z')});
 assert.equal(snapshot.provider,'Scryfall');assert.equal(snapshot.currency,'USD');assert.equal(snapshot.basis,'daily market estimate');assert.equal(snapshot.fetchedAt,'2026-10-18T12:00:00.000Z');
 const normal=snapshot.items.filter(item=>item.name==='Known Normal');assert.deepEqual(normal.map(item=>item.totalValue).sort((a,b)=>a-b),[5,10]);
 assert.equal(snapshot.items.find(item=>item.name==='Missing Foil').unitPrice,null);assert.equal(snapshot.items.find(item=>item.name==='Missing Foil').totalValue,null);
 assert.equal(snapshot.items.find(item=>item.name==='Name Fallback').unitPrice,3);assert.equal(snapshot.items.find(item=>item.name==='Name Fallback').approximate,true);
 const premium=snapshot.items.find(item=>item.name==='Premium Card');assert.equal(premium.unitPrice,17.25);assert.equal(premium.pricePrintingId,'77777777-7777-4777-8777-777777777777');assert.equal(premium.approximate,true);
 pass('saved-printing normal, foil, name fallback, premium-printing, quantity, and unavailable-price semantics match the app without fabricated zeroes');
 const identifiers=JSON.parse(requests.find(request=>request.url.includes('/cards/collection')).options.body).identifiers;
 assert(identifiers.some(identifier=>identifier.id===ids.normal));assert(identifiers.some(identifier=>identifier.name==='Name Fallback'));assert(identifiers.length<=SCRYFALL_BATCH_SIZE);
 assert(requests.some(request=>request.url.includes('/cards/search')&&decodeURIComponent(request.url).includes('oracleid:oracle-Premium Card')));assert(waits.includes(120));
 pass('the Scryfall collection endpoint is batched at the documented limit and premium searches are deliberately spaced');
 const lookup=await lookupCurrentCardValue('Out Card',{fetchImpl,wait:async()=>{},now:()=>Date.parse('2026-10-18T13:00:00Z')});assert.equal(lookup.name,'Outside Card');assert.equal(lookup.normal,8);assert.equal(lookup.foil,null);assert.equal(lookup.fetchedAt,'2026-10-18T13:00:00.000Z');assert(requests.some(request=>request.url.includes('/cards/named?fuzzy=Out%20Card')));
 pass('standalone card search uses Scryfall fuzzy-name lookup and keeps normal and foil values separate');
 const store=new Map(),storage={getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,value)};assert(saveCollectionValueCache(storage,snapshot));assert.equal(JSON.stringify(loadCollectionValueCache(storage,snapshot.fingerprint)),JSON.stringify(snapshot));assert.equal(loadCollectionValueCache(storage,'different'),null);
 assert.equal(collectionValueCacheState(snapshot,Date.parse(snapshot.fetchedAt)+CARD_VALUE_CACHE_TTL_MS),'fresh');assert.equal(collectionValueCacheState(snapshot,Date.parse(snapshot.fetchedAt)+CARD_VALUE_CACHE_TTL_MS+1),'stale');
 pass('matching cache snapshots remain fresh for 30 minutes and become explicitly stale afterward');
 let calls=0;const retried=await scanCollectionValue({bulk:[{id:ids.normal,name:'Known Normal',quantity:1,cardVariant:'Normal'}],decks:[]},{wait:async milliseconds=>waits.push(milliseconds),fetchImpl:async()=>{calls++;return calls===1?response({},429,{'retry-after':'1'}):response({data:[records.get(ids.normal)],not_found:[]});}});
 assert.equal(calls,2);assert.equal(retried.items[0].unitPrice,2.5);assert(waits.includes(1000));
 pass('temporary provider throttling honors Retry-After and recovers without changing the value');
 console.log(`PASS CARD VALUE ${checks} checks`);
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
