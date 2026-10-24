// @ts-nocheck -- Supabase Edge Functions run on Deno, outside the Next.js type environment.
import {createClient} from 'npm:@supabase/supabase-js@2.117.3';
import {MAX_ARTWORK_BYTES,MAX_AUDIO_BYTES,SESSION_MS,audioKind,cleanLine,constantTimeEqual,imageKind,validPinConfiguration,validateFields} from './policy.mjs';

const SITE_ORIGINS=new Set(['https://deck-sage.com','https://www.deck-sage.com']);
const BUCKET='deck-sage-published-media';
const MAX_REQUEST_BYTES=11*1024*1024;
const MAX_JSON_BYTES=2048;
const encoder=new TextEncoder();

function allowedOrigin(origin:string){return SITE_ORIGINS.has(origin)||(Deno.env.get('PUBLISHER_ALLOW_LOCAL')==='true'&&/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin));}
function cors(origin:string){return {'Access-Control-Allow-Origin':allowedOrigin(origin)?origin:'https://deck-sage.com','Access-Control-Allow-Headers':'authorization, content-type','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Max-Age':'86400','Vary':'Origin'};}
function respond(status:number,body:unknown,origin='',cache='no-store',extra:Record<string,string>={}){return new Response(JSON.stringify(body),{status,headers:{...cors(origin),'Content-Type':'application/json; charset=utf-8','Cache-Control':cache,'X-Content-Type-Options':'nosniff',...extra}});}
function secretKey(){const modern=Deno.env.get('SUPABASE_SECRET_KEYS');if(modern)try{const keys=JSON.parse(modern),key=keys.default||Object.values(keys)[0];if(key)return String(key);}catch{}return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';}
function service(){const url=Deno.env.get('SUPABASE_URL')||'',key=secretKey();if(!url||!key)throw Error('Publisher storage is unavailable.');return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});}
function configured(){return Deno.env.get('PUBLISHER_ENABLED')==='true'&&validPinConfiguration(Deno.env.get('DECK_SAGE_PUBLISHER_PIN'));}
function requestIp(req:Request){return req.headers.get('cf-connecting-ip')?.trim()||req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||req.headers.get('x-real-ip')?.trim()||'';}
function hex(buffer:ArrayBuffer){return Array.from(new Uint8Array(buffer),byte=>byte.toString(16).padStart(2,'0')).join('');}
async function sha(value:string|Uint8Array){return hex(await crypto.subtle.digest('SHA-256',typeof value==='string'?encoder.encode(value):value));}
async function hmac(value:string,keyValue:string){const key=await crypto.subtle.importKey('raw',encoder.encode(keyValue),{name:'HMAC',hash:'SHA-256'},false,['sign']);return hex(await crypto.subtle.sign('HMAC',key,encoder.encode(value)));}
function randomToken(){const bytes=crypto.getRandomValues(new Uint8Array(32));let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function bearer(req:Request){const match=/^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.headers.get('authorization')||'');return match?.[1]||'';}
function publicUrl(client:any,path:string){return client.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;}
function publicRow(client:any,row:any){return {id:row.id,kind:row.kind,title:row.title,commanderName:row.commander_name,body:row.body,categories:row.categories||[],artworkUrl:publicUrl(client,row.artwork_path),audioUrl:row.audio_path?publicUrl(client,row.audio_path):null,publishedAt:row.published_at};}

