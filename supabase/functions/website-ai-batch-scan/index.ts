// @ts-nocheck -- Supabase Edge Functions run on Deno, outside the Next.js type environment.
import {gatewayAvailability} from './policy.mjs';

const SITE_ORIGIN='https://deck-sage.com';
const MAX_IMAGE_BYTES=6*1024*1024;
const MAX_NAMES=40;
const MODEL='gpt-4.1-mini';
const corsHeaders={
 'Access-Control-Allow-Origin':SITE_ORIGIN,
 'Access-Control-Allow-Headers':'content-type',
 'Access-Control-Allow-Methods':'POST, OPTIONS',
 'Access-Control-Max-Age':'86400',
 'Vary':'Origin',
};
const jsonHeaders={...corsHeaders,'Content-Type':'application/json','Cache-Control':'no-store'};
const respond=(status:number,body:unknown,extra:Record<string,string>={})=>new Response(JSON.stringify(body),{status,headers:{...jsonHeaders,...extra}});

function requestIp(req:Request){
 const forwarded=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
 return req.headers.get('cf-connecting-ip')?.trim()||forwarded||req.headers.get('x-real-ip')?.trim()||'';
}
async function hashIp(ip:string,secret:string){
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const digest=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(ip));
 return Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
}
function base64(bytes:Uint8Array){let value='';for(let offset=0;offset<bytes.length;offset+=0x8000)value+=String.fromCharCode(...bytes.subarray(offset,offset+0x8000));return btoa(value);}
function cleanNames(value:unknown){return Array.isArray(value)?value.filter((name):name is string=>typeof name==='string'&&Boolean(name.trim())).map(name=>name.trim()).slice(0,MAX_NAMES):[];}
async function consumeQuota(keyHash:string){
 const url=Deno.env.get('SUPABASE_URL'),serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!url||!serviceKey)throw Error('Quota service is not configured.');
 const response=await fetch(`${url}/rest/v1/rpc/consume_ai_scan_quota`,{method:'POST',headers:{apikey:serviceKey,Authorization:`Bearer ${serviceKey}`,'Content-Type':'application/json'},body:JSON.stringify({p_key_hash:keyHash})});
 if(!response.ok)throw Error('Quota service is unavailable.');
 const [result]=await response.json();return result as {allowed:boolean;retry_after_seconds:number};
}

Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin')||'';
 if(req.method==='OPTIONS')return origin===SITE_ORIGIN?new Response(null,{status:204,headers:corsHeaders}):respond(403,{error:'Origin not allowed.'});
 if(origin!==SITE_ORIGIN)return respond(403,{error:'Origin not allowed.'});
 if(req.method!=='POST')return respond(405,{error:'Use POST.'},{Allow:'POST, OPTIONS'});
 const apiKey=Deno.env.get('OPENAI_API_KEY'),availability=gatewayAvailability(Deno.env.get('AI_SCAN_ENABLED'),apiKey);
 if(availability)return respond(availability.status,{error:availability.error});
 const ip=requestIp(req);if(!ip)return respond(400,{error:'The request source could not be verified.'});
 let quota;try{quota=await consumeQuota(await hashIp(ip,apiKey));}catch{return respond(503,{error:'AI Scan quota checks are unavailable. Try again later.'});}
 if(!quota.allowed)return respond(429,{error:'AI Scan limit reached. Try again later.'},{'Retry-After':String(quota.retry_after_seconds)});
 let form:FormData;try{form=await req.formData();}catch{return respond(400,{error:'Send one JPEG image as multipart form data.'});}
 const image=form.get('image');if(!(image instanceof File))return respond(400,{error:'Choose one card photo.'});if(image.type!=='image/jpeg')return respond(415,{error:'The prepared scan image must be JPEG.'});if(image.size<4||image.size>MAX_IMAGE_BYTES)return respond(413,{error:'The prepared scan image must be 6 MB or smaller.'});
 const bytes=new Uint8Array(await image.arrayBuffer());if(bytes[0]!==0xff||bytes[1]!==0xd8||bytes.at(-2)!==0xff||bytes.at(-1)!==0xd9)return respond(415,{error:'The uploaded file is not a valid JPEG image.'});
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);
 try{
  const provider=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',signal:controller.signal,headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:MODEL,temperature:0,max_tokens:1000,response_format:{type:'json_object'},messages:[{role:'system',content:'Identify visible Magic: The Gathering cards. Return strict JSON with detectedNames and uncertainNames arrays. Use exact printed title-bar names only. Do not return card types, rules, sets, explanations, confidence values, canonical equivalents, or invented guesses. Ignore glare, reflections, hidden, overlapped, or unreadable cards. Return at most 40 total names.'},{role:'user',content:[{type:'text',text:'Read the visible printed card names in this batch photo.'},{type:'image_url',image_url:{url:`data:image/jpeg;base64,${base64(bytes)}`,detail:'low'}}]}]})});
  if(!provider.ok)return respond(provider.status===429?429:502,{error:provider.status===429?'AI Scan is busy. Try again later.':'The card-name service could not process this photo.'});
  const payload=await provider.json(),content=payload?.choices?.[0]?.message?.content;let parsed;try{parsed=JSON.parse(content);}catch{return respond(502,{error:'The card-name service returned an unreadable result.'});}
  const detectedNames=cleanNames(parsed.detectedNames),uncertainNames=cleanNames(parsed.uncertainNames).slice(0,MAX_NAMES-detectedNames.length);
  return respond(200,{detectedNames,uncertainNames});
 }catch(error){return respond(error instanceof DOMException&&error.name==='AbortError'?504:502,{error:error instanceof DOMException&&error.name==='AbortError'?'AI Scan timed out. Try again.':'The card-name service could not process this photo.'});}finally{clearTimeout(timer);}
});
