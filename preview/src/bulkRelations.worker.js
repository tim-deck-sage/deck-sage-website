import {bulkModelManifest,bulkModelManifestSha256} from './bulkModelConfig';
import {validateCommandZone} from './bulkDeckDiscovery';
import {relationshipInventory,ownedRelationshipZones,decodeRelationshipVectors,scoreRelationshipZone,relationshipCoverage} from './bulkRelationsCore';
let knowledgePromise;
const hex=bytes=>[...new Uint8Array(bytes)].map(n=>n.toString(16).padStart(2,'0')).join('');
async function readAsset(url,expectedHash,expectedBytes,retry){
 const response=await fetch(url,{cache:retry?'reload':'force-cache'});if(!response.ok)throw Error('The learned card library could not be loaded. Retry the scan.');
 const bytes=await response.arrayBuffer();if(expectedBytes&&bytes.byteLength!==expectedBytes)throw Error('The learned card download was incomplete. Retry the scan.');
 if(hex(await crypto.subtle.digest('SHA-256',bytes))!==expectedHash)throw Error('The learned card library failed its integrity check. Retry the scan.');return bytes;
}
async function knowledge(retry){
 if(!knowledgePromise||retry)knowledgePromise=(async()=>{const raw=await readAsset(bulkModelManifest,bulkModelManifestSha256,null,retry),manifest=JSON.parse(new TextDecoder().decode(raw));
 if(manifest.schemaVersion!==1||manifest.rows!==25932||manifest.dimensions!==128||!/^relations-[a-f0-9]{16}\.f16$/.test(manifest.vectors?.file)||!/^oracle-[a-f0-9]{16}\.json$/.test(manifest.lookup?.file)||manifest.vectors.bytes!==6638592||manifest.lookup.bytes>2000000)throw Error('The learned card library version is not supported.');
 const [table,index]=await Promise.all([readAsset('/bulk-model/'+manifest.vectors.file,manifest.vectors.sha256,manifest.vectors.bytes,retry),readAsset('/bulk-model/'+manifest.lookup.file,manifest.lookup.sha256,manifest.lookup.bytes,retry)]),lookup=JSON.parse(new TextDecoder().decode(index));
 for(const [id,row] of Object.entries(lookup))if(!/^[a-f0-9-]{36}$/.test(id)||!Number.isInteger(row)||row<=0||row>=manifest.rows)throw Error('The learned card index is invalid.');
 return {lookup,vectors:decodeRelationshipVectors(table,manifest.rows,manifest.dimensions),dimensions:manifest.dimensions,revision:manifest.revision};
 })().catch(error=>{knowledgePromise=null;throw error;});return knowledgePromise;
}
self.onmessage=async({data})=>{const {id,bulk,catalog,queryZones,retry}=data;try{
 self.postMessage({id,type:'progress',text:"Opening the Sage's learned card library."});const model=await knowledge(retry),inventory=relationshipInventory(bulk),zones=queryZones||ownedRelationshipZones(inventory.cards,catalog),top=[];
 const allowed=new Set(catalog.filter(c=>c.legalities?.commander==='legal'&&c.status!=='unreleased').map(c=>c.oracleId));
 for(const zone of zones)if(zone.some(c=>!allowed.has(c.oracleId))||!validateCommandZone(zone).ok)throw Error('A command zone is not verified by the current card catalog and pairing rules.');
 for(let i=0;i<zones.length;i++){const row=scoreRelationshipZone(zones[i],inventory.cards,model);if(row.score!==null){top.push(row);top.sort((a,b)=>b.score-a.score||a.commandZone.map(c=>c.oracleId).join().localeCompare(b.commandZone.map(c=>c.oracleId).join()));if(top.length>12)top.pop();}else if(queryZones)top.push(row);self.postMessage({id,type:'progress',text:'Studying command zone '+(i+1)+' of '+zones.length+'.'});}
 self.postMessage({id,type:'result',data:{results:top,coverage:relationshipCoverage(inventory.cards,model,zones),excluded:inventory.excluded,modelRevision:model.revision}});
 }catch(error){self.postMessage({id,type:'error',message:error.message});}};
