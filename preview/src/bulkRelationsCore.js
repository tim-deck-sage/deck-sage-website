import {validateCommandZone,commanderCopyLimit} from './bulkDeckDiscovery';
const quantity=c=>Math.max(0,Math.floor(Number(c.quantity??1)||0));
const frontType=c=>(c.faces?.[0]?.type_line||c.faces?.[0]?.typeLine||c.typeLine||c.type_line||'').split(' // ')[0];
const frontText=c=>c.faces?.[0]?.oracle_text||c.faces?.[0]?.oracleText||c.oracleText||c.oracle_text||'';
export function relationshipInventory(bulk){
 const map=new Map();let excluded=0;
 for(const c of bulk){const q=quantity(c),id=c.oracleId||c.oracle_id;if(!q)continue;
  if(!id||!Array.isArray(c.colorIdentity)||c.metadataComplete===false||c.legalities?.commander!=='legal'||/\bLand\b/.test(frontType(c))||['token','double_faced_token','emblem','art_series'].includes(c.layout)||/^Token|^Emblem/.test(frontType(c))){excluded++;continue;}
  if(map.has(id))map.get(id).quantity+=q;else map.set(id,{...c,oracleId:id,typeLine:frontType(c),oracleText:frontText(c),power:c.faces?.[0]?.power??c.power,toughness:c.faces?.[0]?.toughness??c.toughness,quantity:q});
 }
 return {cards:[...map.values()].map(c=>({...c,usableCopies:Math.min(c.quantity,commanderCopyLimit(c))})),excluded};
}
export function ownedRelationshipZones(inventory,catalog){
 const allowed=new Set(catalog.filter(c=>c.legalities?.commander==='legal'&&c.status!=='unreleased').map(c=>c.oracleId)),eligible=inventory.filter(c=>allowed.has(c.oracleId)).sort((a,b)=>a.oracleId.localeCompare(b.oracleId)),zones=eligible.filter(c=>validateCommandZone([c]).ok).map(c=>[c]),paired=eligible.filter(c=>/partner|friends forever|choose a background|doctor['’]s companion|\bBackground\b/i.test(c.oracleText+' '+c.typeLine));
 for(let i=0;i<paired.length;i++)for(let j=i+1;j<paired.length;j++)if(validateCommandZone([paired[i],paired[j]]).ok)zones.push([paired[i],paired[j]]);
 return zones;
}
export function relationshipCautions(card,zone){
 const plan=zone.map(c=>c.oracleText||'').join('\n'),out=[];
 for(const source of (card.oracleText||'').split('\n')){
  if(/planeswalker/i.test(plan)&&/\bAll creatures have haste\b/i.test(source))out.push({kind:'opposing_haste',reviewOnly:true,source,reason:'Also grants opposing creatures haste. Review the risk to a planeswalker protection plan.'});
  if(/cast/i.test(plan)&&/each turn/i.test(plan)&&/you can't cast spells until your next turn/i.test(source))out.push({kind:'casting_lock',reviewOnly:true,source,reason:'The optional untap benefit locks spellcasting until your next turn; it may conflict with each-turn casting.'});
  if(/creature card in your graveyard/i.test(plan)&&/exile[^.]*cards? from your graveyard/i.test(source))out.push({kind:'graveyard_resource_competition',reviewOnly:false,source,reason:'May consume graveyard resources needed for recursion. Review the optional alternatives and targets.'});
 }
 return out;
}
export function decodeRelationshipVectors(buffer,rows,dimensions){
 if(rows!==25932||dimensions!==128||buffer.byteLength!==rows*dimensions*2)throw Error('The learned card data has an unexpected shape.');
 const view=new DataView(buffer),vectors=new Float32Array(rows*dimensions),powers=Array.from({length:32},(_,i)=>2**(i-15));
 for(let i=0;i<vectors.length;i++){const h=view.getUint16(i*2,true),e=(h>>>10)&31,f=h&1023;let x=e===0?2**-14*f/1024:e===31?NaN:powers[e]*(1+f/1024);if(h&32768)x=-x;if(!Number.isFinite(x))throw Error('The learned card data contains an invalid value.');vectors[i]=x;}
 for(let i=0;i<rows;i++){let norm=0;for(let j=0;j<dimensions;j++)norm+=vectors[i*dimensions+j]**2;norm=Math.sqrt(norm);if(!norm)throw Error('The learned card data contains an empty row.');for(let j=0;j<dimensions;j++)vectors[i*dimensions+j]/=norm;}
 return vectors;
}
export function scoreRelationshipZone(zone,inventory,knowledge){
 const {lookup,vectors,dimensions}=knowledge,row=id=>Number.isInteger(lookup[id])&&lookup[id]>0?lookup[id]:null,missing=zone.filter(c=>row(c.oracleId)===null),zoneIds=new Set(zone.map(c=>c.oracleId)),identity=[...new Set(zone.flatMap(c=>c.colorIdentity))],pool=inventory.filter(c=>!zoneIds.has(c.oracleId)&&c.colorIdentity.every(x=>identity.includes(x))),known=pool.filter(c=>row(c.oracleId)!==null),head={commandZone:zone.map(c=>({oracleId:c.oracleId,name:c.name})),identity,coverage:{known:known.length,compatible:pool.length,unsupported:pool.length-known.length},abilities:zone.map(c=>({name:c.name,oracleText:c.oracleText})),source:'learned_association'};
 if(missing.length)return {...head,status:'unsupported_commander',score:null,core:[],ranked:[],reviewOnly:[],missingCommanders:missing.map(c=>c.name)};
 const dot=(a,b)=>{let s=0;for(let j=0;j<dimensions;j++)s+=vectors[a*dimensions+j]*vectors[b*dimensions+j];return s;};
 const ranked=known.map(c=>({oracleId:c.oracleId,name:c.name,ownedQuantity:c.quantity,usableCopies:c.usableCopies,score:zone.reduce((s,z)=>s+dot(row(z.oracleId),row(c.oracleId)),0)/zone.length,cautions:relationshipCautions(c,zone)})).sort((a,b)=>b.score-a.score||a.oracleId.localeCompare(b.oracleId)),core=ranked.filter(c=>!c.cautions.some(x=>x.reviewOnly)).slice(0,40),top=ranked.slice(0,20);
 return {...head,status:known.length<20?'small_learned_group':'learned_core',score:top.reduce((s,c)=>s+c.score,0)/20,core,ranked:ranked.filter(c=>!c.cautions.some(x=>x.reviewOnly)).slice(0,100),reviewOnly:ranked.filter(c=>c.cautions.some(x=>x.reviewOnly)).slice(0,12)};
}
export function relationshipCoverage(inventory,knowledge,zones){
 const recognized=inventory.filter(c=>Number.isInteger(knowledge.lookup[c.oracleId])&&knowledge.lookup[c.oracleId]>0).length,unsupportedZones=zones.filter(z=>z.some(c=>!knowledge.lookup[c.oracleId])).length;
 return {recognized,eligibleNonlands:inventory.length,unsupportedCards:inventory.length-recognized,commandZones:zones.length,recognizedCommandZones:zones.length-unsupportedZones,unsupportedCommandZones:unsupportedZones};
}