async function publicFeed(origin:string){
 if(!configured())return respond(503,{error:'Publishing is not configured.'},origin);
 const client=service(),{data,error}=await client.from('ds_publications').select('id,kind,title,commander_name,body,categories,artwork_path,audio_path,published_at').order('published_at',{ascending:false}).order('id',{ascending:false}).limit(100);
 if(error)throw error;return respond(200,{items:(data||[]).map(row=>publicRow(client,row))},origin,'public, max-age=60, s-maxage=120');
}
async function login(req:Request,origin:string,pin:unknown){
 const configuredPin=Deno.env.get('DECK_SAGE_PUBLISHER_PIN')||'';if(!configured())return respond(503,{error:'Publishing is not configured.'},origin);
 const ip=requestIp(req);if(!ip)return respond(400,{error:'The request source could not be verified.'},origin);
 const pinValue=String(pin||''),pinMatches=/^\d{4}$/.test(pinValue)&&constantTimeEqual(pinValue,configuredPin);
 const client=service(),keyHash=await hmac(`publisher-login:${ip}`,secretKey()),{data,error}=await client.rpc('ds_consume_publisher_login_attempt',{p_key_hash:keyHash,p_failed:!pinMatches});
 if(error||!data?.[0])return respond(503,{error:'The publisher rate limit is unavailable.'},origin);
 const quota=data[0];if(!quota.allowed)return respond(429,{error:'Too many attempts. Try again later.'},origin,'no-store',{'Retry-After':String(quota.retry_after_seconds||1800)});
 if(!pinMatches)return respond(401,{error:'That PIN was not accepted.',attemptsRemaining:quota.attempts_remaining},origin);
 const token=randomToken(),createdAt=new Date(),expiresAt=new Date(createdAt.getTime()+SESSION_MS);
 await client.from('ds_publisher_sessions').delete().lt('expires_at',createdAt.toISOString());
 const inserted=await client.from('ds_publisher_sessions').insert({token_hash:await sha(token),created_at:createdAt.toISOString(),expires_at:expiresAt.toISOString(),last_used_at:createdAt.toISOString()});
 if(inserted.error)return respond(503,{error:'A publisher session could not be opened.'},origin);
 return respond(200,{token,expiresAt:expiresAt.toISOString()},origin);
}
async function session(req:Request){
 const token=bearer(req);if(!token)return null;const client=service(),tokenHash=await sha(token),{data,error}=await client.from('ds_publisher_sessions').select('token_hash,expires_at').eq('token_hash',tokenHash).maybeSingle();
 if(error||!data)return null;if(new Date(data.expires_at).getTime()<=Date.now()){await client.from('ds_publisher_sessions').delete().eq('token_hash',tokenHash);return null;}
 await client.from('ds_publisher_sessions').update({last_used_at:new Date().toISOString()}).eq('token_hash',tokenHash);return {client,tokenHash,expiresAt:data.expires_at};
}
async function logout(req:Request,origin:string){const active=await session(req);if(active)await active.client.from('ds_publisher_sessions').delete().eq('token_hash',active.tokenHash);return respond(200,{ok:true},origin);}
async function bytes(file:File){return new Uint8Array(await file.arrayBuffer());}
async function requestBytes(req:Request,limit:number){const declared=Number(req.headers.get('content-length')||0);if(Number.isFinite(declared)&&declared>limit)throw Error('REQUEST_TOO_LARGE');if(!req.body)return new Uint8Array();const reader=req.body.getReader(),chunks:Uint8Array[]=[];let total=0;try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>limit)throw Error('REQUEST_TOO_LARGE');chunks.push(value);}const output=new Uint8Array(total);let offset=0;for(const chunk of chunks){output.set(chunk,offset);offset+=chunk.byteLength;}return output;}catch(error){await reader.cancel().catch(()=>{});throw error;}}
async function limitedForm(req:Request){const body=await requestBytes(req,MAX_REQUEST_BYTES);return new Response(body,{headers:{'Content-Type':req.headers.get('content-type')||''}}).formData();}
async function limitedJson(req:Request){const body=await requestBytes(req,MAX_JSON_BYTES);return JSON.parse(new TextDecoder().decode(body));}
async function rollback(client:any,paths:string[]){if(paths.length)try{await client.storage.from(BUCKET).remove(paths);}catch{}}

