import {createClient} from '@supabase/supabase-js';
import {signupFields} from './coreAccess';
import {validateState} from '../model';
export function createCoreBackend(config,clientOverride,{fetchImpl=globalThis.fetch,now=Date.now}={}){
 if(config?.secureAccountsReady!==true)return null;
 const origin=new URL(config.url).origin;
 if(!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(origin)||!config.publishableKey?.startsWith('sb_publishable_'))throw Error('Invalid account configuration');
 const callback=new URL(location.href||location.origin),callbackReady=callback.searchParams.get('accountCallback')==='1'&&callback.searchParams.has('code');
 const client=clientOverride||createClient(origin,config.publishableKey,{global:{fetch:fetchImpl},auth:{storageKey:'deck-sage-core-auth-v2',persistSession:true,autoRefreshToken:true,detectSessionInUrl:callbackReady,flowType:'pkce'}});
 const unwrap=result=>{if(result.error)throw result.error;return result.data;};
 const redirect=new URL('/?accountCallback=1',location.origin).href;
 let cancellation=0;
 const changed=()=>Error('ACCOUNT_CHANGED');
 // The cached session only supplies a token. Auth verifies that exact token.
 async function capture(expected){
  const generation=cancellation,session=unwrap(await client.auth.getSession()).session;
  if(!session?.access_token)throw Error('AUTHENTICATION_REQUIRED');
  const user=unwrap(await client.auth.getUser(session.access_token)).user;
  if(generation!==cancellation)throw changed();
  if(unwrap(await client.auth.getSession()).session?.access_token!==session.access_token)throw changed();
  if(!user?.id||user.is_anonymous!==false||!user.email_confirmed_at||user.id!==session.user?.id||(expected&&user.id!==expected))throw changed();
  let claims;try{claims=JSON.parse(atob(session.access_token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));}catch{throw changed();}
  if(claims.sub!==user.id||!Number.isFinite(claims.exp)||claims.exp*1000<=now())throw Error('AUTHENTICATION_REQUIRED');
  return {user,token:session.access_token,expiresAt:claims.exp*1000,generation};
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
  async identity(){try{return await capture();}catch(error){if(error.name==='AuthSessionMissingError'||error.status===401||error.status===403||error.message==='AUTHENTICATION_REQUIRED')return {user:null};throw error;}},
  async user(){return (await api.identity()).user;},
  subscribe(fn){let active=true;const {data}=client.auth.onAuthStateChange((event,session)=>{if(active)fn(event,session);});return()=>{active=false;data.subscription.unsubscribe();};},
  async signUp({username,password,email,zip,terms,privacy,captchaToken}){
   const fields=signupFields(username,zip);if(!terms||!privacy)throw Error('CONSENT_REQUIRED');
   if(password.length<12||password.length>256||!captchaToken)throw Error('SIGNUP_UNAVAILABLE');
   const result=unwrap(await client.auth.signUp({email:email.trim(),password,options:{emailRedirectTo:redirect,captchaToken}}));if(result.session){await api.signOut();throw Error('EMAIL_VERIFICATION_REQUIRED');}return fields;
  },
  async signIn(username,password,captchaToken){
   const generation=cancellation;
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
