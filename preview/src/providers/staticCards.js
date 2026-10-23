// Public card metadata travels to this browser. Collection data never travels out.
let worker,sequence=0;
const pending=new Map();
function getWorker(){
 if(worker)return worker;
 worker=new Worker('/card-worker.js?v=2026-10-23.1');
 worker.onmessage=({data})=>{const task=pending.get(data.id);if(!task)return;pending.delete(data.id);data.error?task.reject(Error(data.error)):task.resolve(data.result);};
 worker.onerror=()=>{for(const task of pending.values())task.reject(Error('The card library could not start. Refresh this page to retry.'));pending.clear();worker?.terminate();worker=null;};
 return worker;
}
export function cardRequest(url,options={}){
 if(options.signal?.aborted)return Promise.reject(new DOMException('Cancelled','AbortError'));
 const parsed=new URL(url,location.origin);const id=++sequence;
 return new Promise((resolve,reject)=>{
  const abort=()=>{pending.delete(id);reject(new DOMException('Cancelled','AbortError'));};
  options.signal?.addEventListener('abort',abort,{once:true});
  const finish=callback=>value=>{options.signal?.removeEventListener('abort',abort);callback(value)};
  pending.set(id,{resolve:finish(result=>resolve({ok:!(parsed.pathname==='/api/card'&&!result.card),status:parsed.pathname==='/api/card'&&!result.card?404:200,json:async()=>result})),reject:finish(reject)});
  try{getWorker().postMessage({id,path:parsed.pathname,params:Object.fromEntries(parsed.searchParams),body:options.body?JSON.parse(options.body):null});}catch(e){pending.delete(id);finish(reject)(e);}
 });
}