async function publish(req:Request,origin:string){
 if(!configured())return respond(503,{error:'Publishing is not configured.'},origin);
 const active=await session(req);if(!active)return respond(401,{error:'Your publisher session expired. Enter the PIN again.'},origin);
 let form:FormData;try{form=await limitedForm(req);}catch(error){return error instanceof Error&&error.message==='REQUEST_TOO_LARGE'?respond(413,{error:'The selected files are too large.'},origin):respond(400,{error:'The publishing form could not be read.'},origin);}
 const operationId=cleanLine(form.get('operationId'),36);if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(operationId))return respond(400,{error:'Start a fresh publication and try again.'},origin);
 let categories:unknown=[];try{categories=JSON.parse(String(form.get('categories')||'[]'));}catch{return respond(400,{error:'Song categories could not be read.'},origin);}
 const checked=validateFields({kind:form.get('kind'),title:form.get('title'),commanderName:form.get('commanderName'),body:form.get('body'),categories});if(checked.error)return respond(400,{error:checked.error},origin);const value=checked.value;
 const artwork=form.get('artwork'),audio=form.get('audio');if(!(artwork instanceof File))return respond(400,{error:'Choose artwork before publishing.'},origin);if(artwork.size<12||artwork.size>MAX_ARTWORK_BYTES)return respond(413,{error:'Artwork must be 4 MB or smaller.'},origin);if(value.kind==='song'&&!(audio instanceof File))return respond(400,{error:'Choose a song audio file before publishing.'},origin);if(audio instanceof File&&audio.size>MAX_AUDIO_BYTES)return respond(413,{error:'Audio must be 6 MB or smaller.'},origin);
 const artworkBytes=await bytes(artwork),artworkType=imageKind(artworkBytes);if(!artworkType)return respond(415,{error:'Artwork must be a valid JPEG, PNG, or WebP image.'},origin);
 const audioBytes=audio instanceof File?await bytes(audio):null,audioType=audioBytes?audioKind(audioBytes):null;if(value.kind==='song'&&!audioType)return respond(415,{error:'Audio must be a valid MP3, M4A, OGG, or WAV file.'},origin);
 const contentHash=await sha(JSON.stringify({...value,artworkHash:await sha(artworkBytes),audioHash:audioBytes?await sha(audioBytes):null}));
 const existing=await active.client.from('ds_publications').select('id,kind,title,commander_name,body,categories,artwork_path,audio_path,published_at,content_hash').eq('operation_id',operationId).maybeSingle();if(existing.error)return respond(503,{error:'The publication could not be checked. Try again.'},origin);if(existing.data){if(existing.data.content_hash!==contentHash)return respond(409,{error:'This retry no longer matches the original publication.'},origin);return respond(200,{publication:publicRow(active.client,existing.data),duplicate:true},origin);}
 const id=crypto.randomUUID(),base=`${value.kind}/${id}`,artworkPath=`${base}/artwork.${artworkType.extension}`,audioPath=audioType?`${base}/audio.${audioType.extension}`:null,uploaded:string[]=[];
 try{
  const artUpload=await active.client.storage.from(BUCKET).upload(artworkPath,new Blob([artworkBytes],{type:artworkType.mime}),{contentType:artworkType.mime,cacheControl:'31536000',upsert:false});if(artUpload.error)throw Error('artwork');uploaded.push(artworkPath);
  if(audioPath&&audioBytes&&audioType){const audioUpload=await active.client.storage.from(BUCKET).upload(audioPath,new Blob([audioBytes],{type:audioType.mime}),{contentType:audioType.mime,cacheControl:'31536000',upsert:false});if(audioUpload.error)throw Error('audio');uploaded.push(audioPath);}
  const row={id,operation_id:operationId,kind:value.kind,title:value.title,commander_name:value.commanderName,body:value.body,categories:value.categories,artwork_path:artworkPath,artwork_mime:artworkType.mime,artwork_bytes:artworkBytes.length,audio_path:audioPath,audio_mime:audioType?.mime||null,audio_bytes:audioBytes?.length||null,content_hash:contentHash};
  const inserted=await active.client.from('ds_publications').insert(row).select('id,kind,title,commander_name,body,categories,artwork_path,audio_path,published_at').single();if(inserted.error)throw Error('record');return respond(201,{publication:publicRow(active.client,inserted.data),duplicate:false},origin);
 }catch{await rollback(active.client,uploaded);return respond(503,{error:'Nothing was published. The upload was rolled back; try again.'},origin);}
}

Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin')||'';
 if(req.method==='OPTIONS')return allowedOrigin(origin)?new Response(null,{status:204,headers:cors(origin)}):respond(403,{error:'Origin not allowed.'},origin);
 if(origin&&!allowedOrigin(origin))return respond(403,{error:'Origin not allowed.'},origin);
 try{
  if(req.method==='GET')return await publicFeed(origin);
  if(req.method!=='POST')return respond(405,{error:'Use GET or POST.'},origin,'no-store',{Allow:'GET, POST, OPTIONS'});
  const type=req.headers.get('content-type')||'';
   if(type.includes('application/json')){let body:any;try{body=await limitedJson(req);}catch(error){return error instanceof Error&&error.message==='REQUEST_TOO_LARGE'?respond(413,{error:'The request is too large.'},origin):respond(400,{error:'The request could not be read.'},origin);}if(body?.action==='login')return await login(req,origin,body.pin);if(body?.action==='logout')return await logout(req,origin);return respond(400,{error:'Unknown publisher action.'},origin);}
  if(type.includes('multipart/form-data'))return await publish(req,origin);
  return respond(415,{error:'Use JSON to unlock or a publishing form to upload.'},origin);
 }catch(error){console.error('PUBLISHER REQUEST FAILED',error instanceof Error?error.message:'unknown');return respond(503,{error:'The publisher is temporarily unavailable.'},origin);}
});
