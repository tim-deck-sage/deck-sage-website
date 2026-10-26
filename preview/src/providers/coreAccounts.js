import {createClient} from '@supabase/supabase-js';
import {createBrowserSessionStorage} from './browserSessionStorage';
import {signupFields} from './coreAccess';
import {validateState} from '../model';
export function createCoreBackend(config,clientOverride,{fetchImpl=globalThis.fetch,now=Date.now}={}){
 if(config?.secureAccountsReady!==true)return null;
 const origin=new URL(config.url).origin;
 if(!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(origin)||!config.publishableKey?.startsWith('sb_publishable_'))throw Error('Invalid account configuration');
 const callback=new URL(location.href||location.origin),fragment=new URLSearchParams(callback.hash.slice(1));
 const fragmentAuth=['access_token','refresh_token','error','error_code','error_description'].some(key=>fragment.has(key));
 const callbackIntent=callback.pathname==='/'&&(callback.searchParams.has('code')||callback.searchParams.has('accountCallback')||['error','error_code','error_description'].some(key=>callback.searchParams.has(key))||fragmentAuth);
 // The marker is UI metadata, not PKCE proof. Supabase requires the stored verifier.
 const callbackReady=callback.pathname==='/'&&!fragmentAuth&&callback.searchParams.getAll('code').length===1&&Boolean(callback.searchParams.get('code'));
 let callbackFailed=callbackIntent&&!callbackReady;
 const clearCallback=failed=>{try{
  const clean=new URL(location.href||location.origin),previousHash=clean.hash;
  for(const key of ['code','accountCallback','error','error_code','error_description','access_token','refresh_token','expires_in','expires_at','token_type','type','provider_token','provider_refresh_token'])clean.searchParams.delete(key);
  if(fragmentAuth||(failed&&clean.hash!=='#/reset-password'))clean.hash='/account';
  globalThis.history?.replaceState(globalThis.history.state,'',clean.pathname+clean.search+clean.hash);
  if(clean.hash!==previousHash)globalThis.dispatchEvent?.(new Event('hashchange'));
 }catch{}};
 if(callbackFailed)clearCallback(true);
 // Retire only the previous SDK credential entries; preserve every collection/cache.
 if(!clientOverride)try{localStorage.removeItem('deck-sage-core-auth-v2');localStorage.removeItem('deck-sage-core-auth-v2-code-verifier');}catch{}
 const client=clientOverride||createClient(origin,config.publishableKey,{global:{fetch:fetchImpl},auth:{storageKey:'deck-sage-core-auth-v2',persistSession:true,storage:createBrowserSessionStorage(),autoRefreshToken:true,detectSessionInUrl:callbackReady,flowType:'pkce'}});
 // initialize() reuses the SDK's automatic initialization promise; never exchange twice.
 const callbackInitialization=callbackReady?client.auth.initialize().then(async result=>{
  const session=(await client.auth.getSession()).data?.session;
  callbackFailed=Boolean(result.error||!session);
  clearCallback(callbackFailed);
 }).catch(()=>{callbackFailed=true;clearCallback(true);}):Promise.resolve();
 const unwrap=result=>{if(result.error)throw result.error;return result.data;};
 const redirect=new URL('/?accountCallback=1',location.origin).href;
 let cancellation=0;
 const changed=()=>Error('ACCOUNT_CHANGED');
 // The cached session only supplies a token. Auth verifies that exact token.
 async function capture(expected){
  await callbackInitialization;
  const generation=cancellation,session=unwrap(await client.auth.getSession()).session;
  if(!session?.access_token)throw Error('AUTHENTICATION_REQUIRED');
  const user=unwrap(await client.auth.getUser(session.access_token)).user;
  if(generation!==cancellation)throw changed();
  if(unwrap(await client.auth.getSession()).session?.access_token!==session.access_token)throw changed();
  if(!user?.id||user.is_anonymous!==false||!user.email_confirmed_at||user.id!==session.user?.id||(expected&&user.id!==expected))throw changed();
  let claims;try{claims=JSON.parse(atob(session.access_token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));}catch{throw changed();}
  if(claims.sub!==user.id||!Number.isFinite(claims.exp)||claims.exp*1000<=now())throw Error('AUTHENTICATION_REQUIRED');
  callbackFailed=false;return {user,token:session.access_token,expiresAt:claims.exp*1000,generation};
 }
 const dataClient=token=>createClient(origin,config.publishableKey,{accessToken:async()=>token,global:{fetch:fetchImpl},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 async function authRequest(method,path,expected,body){
  const identity=await capture(expected);if(identity.generation!==cancellation)throw changed();
  // Native Auth REST operations with the captured owner's bearer. No custom password storage.
  const response=await fetchImpl(origin+'/auth/v1/'+path,{method,headers:{apikey:config.publishableKey,Authorization:'Bearer '+identity.token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  if(!response.ok)throw Error('AUTHENTICATION_REQUIRED');
  if(identity.generation!==cancellation)throw changed();
 }
 const api={
  async identity(){try{return await capture();}catch(error){if(error.name==='AuthSessionMissingError'||error.status===401||error.status===403||error.message==='AUTHENTICATION_REQUIRED')return {user:null,callbackError:callbackFailed?'The email link could not finish signing you in. Use your email and password to continue, or request a new recovery link.':''};throw error;}},
  async user(){return (await api.identity()).user;},
  subscribe(fn){let active=true;const {data}=client.auth.onAuthStateChange((event,session)=>{if(active)fn(event,session);});return()=>{active=false;data.subscription.unsubscribe();};},
  async signUp({username,password,email,zip,terms,privacy,captchaToken}){
   const fields=signupFields(username,zip);if(!terms||!privacy)throw Error('CONSENT_REQUIRED');
   if(password.length<12||password.length>256||!captchaToken)throw Error('SIGNUP_UNAVAILABLE');
   const result=unwrap(await client.auth.signUp({email:email.trim(),password,options:{emailRedirectTo:redirect,captchaToken}}));if(result.session){await api.signOut();throw Error('EMAIL_VERIFICATION_REQUIRED');}return fields;
  },
  async signIn(username,password,captchaToken){
   const generation=cancellation;
   if(!captchaToken||typeof username!=='string'||username.length>254||typeof password!=='string'||password.length>256)throw Error('SIGNIN_UNAVAILABLE');
   if(username.includes('@')){
    const result=await client.auth.signInWithPassword({email:username.trim(),password,options:{captchaToken}});
    if(result.error)throw Error('SIGNIN_UNAVAILABLE');
    if(generation!==cancellation){await client.auth.signOut({scope:'local'});throw changed();}await capture();return;
   }
   const response=await fetchImpl(origin+'/functions/v1/website-core-login',{method:'POST',headers:{'Content-Type':'application/json',apikey:config.publishableKey},body:JSON.stringify({username:username.trim().toLowerCase(),password,captchaToken})});
   if(!response.ok)throw Error('SIGNIN_UNAVAILABLE');const tokens=await response.json();if(generation!==cancellation)throw changed();
   unwrap(await client.auth.setSession({access_token:tokens.access_token,refresh_token:tokens.refresh_token}));
   if(generation!==cancellation){await client.auth.signOut({scope:'local'});throw changed();}await capture();
  },
  async recover(email,captchaToken){if(!captchaToken)throw Error('RECOVERY_UNAVAILABLE');try{await client.auth.resetPasswordForEmail(email.trim(),{redirectTo:redirect,captchaToken});}catch{}},
  async resetPassword(password,expected){if(!expected||password.length<12||password.length>256)throw Error('RECOVERY_UNAVAILABLE');await authRequest('PUT','user',expected,{password});},
  async endRecovery(expected){if(!expected)throw changed();await authRequest('POST','logout?scope=global',expected);},
  async signOut(){++cancellation;unwrap(await client.auth.signOut({scope:'local'}));},
  async load(expected){const identity=await capture(expected),scoped=dataClient(identity.token);const [profile,workspace]=await Promise.all([scoped.from('ds_core_profiles').select('user_id,username,zip_code,policy_version').eq('user_id',expected).maybeSingle(),scoped.from('ds_core_workspaces').select('state,revision').eq('user_id',expected).maybeSingle()]);if(identity.generation!==cancellation)throw changed();return {profile:unwrap(profile),workspace:unwrap(workspace)};},
  async onboard(username,zip,terms,privacy,expected){if(!expected)throw changed();const fields=signupFields(username,zip),identity=await capture(expected);unwrap(await dataClient(identity.token).rpc('ds_core_onboard',{p_expected_user:expected,p_username:fields.username,p_zip:fields.zip_code,p_terms:terms,p_privacy:privacy}));if(identity.generation!==cancellation)throw changed();},
  async save(expected,state,revision,operation){const identity=await capture(expected);const result=unwrap(await dataClient(identity.token).rpc('ds_core_save',{p_expected_user:expected,p_state:validateState(state),p_revision:revision,p_operation:operation}));if(identity.generation!==cancellation)throw changed();return result;},
 };return api;
}
