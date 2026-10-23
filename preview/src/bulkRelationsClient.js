const workerUrl=typeof __BULK_RELATIONS_WORKER__!=='undefined'?__BULK_RELATIONS_WORKER__:'/bulk-model/worker.js';
export function readBulkRelationships(bulk,catalog,{signal,onProgress=()=>{},queryZones,retry=false}={}){
 return new Promise((resolve,reject)=>{if(signal?.aborted){reject(new DOMException('Cancelled','AbortError'));return;}let worker,done=false;
 const finish=(error,value)=>{if(done)return;done=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);worker?.terminate();error?reject(error):resolve(value);},abort=()=>finish(new DOMException('Cancelled','AbortError')),timer=setTimeout(()=>finish(Error('The local card search took longer than expected. Retry with this page open.')),120000);
 try{worker=new Worker(workerUrl,{type:'module'});worker.onmessage=({data})=>{if(done)return;if(data.type==='progress')onProgress(data.text);else if(data.type==='result')finish(null,data.data);else if(data.type==='error')finish(Error(data.message));};worker.onerror=()=>finish(Error('The local learned card library could not open. Retry the scan.'));signal?.addEventListener('abort',abort,{once:true});worker.postMessage({id:1,bulk,catalog:catalog.map(c=>({oracleId:c.oracleId,legalities:c.legalities,status:c.status})),queryZones,retry});}catch(error){finish(error);}
 });
}
