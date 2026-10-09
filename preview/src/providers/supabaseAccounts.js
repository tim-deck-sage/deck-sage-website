import {createClient} from '@supabase/supabase-js';
import {consentInput,POLICY_VERSION} from './accountPolicy';
import {validateState} from '../model';
export function createAccountBackend(config,clientOverride){
 if(!config?.usernameOnlyReady||!config?.url||!config?.publishableKey)return null;
 const url=new URL(config.url);
 if(url.protocol!=='https:'||!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url.origin)||!config.publishableKey.startsWith('sb_publishable_'))throw Error('Account configuration requires a Supabase HTTPS URL and publishable key.');
 const client=clientOverride||createClient(url.origin,config.publishableKey,{auth:{flowType:'pkce',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storageKey:'deck-sage-browser-auth-v2'}});
 function unwrap(result){if(result.error)throw result.error;return result.data;}
 const rpc=async(name,args)=>unwrap(await client.rpc(name,args));
 return {
  subscribe(fn){const {data}=client.auth.onAuthStateChange((event,session)=>fn(event,session));return()=>data.subscription.unsubscribe();},
  async user(){const result=await client.auth.getUser();if(result.error?.name==='AuthSessionMissingError')return null;return unwrap(result)?.user||null;},
  async openBrowserSession(username,terms,privacy){
   consentInput(username,terms,privacy);
   const existing=await this.user();
   if(existing)return existing;
   return unwrap(await client.auth.signInAnonymously())?.user;
  },
  async signOut(){unwrap(await client.auth.signOut({scope:'local'}));},
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
