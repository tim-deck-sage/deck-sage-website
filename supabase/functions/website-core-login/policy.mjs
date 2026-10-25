export function createLoginHandler({origin,resolveEmail,consume,authenticate,hash,now=Date.now,pause=ms=>new Promise(resolve=>setTimeout(resolve,ms))}){
 return async request=>{
  const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'content-type,apikey','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store','Content-Type':'application/json','Vary':'Origin'};
  const reply=(status,body)=>new Response(JSON.stringify(body),{status,headers});
  if(request.headers.get('origin')!==origin)return reply(403,{error:'Request unavailable'});
  if(request.method==='OPTIONS')return reply(200,{});
  if(request.method!=='POST')return reply(405,{error:'Request unavailable'});
  const started=now();
  try{
   if(Number(request.headers.get('content-length'))>8192)return reply(400,{error:'Unable to sign in'});
   const reader=request.body?.getReader();if(!reader)return reply(400,{error:'Unable to sign in'});
   const chunks=[];let bytes=0;
   while(true){const {value,done}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>8192){await reader.cancel();return reply(400,{error:'Unable to sign in'});}chunks.push(value);}
   const buffer=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){buffer.set(chunk,offset);offset+=chunk.byteLength;}
   const text=new TextDecoder().decode(buffer);
   const {username,password,captchaToken}=JSON.parse(text);
   const name=String(username||'').trim().toLowerCase();
   if(!/^[a-z0-9_]{3,24}$/.test(name)||typeof password!=='string'||password.length>256||!captchaToken)return reply(400,{error:'Unable to sign in'});
   // Global limit bounds cardinality; username limit also applies to nonexistent names.
   if(!await consume(await hash('core-login-global'),300)||!await consume(await hash('core-login-name:'+name),10))return reply(429,{error:'Try again later'});
   const email=await resolveEmail(name);
   // Always exercise Auth password verification; never return a resolved email.
   const result=await authenticate(email||'core-unavailable@invalid.example',password,captchaToken);
   if(!email||result.error||!result.data?.session)throw Error('LOGIN_FAILED');
   const session=result.data.session;
   return reply(200,{access_token:session.access_token,refresh_token:session.refresh_token});
  }catch{return reply(400,{error:'Unable to sign in'});}
  finally{await pause(Math.max(0,500-(now()-started)));}
 };
}
