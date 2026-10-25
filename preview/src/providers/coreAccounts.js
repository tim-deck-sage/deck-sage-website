import {createClient} from '@supabase/supabase-js';
import {signupFields} from './coreAccess';
import {validateState} from '../model';

export function createCoreBackend(config,clientOverride){
 // Never reuse the old usernameOnlyReady deployment setting.
 if(config?.secureAccountsReady!==true)return null;
 const origin=new URL(config.url).origin;
 if(!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(origin)||!config.publishableKey?.startsWith('sb_publishable_'))throw Error('Invalid account configuration');
 const client=clientOverride||createClient(origin,config.publishableKey,{auth:{storageKey:'deck-sage-core-auth-v2',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce'}});
 const unwrap=result=>{if(result.error)throw result.error;return result.data;};
 const redirect=new URL('/?accountCallback=1',location.origin).href;
 let cancellation=0;
 const api={
  async user(){const result=await client.auth.getUser();if(result.error){if(result.error.name==='AuthSessionMissingError'||result.error.status===401||result.error.status===403)return null;throw result.error;}const user=result.data.user;return user&&!user.is_anonymous&&user.email_confirmed_at?user:null;},
  subscribe(fn){const {data}=client.auth.onAuthStateChange((event,session)=>{setTimeout(()=>fn(event,session),0);});return()=>data.subscription.unsubscribe();},
  async signUp({username,password,email,zip,terms,privacy,captchaToken}){
   const fields=signupFields(username,zip);if(!terms||!privacy)throw Error('Accept the Terms and acknowledge the Privacy Policy.');
   if(password.length<12)throw Error('Choose a password with at least 12 characters.');
   // Profile fields are collected again after verification; do not persist ZIP in JWT metadata.
   unwrap(await client.auth.signUp({email:email.trim(),password,options:{emailRedirectTo:redirect,captchaToken}}));
   return fields;
  },
  async signIn(username,password,captchaToken){
   const generation=cancellation;
   const response=await fetch(origin+'/functions/v1/website-core-login',{method:'POST',headers:{'Content-Type':'application/json',apikey:config.publishableKey},body:JSON.stringify({username:username.trim().toLowerCase(),password,captchaToken})});
   if(!response.ok)throw Error('Unable to sign in. Check your details or try again later.');
   const tokens=await response.json();if(generation!==cancellation)throw Error('ACCOUNT_CHANGED');unwrap(await client.auth.setSession({access_token:tokens.access_token,refresh_token:tokens.refresh_token}));
   if(generation!==cancellation){await client.auth.signOut({scope:'local'});throw Error('ACCOUNT_CHANGED');}
  },
  async recover(email,captchaToken){unwrap(await client.auth.resetPasswordForEmail(email.trim(),{redirectTo:redirect,captchaToken}));},
  async resetPassword(password){if(password.length<12)throw Error('Choose at least 12 characters.');unwrap(await client.auth.updateUser({password}));},
  async endRecovery(){unwrap(await client.auth.signOut({scope:'global'}));},
  async signOut(){++cancellation;unwrap(await client.auth.signOut({scope:'local'}));},
  async load(expected){const user=await api.user();if(user?.id!==expected)throw Error('ACCOUNT_CHANGED');const [profile,workspace]=await Promise.all([client.from('ds_core_profiles').select('user_id,username,zip_code,policy_version').eq('user_id',expected).maybeSingle(),client.from('ds_core_workspaces').select('state,revision').eq('user_id',expected).maybeSingle()]);return {profile:unwrap(profile),workspace:unwrap(workspace)};},
  async onboard(username,zip,terms,privacy){signupFields(username,zip);unwrap(await client.rpc('ds_core_onboard',{p_username:username,p_zip:zip,p_terms:terms,p_privacy:privacy}));},
  async save(expected,state,revision,operation){const user=await api.user();if(user?.id!==expected)throw Error('ACCOUNT_CHANGED');return unwrap(await client.rpc('ds_core_save',{p_expected_user:expected,p_state:validateState(state),p_revision:revision,p_operation:operation}));},
 };
 return api;
}
