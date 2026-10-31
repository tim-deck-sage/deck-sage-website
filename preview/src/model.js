import {normalizeAvatarNumber} from './avatars';
export const STORAGE_KEY='deck-sage-web-v1';
export const LAND_NAMES=['Plains','Island','Swamp','Mountain','Forest','Wastes'];
export const DECK_PLAYSTYLES=[
 {id:'balanced',label:'Balanced',title:'Let Sage Decide',description:'Follow the strongest demonstrated plan and repair the clearest gaps.'},
 {id:'aggressive',label:'Aggressive',title:'Take the Fight to Them',description:'Emphasize supported early pressure, haste, evasion, and closing power.'},
 {id:'patient',label:'Patient',title:'Control the Battlefield',description:'Emphasize efficient answers, resilient resources, protection, and recovery.'},
 {id:'unpredictable',label:'Unpredictable',title:'Surprise the Table',description:'Emphasize verified instant-speed, flexible, and feasible surprise lines.'}
];
export const normalizeDeckPlaystyle=value=>DECK_PLAYSTYLES.some(style=>style.id===value)?value:'balanced';
export const emptyLands=()=>Object.fromEntries(LAND_NAMES.map(n=>[n,0]));
export const uid=()=>crypto.randomUUID();
export const positive=n=>Math.max(1,Math.min(9999,Math.floor(Number(n)||1)));
export const visibleDecks=state=>(state?.decks||[]).filter(deck=>deck.status!=='deleted');
export const countDeck=d=>(Array.isArray(d.commanders)&&d.commanders.length?d.commanders.filter(card=>card.role!=='companion').length:d.commanderCard?1:0)+d.cards.reduce((n,c)=>n+positive(c.quantity),0)+Object.values(d.basicLands).reduce((a,b)=>a+b,0);
export const expandCards=d=>d.cards.flatMap(c=>Array.from({length:Math.min(positive(c.quantity),200)},()=>c));
export function baseState(){return {version:1,profile:{name:'Planeswalker',username:'',avatar:1,role:'Player',bio:''},decks:[],retainedDeckRecords:[],bulk:[],favorites:[],contacts:[],stores:[],notifications:[],settings:{theme:'forest',motion:true,images:true,notificationInbox:true}};}
export function compactCard(card){const {raw,...rest}=card;return {...rest,tcgplayerId:card.tcgplayerId??raw?.tcgplayer_id??null,tcgplayerUrl:card.tcgplayerUrl??raw?.purchase_uris?.tcgplayer??null};}
export function addInventory(inventory,card,quantity=1,variant='Normal'){
 const key=card.oracleId||card.id||card.name;
 const index=inventory.findIndex(c=>(c.oracleId||c.id||c.name)===key&&(c.cardVariant||'Normal')===variant);
 if(index>=0)return inventory.map((c,i)=>i===index?{...c,quantity:positive(positive(c.quantity)+positive(quantity))}:c);
 return [...inventory,{...compactCard(card),quantity:positive(quantity),cardVariant:variant}];
}
export function transferBulk(state,index,deckId,quantity){
 const owned=state.bulk[index];const deck=visibleDecks(state).find(d=>d.id===deckId);
 if(!owned||!deck)throw Error('Choose a valid card and deck.');
 if(deck.isDraft)throw Error('Candidate drafts contain planned cards. Move copies into an inventory deck instead.');
 const amount=positive(quantity);if(amount>positive(owned.quantity))throw Error('You do not own that many copies in bulk.');
 const remaining=positive(owned.quantity)-amount;
 return {...state,bulk:state.bulk.flatMap((c,i)=>i!==index?[c]:remaining?[{...c,quantity:remaining}]:[]),decks:state.decks.map(d=>d.id===deckId?{...d,cards:addInventory(d.cards,owned,amount,owned.cardVariant)}:d)};
}
export function priceOf(card){const p=card.prices||{};const foil=card.cardVariant==='Foil';const raw=foil?p.usd_foil:p.usd;if(raw===null||raw===undefined||raw==='')return null;const n=Number(raw);return Number.isFinite(n)?n:null;}
export function inventoryValue(cards){let total=0,priced=0,unpriced=0;for(const card of cards){const price=priceOf(card),q=positive(card.quantity);if(price===null)unpriced+=q;else{priced+=q;total+=price*q;}}return {total,priced,unpriced};}
export function ownedCards(state){return [...state.bulk,...visibleDecks(state).filter(d=>!d.isDraft).flatMap(d=>{const saved=Array.isArray(d.commanders)&&d.commanders.length?d.commanders:d.commanderCard?[d.commanderCard]:[],seen=new Set(),commanders=saved.filter(card=>{const key=card?.oracleId||card?.oracle_id||card?.id||String(card?.name||'').toLowerCase();if(!key||seen.has(key))return false;seen.add(key);return true;}).map(card=>({...card,quantity:1}));return [...d.cards,...commanders];})];}
export function validateState(input){
 if(!input||input.version!==1||!Array.isArray(input.decks)||!Array.isArray(input.bulk))throw Error('Choose a Deck Sage Web V1 backup.');
 if(input.decks.length>1000||input.bulk.length>100000)throw Error('Backup exceeds local workspace limits.');
 const output=baseState();
 const card=c=>{if(!c||typeof c.name!=='string'||!c.name.trim())throw Error('Backup includes a card without a name.');return {...compactCard(c),name:c.name.slice(0,200),quantity:positive(c.quantity),cardVariant:['Normal','Foil','Full Art'].includes(c.cardVariant)?c.cardVariant:'Normal',colorIdentity:Array.isArray(c.colorIdentity)?c.colorIdentity.filter(v=>'WUBRG'.includes(v)):[]};};
 output.decks=input.decks.map(d=>{if(!d||typeof d.name!=='string'||!Array.isArray(d.cards))throw Error('Backup contains an invalid deck.');return {...d,id:typeof d.id==='string'?d.id:uid(),name:d.name.slice(0,200),playstyle:normalizeDeckPlaystyle(d.playstyle),cards:d.cards.map(card),commanderCard:d.commanderCard?card(d.commanderCard):null,basicLands:Object.fromEntries(LAND_NAMES.map(n=>[n,Math.max(0,Math.min(9999,Math.floor(Number(d.basicLands?.[n])||0)))]))};});
 if(Array.isArray(input.retainedDeckRecords))output.retainedDeckRecords=input.retainedDeckRecords.slice(-1000).map(d=>{if(!d||typeof d.name!=='string'||!Array.isArray(d.cards))throw Error('Backup contains an invalid retained deck record.');return {...d,id:typeof d.id==='string'?d.id:uid(),name:d.name.slice(0,200),status:'deleted',cards:d.cards.map(card),commanderCard:d.commanderCard?card(d.commanderCard):null,basicLands:Object.fromEntries(LAND_NAMES.map(n=>[n,Math.max(0,Math.min(9999,Math.floor(Number(d.basicLands?.[n])||0)))]))};});
 output.bulk=input.bulk.map(card);
 output.profile={...output.profile,...(input.profile||{})};output.profile.avatar=normalizeAvatarNumber(output.profile.avatar);
 for(const key of ['favorites','contacts','stores','notifications'])if(Array.isArray(input[key]))output[key]=input[key];
 output.settings={...output.settings,...(input.settings||{})};return output;
}
export function loadState(){try{const saved=localStorage.getItem(STORAGE_KEY);return saved?validateState(JSON.parse(saved)):baseState();}catch{return baseState();}}
export function parseDecklist(text){
 if(String(text||'').length>100000)throw Error('Import up to 100,000 characters at a time.');
 const rows=[];for(const line of text.split(/\r?\n/)){
  const trimmed=line.trim();if(!trimmed||trimmed.startsWith('#')||trimmed.startsWith('//'))continue;
  if(trimmed.length>500)throw Error('Each imported line must be 500 characters or fewer.');
  const m=trimmed.match(/^(\d+)\s*x?\s+(.+)$/i);let name=(m?m[2]:trimmed).replace(/\s+\([A-Z0-9]{2,6}\)\s*\d*$/i,'').trim();
  if(name)rows.push({name,quantity:positive(m?m[1]:1)});
 }if(rows.length>500)throw Error('Import up to 500 lines at a time.');return rows;
}
