import {emptyLands,compactCard} from './model';
import {validateCommandZone,commanderCopyLimit,bulkDeckRules} from './bulkDeckDiscovery';

const {normalized,identityOf}=bulkDeckRules;
export const preconCardKey=card=>normalized(card?.name);
export const preconCount=deck=>(deck.commanders||[]).length+(deck.cards||[]).reduce((n,c)=>n+c.quantity,0)+Object.values(deck.basicLands||{}).reduce((a,b)=>a+b,0);
export function bulkCopies(bulk,card){return (bulk||[]).filter(row=>(card.oracleId&&row.oracleId===card.oracleId)||preconCardKey(row)===preconCardKey(card)).reduce((n,row)=>n+Math.max(0,Math.floor(Number(row.quantity)||0)),0);}
export function validatePreconManifest(manifest){
 if(!manifest||!manifest.id||!manifest.name||!Array.isArray(manifest.cards)||!manifest.cards.length||manifest.cards.length>1000)throw Error('This precon list is missing or malformed.');
 if(manifest.validation?.complete!==true)throw Error('The source has not verified a complete stock list yet.');
 for(const row of manifest.cards)if(!row.name||!Number.isInteger(row.quantity)||row.quantity<1||row.quantity>999||!['main','commander','sideboard'].includes(row.role))throw Error('The stock list contains an invalid card quantity or zone.');
 const count=manifest.cards.filter(row=>row.role!=='sideboard').reduce((n,row)=>n+row.quantity,0);
 if(count!==manifest.cardCount||count!==manifest.validation.cardCount)throw Error('The stock list count does not match its catalog record.');
 return count;
}
export function materializePrecon(manifest,resolved){
 validatePreconManifest(manifest);
 const byName=new Map(resolved.filter(Boolean).map(card=>[preconCardKey(card),card])),byId=new Map(resolved.filter(Boolean).map(card=>[card.oracleId,card]));
 const missing=[];const rows=manifest.cards.map(row=>{const card=byId.get(row.oracleId)||byName.get(preconCardKey(row));if(!card||card.metadataComplete===false||!card.typeLine||!Array.isArray(card.colorIdentity))missing.push(row.name);return {...compactCard(card||row),name:card?.name||row.name,sourceName:row.name,quantity:row.quantity,preconRole:row.role};});
 if(missing.length)throw Error('The local card library cannot verify '+missing.slice(0,5).join(', ')+(missing.length>5?` and ${missing.length-5} more cards`:'')+'. The stock source remains available below. Try again after the card catalog refreshes.');
 const commanders=rows.filter(row=>row.preconRole==='commander').flatMap(card=>Array.from({length:card.quantity},()=>({...card,quantity:1}))),zone=validateCommandZone(commanders);
 commanders.forEach((card,index)=>{card.role=zone.roles?.[index]==='companion'?'doctor_companion':zone.roles?.[index]||(!index?'primary':'partner');});
 const basicLands=emptyLands(),cards=[];
 for(const row of rows.filter(row=>row.preconRole==='main')){
  if(Object.hasOwn(basicLands,row.name)&&/^Basic Land\b/i.test(row.typeLine))basicLands[row.name]+=row.quantity;
  else{const existing=cards.find(card=>preconCardKey(card)===preconCardKey(row));if(existing)existing.quantity+=row.quantity;else cards.push(row);}
 }
 return {name:manifest.name,format:String(manifest.format).toLowerCase()==='commander'?'Commander':manifest.format,commander:commanders.map(card=>card.name).join(' + '),commanderCard:commanders.find(card=>card.role==='primary')||commanders[0]||null,commanders,cards,basicLands,sideboard:rows.filter(row=>row.preconRole==='sideboard'),playstyle:'balanced'};
}
export function validatePreconDeck(deck){
 if(String(deck.format).toLowerCase()!=='commander')return {ok:false,reason:'This format can be browsed here. Saving and upgrades currently support Commander only; no Commander rules are applied to this list.'};
 const zone=validateCommandZone(deck.commanders);if(!zone.ok)return zone;
 if(preconCount(deck)!==100)return {ok:false,reason:`The stock list contains ${preconCount(deck)} cards, not 100. Saving is paused until its source is corrected.`};
 const all=[...deck.commanders,...deck.cards],counts=new Map();
 for(const card of all){
  if(card.legalities?.commander!=='legal')return {ok:false,reason:`${card.name} is not verified Commander legal in the local snapshot. The original stock list is still available to browse.`};
  if(!identityOf(card).every(color=>zone.identity.includes(color)))return {ok:false,reason:`${card.name} falls outside the saved command zone's color identity.`};
  const key=preconCardKey(card),count=(counts.get(key)||0)+card.quantity;counts.set(key,count);
  if(!Number.isInteger(card.quantity)||card.quantity<1||count>commanderCopyLimit(card))return {ok:false,reason:`${card.name} exceeds its Commander copy limit or has an invalid quantity.`};
 }
 const colors={Plains:'W',Island:'U',Swamp:'B',Mountain:'R',Forest:'G'};
 for(const [name,count] of Object.entries(deck.basicLands||{}))if(!Number.isInteger(count)||count<0||count>0&&colors[name]&&!zone.identity.includes(colors[name]))return {ok:false,reason:'The basic-land quantities or colors do not match this command zone.'};
 return {ok:true,identity:zone.identity};
}
export function applyPreconSwap(deck,item){
 if(item?.swap?.mode!=='swap'||!item.swap.cut?.name||!item.card)throw Error('Only a fully evaluated one-for-one swap can be staged.');
 const key=preconCardKey(item.swap.cut),index=deck.cards.findIndex(card=>preconCardKey(card)===key);if(index<0)throw Error('That cut is no longer in the preview. Recalculate recommendations.');
 if([...deck.cards,...deck.commanders].some(card=>preconCardKey(card)===preconCardKey(item.card)))throw Error('That addition is already in the preview.');
 const cards=deck.cards.flatMap((card,i)=>i!==index?[card]:card.quantity>1?[{...card,quantity:card.quantity-1}]:[]);
 const next={...deck,cards:[...cards,{...compactCard(item.card),quantity:1}]},validation=validatePreconDeck(next);if(!validation.ok)throw Error(validation.reason);return next;
}
export function preconFingerprint(deck){return JSON.stringify([...deck.commanders.map(card=>['commander',preconCardKey(card),1]),...deck.cards.map(card=>['main',preconCardKey(card),card.quantity]),...Object.entries(deck.basicLands).filter(([,count])=>count).map(([name,count])=>['main',normalized(name),count])].sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))));}
export function matchesStockManifest(manifest,deck){
 const key=(role,name)=>role+':'+normalized(name),expected=new Map(),actual=new Map();
 const add=(map,k,n)=>map.set(k,(map.get(k)||0)+n);
 for(const row of manifest.cards)add(expected,key(row.role,row.name),row.quantity);
 for(const [role,cards] of [['commander',deck.commanders],['main',deck.cards],['sideboard',deck.sideboard||[]]])for(const card of cards)add(actual,key(role,card.sourceName||card.name),card.quantity);
 for(const [name,count] of Object.entries(deck.basicLands||{}))if(count)add(actual,key('main',name),count);
 return expected.size===actual.size&&[...expected].every(([k,n])=>actual.get(k)===n);
}
export function createPreconDeck(state,manifest,deck,{deckId,operationId,swaps=[],allowHistoricalStock=false,now=new Date().toISOString()}){
 if(state.decks.some(item=>item.creationOperationId===operationId))return state;
 validatePreconManifest(manifest);const validation=validatePreconDeck(deck);if(!validation.ok&&!(allowHistoricalStock&&swaps.length===0&&String(deck.format).toLowerCase()==='commander'&&preconCount(deck)===100&&matchesStockManifest(manifest,deck)))throw Error(validation.reason);
 const fingerprint=preconFingerprint(deck);
 if(state.decks.some(item=>item.status!=='deleted'&&item.preconSource?.id===manifest.id&&preconFingerprint(item)===fingerprint))throw Error('This exact precon plan is already in My Decks. Open that deck instead.');
 const saved={...deck,id:deckId,status:'active',isDraft:true,createdAt:now,updatedAt:now,creationOperationId:operationId,notes:`${swaps.length?'Upgraded':'Stock'} precon plan. No cards were purchased or removed from bulk. Review ownership before treating this as a physical deck.`,preconLegality:{ok:validation.ok,reason:validation.reason||'',checkedAt:now},preconSource:{id:manifest.id,name:manifest.name,url:manifest.sourceUrl,releaseDate:manifest.releaseDate,fingerprint,variant:swaps.length?'upgraded':'stock',swaps}};
 return {...state,decks:[...state.decks,saved]};
}
