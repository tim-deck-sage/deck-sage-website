const MAX_RETURNED_NAMES=40;

export const emptyAiScanSession=()=>({
 phase:'stage',
 photoStates:{},
 entries:[],
 destination:'',
 error:'',
 saved:false,
 saveApplied:false,
 success:'',
});

export const aiScanConfig=()=>{
 const value=window.DECK_SAGE_AI_SCAN;
 return value&&value.enabled===true&&typeof value.endpoint==='string'&&value.endpoint.trim()
  ?{enabled:true,endpoint:value.endpoint.trim()}
  :{enabled:false,endpoint:''};
};

const normalizeName=value=>String(value||'').normalize('NFKD').replace(/[^\x00-\x7F]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();

export async function prepareAiPhoto(file,signal){
 if(signal?.aborted)throw new DOMException('Cancelled','AbortError');
 let image;
 try{image=await createImageBitmap(file,{imageOrientation:'from-image'});}catch{throw Error('This browser could not prepare the photo for scanning. Try a JPEG, PNG, or WebP image.');}
 try{
  if(signal?.aborted)throw new DOMException('Cancelled','AbortError');
  const scale=Math.min(1,1600/Math.max(image.width,image.height)),canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));
  const context=canvas.getContext('2d',{alpha:false});context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.72));
  if(!blob)throw Error('This browser could not compress the photo for scanning.');
  return new File([blob],String(file.name||'card-photo').replace(/\.[^.]+$/,'.jpg'),{type:'image/jpeg'});
 }finally{image.close?.();}
}

export async function scanAiPhoto({endpoint,file,signal}){
 const prepared=await prepareAiPhoto(file,signal),form=new FormData();form.append('image',prepared,prepared.name);
 const response=await fetch(endpoint,{method:'POST',body:form,signal,headers:{Accept:'application/json'}});
 let payload={};try{payload=await response.json();}catch{}
 if(!response.ok)throw Error(payload.error||payload.message||`AI Scan failed (${response.status}).`);
 const clean=list=>Array.isArray(list)?list.filter(value=>typeof value==='string'&&value.trim()).map(value=>value.trim()).slice(0,MAX_RETURNED_NAMES):[];
 return {detectedNames:clean(payload.detectedNames),uncertainNames:clean(payload.uncertainNames)};
}

export async function matchScanName(name,{uncertain=false,signal}={}){
 const response=await import('./providers/staticCards').then(({cardRequest})=>cardRequest('/api/match-name',{method:'POST',body:JSON.stringify({name}),signal}));
 const result=await response.json();
 if(uncertain)return {...result,status:'uncertain',card:null,candidates:[result.card,...(result.candidates||[])].filter(Boolean)};
 return result;
}

export async function buildReviewEntries(photoStates,signal){
 const names=[];
 for(const [photoIndex,state] of Object.entries(photoStates))if(state.status==='success'){
  for(const name of state.detectedNames||[])names.push({name,uncertain:false,photoIndex:Number(photoIndex)});
  for(const name of state.uncertainNames||[])names.push({name,uncertain:true,photoIndex:Number(photoIndex)});
 }
 const resolved=[];
 for(const item of names){
  if(signal?.aborted)throw new DOMException('Cancelled','AbortError');
  const match=await matchScanName(item.name,{uncertain:item.uncertain,signal});
  resolved.push({...item,...match});
 }
 const grouped=[];
 for(const item of resolved){
  const key=item.status==='matched'&&item.card?`card:${item.card.oracleId||item.card.id}`:`name:${normalizeName(item.name)}:${item.status}`;
  const existing=grouped.find(entry=>entry.key===key);
  if(existing){existing.quantity++;existing.photoIndexes=[...new Set([...existing.photoIndexes,item.photoIndex])];}
  else grouped.push({key,id:crypto.randomUUID(),name:item.name,quantity:1,status:item.status,card:item.card||null,candidates:item.candidates||[],source:item.source||'',photoIndexes:[item.photoIndex]});
 }
 return grouped.sort((a,b)=>a.name.localeCompare(b.name));
}

export function chooseCandidate(entry,oracleId){
 const card=(entry.candidates||[]).find(candidate=>(candidate.oracleId||candidate.id)===oracleId);
 return card?{...entry,status:'matched',card,candidates:[],name:card.name,source:'review'}:entry;
}
