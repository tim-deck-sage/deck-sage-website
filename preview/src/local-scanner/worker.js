// No photo is ever fetched, uploaded, persisted or logged. Only public scanner assets are cached.
import initBrotli,{decompress} from 'brotli-dec-wasm/web';
const ROOT='/local-scanner/v1/';
let runtime,ready,active=false;
const progress=text=>postMessage({type:'progress',text});
const hex=bytes=>Array.from(new Uint8Array(bytes),n=>n.toString(16).padStart(2,'0')).join('');
async function load(){
 const manifest=await fetch(ROOT+'manifest.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('Scanner download is unavailable. Check your connection and retry.');return r.json();});
 let cache=null;try{cache=await caches.open('deck-sage-scanner-assets-v1');}catch{}
 let loaded=0;const total=manifest.downloadBytes;
 async function asset(key){
  const entry=manifest.assets[key],url=ROOT+entry.file;let response;try{response=await cache?.match(url);}catch{}const cached=!!response;
  if(!response){response=await fetch(url);if(!response.ok)throw Error('A scanner file could not download. Check your connection and retry.');}
  const bytes=new Uint8Array(await response.arrayBuffer());
  if(bytes.byteLength!==entry.bytes||hex(await crypto.subtle.digest('SHA-256',bytes))!==entry.sha256){if(cache){try{await cache.delete(url);}catch{}}throw Error('A scanner file was incomplete. Please retry the download.');}
  if(cache&&!cached){try{await cache.put(url,new Response(bytes));}catch{}}
  loaded+=entry.bytes;progress(`${cached?'Loading cached scanner':'Downloading scanner'} · ${(loaded/1000000).toFixed(1)} / ${(total/1000000).toFixed(1)} MB`);
  return bytes;
 }
 await initBrotli({module_or_path:await asset('decoder')});
 async function unpack(key){return decompress(await asset(key));}
 const urls=[];const asURL=(bytes,type)=>{const url=URL.createObjectURL(new Blob([bytes],{type}));urls.push(url);return url;};
 try{
  const runtimeURL=asURL(await unpack('runtime'),'text/javascript');
  const wasmURL=asURL(await unpack('wasm'),'application/wasm');
  const glueURL=asURL(await unpack('glue'),'text/javascript');
  const det=await unpack('det'),rec=await unpack('rec'),names=JSON.parse(new TextDecoder().decode(await unpack('catalog'))).data;
  progress('Preparing the local scanner…');
  runtime=await import(/* @vite-ignore */ runtimeURL);
  await runtime.initialize({det,rec,names,wasmPaths:{mjs:glueURL,wasm:wasmURL},progress});
  // These URLs belong only to this worker and live until it is terminated.
  if(cache){try{const valid=new Set(Object.values(manifest.assets).map(entry=>new URL(ROOT+entry.file,location.origin).href));for(const request of await cache.keys())if(!valid.has(request.url))await cache.delete(request);for(const name of await caches.keys())if(name.startsWith('deck-sage-scanner-')&&name!=='deck-sage-scanner-assets-v1')await caches.delete(name);}catch{}}
 }catch(error){for(const url of urls)URL.revokeObjectURL(url);throw error;}
}
onmessage=async({data})=>{
 if(data.type!=='scan'||active)return;
 active=true;
 try{ready??=load();await ready;const result=await runtime.scan(data.file,progress);postMessage({type:'result',result});}
 catch(error){ready=null;postMessage({type:'error',message:/memory|allocation|out of bounds|bad_alloc/i.test(String(error))?'This device ran low on memory. Try one smaller photo and close other tabs, then retry.':String(error.message||error)});}
 finally{active=false;}
};
