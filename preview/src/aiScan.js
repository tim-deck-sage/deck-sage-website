let localWorker=null,pending=null;
export const emptyAiScanSession=()=>({phase:'stage',photoStates:{},entries:[],destination:'',error:'',saved:false,saveApplied:false,success:''});
export const aiScanConfig=()=>{
 const supported=typeof Worker!=='undefined'&&typeof WebAssembly!=='undefined'&&typeof OffscreenCanvas!=='undefined'&&typeof createImageBitmap==='function'&&typeof crypto?.subtle?.digest==='function';
 return {enabled:supported,reason:supported?'':'Local scanning needs a current browser with WebAssembly and offscreen image support. Try a current Chrome, Edge, Firefox or Safari browser. No photo was uploaded.'};
};
const normalizeName=value=>String(value||'').normalize('NFKD').replace(/[^\x00-\x7F]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function releaseLocalScanner(){
 const task=pending;pending=null;if(localWorker){localWorker.onmessage=null;localWorker.onerror=null;localWorker.terminate();}localWorker=null;
 if(task){task.cleanup();task.reject(new DOMException('Cancelled','AbortError'));}
}
export function releaseScanImages(session){
 const urls=new Set();
 for(const state of Object.values(session?.photoStates||{}))for(const p of state.predictions||[])if(p.cropUrl)urls.add(p.cropUrl);
 for(const entry of session?.entries||[])for(const p of entry.scanSources||[])if(p.cropUrl)urls.add(p.cropUrl);
 for(const url of urls)URL.revokeObjectURL(url);
}
export function scanAiPhoto({file,signal,onProgress=()=>{}}){
 if(signal?.aborted)return Promise.reject(new DOMException('Cancelled','AbortError'));
 if(pending)return Promise.reject(Error('A photo is already scanning. Please wait or cancel it.'));
 if(!aiScanConfig().enabled)return Promise.reject(Error(aiScanConfig().reason));
 return new Promise((resolve,reject)=>{
  const abort=()=>releaseLocalScanner(),cleanup=()=>signal?.removeEventListener('abort',abort);
  pending={resolve,reject,cleanup};signal?.addEventListener('abort',abort,{once:true});
  try{
   if(!localWorker)localWorker=new Worker('/local-scanner/v1/worker.js',{type:'module',name:'deck-sage-private-card-scanner'});
   const worker=localWorker,taskIdentity=pending;
   worker.onmessage=({data})=>{
    if(localWorker!==worker||pending!==taskIdentity)return;
    if(data.type==='progress'){onProgress(data.text);return;}
    const task=pending;pending=null;task.cleanup();
    if(data.type==='result')task.resolve(data.result);
    else {localWorker?.terminate();localWorker=null;task.reject(Error(data.message||'Local scanning could not finish. Try a smaller photo and retry.'));}
   };
   worker.onerror=()=>{if(localWorker!==worker||pending!==taskIdentity)return;const task=pending;pending=null;localWorker?.terminate();localWorker=null;task?.cleanup();task?.reject(Error('The local scanner could not start or ran out of memory. Try one smaller photo in a current browser, then retry. No photo was uploaded.'));};
   localWorker.postMessage({type:'scan',file});
  }catch(error){pending=null;cleanup();localWorker?.terminate();localWorker=null;reject(error);}
 });
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
  if(state.predictions?.length)for(const prediction of state.predictions)names.push({name:prediction.name,uncertain:false,photoIndex:Number(photoIndex),scanSource:{...prediction,photoIndex:Number(photoIndex)}});
  else for(const name of state.detectedNames||[])names.push({name,uncertain:false,photoIndex:Number(photoIndex)});
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
  if(existing){existing.quantity++;if(item.scanSource)existing.scanSources.push(item.scanSource);existing.photoIndexes=[...new Set([...existing.photoIndexes,item.photoIndex])];}
  else grouped.push({key,id:crypto.randomUUID(),name:item.name,quantity:1,status:item.status,card:item.card||null,candidates:item.candidates||[],source:item.source||'',photoIndexes:[item.photoIndex],scanSources:item.scanSource?[item.scanSource]:[]});
 }
 return grouped.sort((a,b)=>a.name.localeCompare(b.name));
}

export function chooseCandidate(entry,oracleId){
 const card=(entry.candidates||[]).find(candidate=>(candidate.oracleId||candidate.id)===oracleId);
 return card?{...entry,status:'matched',card,candidates:[],name:card.name,source:'review'}:entry;
}
