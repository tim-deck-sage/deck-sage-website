// Public card metadata travels to this browser. Collection data never travels out.
let worker,sequence=0;
const pending=new Map();
function resetWorker(message){const tasks=[...pending.values()];pending.clear();worker?.terminate();worker=null;for(const task of tasks)task.reject(Error(message));}
function getWorker(){
 if(worker)return worker;
 worker=new Worker('/card-worker.js?v=2026-10-23.3');
 worker.onmessage=({data})=>{const task=pending.get(data.id);if(!task)return;data.error?task.reject(Error(data.error)):task.resolve(data.result);};
 worker.onerror=()=>resetWorker('The card library could not start. Refresh this page to retry.');
 return worker;
}
export function cardRequest(url,options={}){
 if(options.signal?.aborted)return Promise.reject(new DOMException('Cancelled','AbortError'));
 const parsed=new URL(url,location.origin);const id=++sequence;
 return new Promise((resolve,reject)=>{
  let settled=false,timer;const cleanup=()=>{pending.delete(id);clearTimeout(timer);options.signal?.removeEventListener('abort',abort);},finish=callback=>value=>{if(settled)return;settled=true;cleanup();callback(value);};
  const abort=()=>finish(reject)(new DOMException('Cancelled','AbortError'));
  options.signal?.addEventListener('abort',abort,{once:true});
  pending.set(id,{resolve:finish(result=>resolve({ok:!(parsed.pathname==='/api/card'&&!result.card),status:parsed.pathname==='/api/card'&&!result.card?404:200,json:async()=>result})),reject:finish(reject)});
  timer=setTimeout(()=>resetWorker('The card library took too long to respond. Retry the request.'),Math.max(10,Number(options.timeoutMs)||120000));
  try{getWorker().postMessage({id,path:parsed.pathname,params:Object.fromEntries(parsed.searchParams),body:options.body?JSON.parse(options.body):null});}catch(e){pending.delete(id);finish(reject)(e);}
 });
}
