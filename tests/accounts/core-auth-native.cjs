// Real Supabase SDK, intercepted HTTP only. No live Auth users or email calls.
const assert=require('node:assert/strict'),esbuild=require('esbuild'),{createClient}=require('@supabase/supabase-js');
const build=esbuild.buildSync({stdin:{contents:"export {createCoreBackend} from './preview/src/providers/coreAccounts';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',write:false});const m={exports:{}};new Function('module','exports','require',build.outputFiles[0].text)(m,m.exports,require);const {createCoreBackend}=m.exports;
global.location={origin:'https://deck-sage.com',href:'https://deck-sage.com/#/account'};
const origin='https://mihmykgxbneuhlcxolzm.supabase.co',key='sb_publishable_fixture_only',config={secureAccountsReady:true,url:origin,publishableKey:key};
const A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',B='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const user=id=>({id,is_anonymous:false,email_confirmed_at:'2026-10-25T00:00:00Z',email:id+'@example.invalid'});
const token=id=>[Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({sub:id,exp:Math.floor(Date.now()/1000)+3600,iat:Math.floor(Date.now()/1000),aud:'authenticated',role:'authenticated'})).toString('base64url'),Buffer.from('fixture-not-a-live-signature').toString('base64url')].join('.');
const tokens={[A]:token(A),[B]:token(B)};
const deferred=()=>{let release;const promise=new Promise(resolve=>release=resolve);return {promise,release};};
const response=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
let checks=0;const pass=name=>{checks++;console.log('PASS NATIVE AUTH '+name);};
function fixture(seed){
 const calls=[],known=new Map([[tokens[A],user(A)],[tokens[B],user(B)]]);let holdUser,holdLogin,recoveryError=false;
 const storage=new Map(seed?[["native-session",JSON.stringify(seed)]]:[]);
 const fetchImpl=async(input,init={})=>{
  const url=new URL(typeof input==='string'?input:input.url),method=init.method||'GET',headers=new Headers(init.headers),bearer=headers.get('authorization')?.replace(/^Bearer /,'');
  const body=init.body?JSON.parse(init.body):null;calls.push({path:url.pathname,method,bearer,body,redirect:url.searchParams.get('redirect_to')});
  if(url.pathname==='/auth/v1/user'&&method==='GET'){
   if(holdUser){const hold=holdUser;holdUser=null;await hold.promise;}
   return known.has(bearer)?response(known.get(bearer)):response({msg:'Invalid JWT'},401);
  }
  if(url.pathname==='/auth/v1/user'&&method==='PUT')return known.has(bearer)?response(known.get(bearer)):response({},401);
  if(url.pathname==='/auth/v1/logout')return new Response(null,{status:204});
  if(url.pathname==='/auth/v1/signup')return response({user:user(A),session:null});
  if(url.pathname==='/auth/v1/recover')return recoveryError?response({msg:'Delivery unavailable'},500):response({});
  if(url.pathname==='/functions/v1/website-core-login'){if(holdLogin)await holdLogin.promise;return response({access_token:tokens[A],refresh_token:'fixture-refresh-a'});}
  if(url.pathname.startsWith('/rest/v1/rpc/'))return response(null);
  throw Error('Unexpected local fixture HTTP path: '+url.pathname);
 };
 const client=createClient(origin,key,{global:{fetch:fetchImpl},auth:{persistSession:true,autoRefreshToken:false,detectSessionInUrl:false,flowType:'pkce',storageKey:'native-session',storage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)}}});
 const api=createCoreBackend(config,client,{fetchImpl});
 return {api,client,calls,known,holdUser:hold=>{holdUser=hold;},holdLogin:hold=>{holdLogin=hold;},recoveryError:value=>{recoveryError=value;},set:async id=>{const result=await client.auth.setSession({access_token:tokens[id],refresh_token:'fixture-refresh-'+id});if(result.error)throw result.error;},close:()=>client.auth.stopAutoRefresh()};
}
(async()=>{
 const cached={access_token:token('forged-user'),refresh_token:'forged-refresh',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user:user('forged-user')};
 const forged=fixture(cached);assert.equal(await forged.api.user(),null);assert(forged.calls.some(c=>c.path==='/auth/v1/user'));assert.equal(forged.calls.filter(c=>c.path.startsWith('/rest')).length,0);await forged.close();pass('forged cached session requires actual GET /user verification and cannot load data');
 const f=fixture();await f.set(A);assert.equal((await f.api.identity()).user.id,A);pass('verified native SDK user and captured JWT subject agree');
 for(const bad of [{...user(A),is_anonymous:true},{...user(A),email_confirmed_at:null}]){f.known.set(tokens[A],bad);await assert.rejects(()=>f.api.identity(),/ACCOUNT_CHANGED/);}f.known.set(tokens[A],user(A));pass('anonymous and unconfirmed native Auth responses are rejected');
 const before=f.calls.length;await assert.rejects(()=>f.api.resetPassword('fixture-long-password',B),/ACCOUNT_CHANGED/);await assert.rejects(()=>f.api.onboard('fixture_b','00501',true,true,B),/ACCOUNT_CHANGED/);assert.equal(f.calls.slice(before).filter(c=>c.method==='PUT'||c.path.startsWith('/rest')).length,0);pass('wrong expected owner cannot update password or create a profile');
 const hold=deferred();f.holdUser(hold);const changing=f.api.resetPassword('fixture-long-password',A);await new Promise(resolve=>setTimeout(resolve,5));await f.set(B);hold.release();await assert.rejects(()=>changing,/ACCOUNT_CHANGED/);assert.equal(f.calls.filter(c=>c.method==='PUT').length,0);pass('account switch while verification is pending causes no password mutation');
 await f.set(A);await f.api.resetPassword('fixture-long-password',A);await f.api.endRecovery(A);const mutation=f.calls.find(c=>c.method==='PUT');assert.equal(mutation.bearer,tokens[A]);assert.deepEqual(mutation.body,{password:'fixture-long-password'});assert.equal(f.calls.find(c=>c.path==='/auth/v1/logout').bearer,tokens[A]);pass('reset and global revocation use the verified captured owner bearer');
 await f.api.onboard(' Fixture_A ','00501',true,true,A);const onboarding=f.calls.find(c=>c.path==='/rest/v1/rpc/ds_core_onboard');assert.deepEqual(onboarding.body,{p_expected_user:A,p_username:'fixture_a',p_zip:'00501',p_terms:true,p_privacy:true});assert.equal(onboarding.bearer,tokens[A]);pass('native SDK onboarding sends mandatory ZIP and expected owner to real RPC transport');
 const form={username:'fixture_a',zip:'00501',password:'fixture-long-password',email:'fixture@example.invalid',terms:true,privacy:true,captchaToken:'fixture-captcha'};
 await assert.rejects(()=>f.api.signUp({...form,zip:'501'}));await assert.rejects(()=>f.api.signUp({...form,terms:false}));await f.api.signUp(form);const signup=f.calls.find(c=>c.path==='/auth/v1/signup');assert.equal(signup.body.email,form.email);assert.equal(signup.body.password,form.password);assert.equal(JSON.stringify(signup.body).includes('00501'),false);assert.equal(signup.body.data?.zip_code,undefined);pass('native signup validates policy/ZIP and sends password only to Auth, with no ZIP metadata');
 await f.api.recover('fixture@example.invalid','fixture-captcha');f.recoveryError(true);await f.api.recover('unknown@example.invalid','fixture-captcha');const recovery=f.calls.find(c=>c.path==='/auth/v1/recover');const redirect=new URL(recovery.redirect);assert.equal(redirect.origin,'https://deck-sage.com');assert.equal(redirect.pathname,'/');assert.equal(redirect.searchParams.get('accountCallback'),'1');assert.equal(redirect.searchParams.has('next'),false);pass('recovery uses fixed PKCE redirect and opaque results even on delivery failure');
 const late=fixture(),loginHold=deferred();late.holdLogin(loginHold);const signingIn=late.api.signIn('fixture_a','fixture-long-password','fixture-captcha');await late.api.signOut();loginHold.release();await assert.rejects(()=>signingIn,/ACCOUNT_CHANGED/);assert.equal((await late.client.auth.getSession()).data.session,null);await late.close();pass('late login response after native logout cannot restore a session');
 await f.close();console.log(checks+' native SDK/HTTP proof groups passed. HTTP was intercepted; no live JWT signature or mailbox proof is claimed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
