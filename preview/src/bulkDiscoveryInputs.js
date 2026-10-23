import {cardRequest} from './providers/staticCards';
import {readComboJson} from './commanderCombos';
const cancelled=signal=>{if(signal?.aborted)throw new DOMException('Cancelled','AbortError');};
export async function canonicalBulkCard(saved,signal){
 cancelled(signal);const query=saved.oracleId||saved.oracle_id?'id='+encodeURIComponent(saved.oracleId||saved.oracle_id):'name='+encodeURIComponent(saved.name),response=await cardRequest('/api/card?'+query,{signal}),{card}=await response.json();cancelled(signal);
 if(!response.ok||!card)return {...saved,metadataComplete:false,legalities:{commander:'unknown'}};
 const printing=Object.fromEntries(['cardVariant','setName','setCode','collectorNumber','scryfallId','printingIdentity'].filter(k=>saved[k]!==undefined).map(k=>[k,saved[k]]));
 return {...card,...printing,quantity:saved.quantity??1,metadataComplete:true};
}
export async function prepareBulkDiscovery(bulk,signal,onProgress=()=>{}){
 const manifest=await readComboJson('/combo-data/manifest.json',signal);if(!/^catalog-[a-f0-9]{16}\.json\.gz$/.test(manifest.file))throw Error('Invalid commander catalog reference.');
 const catalog=await readComboJson('/combo-data/'+manifest.file,signal,manifest.sha256);if(catalog.schemaVersion!==1||!Array.isArray(catalog.cards))throw Error('Unsupported commander catalog.');
 const resolved=[];for(let i=0;i<bulk.length;i+=16){cancelled(signal);resolved.push(...await Promise.all(bulk.slice(i,i+16).map(c=>canonicalBulkCard(c,signal))));onProgress(Math.min(i+16,bulk.length),bulk.length);await new Promise(r=>setTimeout(r,0));}
 cancelled(signal);return {bulk:resolved,catalog:catalog.cards,generatedAt:catalog.generatedAt,unresolved:resolved.filter(c=>!c.metadataComplete).length};
}
