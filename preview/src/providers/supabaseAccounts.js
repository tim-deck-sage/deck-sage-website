import {createClient} from '@supabase/supabase-js';
import {consentInput,POLICY_VERSION} from './accountPolicy';
import {validateState} from '../model';
export function createAccountBackend(config,clientOverride){
 if(!config?.url||!config?.publishableKey)return null;
 const url=new URL(config.url);
 if(url.protocol!=='https:'||!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url.origin)||!config.publishableKey.startsWith('sb_publishable_'))throw Error('Account configuration requires a Supabase HTTPS URL and publishable key.');
 const client=clientOverride||createClient(url.origin,config.publishableKey,{auth:{flowType:'pkce',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'deck-sage-auth-v1'}});
 const callback=()=>location.origin+'/?accountCallback=1';
 function unwrap(result){if(result.error)throw result.error;return result.data;}
 const rpc=async(name,args)=>unwrap(await client.rpc(name,args));
 return {
  subscribe(fn){const {data}=client.auth.onAuthStateChange((event,session)=>fn(event,session));return()=>data.subscription.unsubscribe();},
  async user(){const result=await client.auth.getUser();if(result.error?.name==='AuthSessionMissingError')return null;return unwrap(result)?.user||null;},
  async signUp(email,password,username,terms,privacy){const input=consentInput(username,terms,privacy);return unwrap(await client.auth.signUp({email:email.trim(),password,options:{emailRedirectTo:callback(),data:{username:input.p_username}}}));},
  async signIn(email,password){return unwrap(await client.auth.signInWithPassword({email:email.trim(),password}));},
  async signOut(){unwrap(await client.auth.signOut({scope:'local'}));},
  async recover(email){unwrap(await client.auth.resetPasswordForEmail(email.trim(),{redirectTo:callback()}));},
  async resetPassword(password,expectedUser){
   // Freeze the initiating session: shared SDK deferred token acquisition must
   // never change another account's password after an account switch.
   const session=unwrap(await client.auth.getSession())?.session;
   if(!expectedUser||session?.user?.id!==expectedUser)throw Error('ACCOUNT_CHANGED');
   const token=session.access_token;
   const verified=unwrap(await client.auth.getUser(token))?.user;
   if(verified?.id!==expectedUser)throw Error('ACCOUNT_CHANGED');
   const response=await fetch(url.origin+'/auth/v1/user',{method:'PUT',headers:{apikey:config.publishableKey,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({password})});
   const data=await response.json();if(!response.ok)throw Error(data.msg||data.message||'Password update failed.');
  },
  async load(expectedUser){if(!expectedUser)throw Error('ACCOUNT_REQUIRED');const [profile,consents,workspace]=await Promise.all([
   client.from('ds_profiles').select('username').eq('user_id',expectedUser).maybeSingle(),
   client.from('ds_consents').select('policy_version,accepted_at').eq('user_id',expectedUser).eq('policy_version',POLICY_VERSION).maybeSingle(),
   client.from('ds_workspaces').select('revision,state').eq('user_id',expectedUser).maybeSingle(),
  ]);return {profile:unwrap(profile),consent:unwrap(consents),workspace:unwrap(workspace)};},
  async onboard(username,terms,privacy,expectedUser){if(!expectedUser)throw Error('ACCOUNT_REQUIRED');return rpc('ds_finish_onboarding',{p_expected_user:expectedUser,...consentInput(username,terms,privacy)});},
  async save(state,revision,operation,expectedUser){if(!expectedUser)throw Error('ACCOUNT_REQUIRED');return rpc('ds_save_workspace',{p_expected_user:expectedUser,p_state:validateState(state),p_revision:revision,p_operation:operation});},
  async importGuest(state,revision,expectedUser){if(!expectedUser)throw Error('ACCOUNT_REQUIRED');return rpc('ds_import_guest',{p_expected_user:expectedUser,p_state:validateState(state),p_revision:revision});},
 };
}
