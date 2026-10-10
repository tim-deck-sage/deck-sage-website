import {createClient} from '@supabase/supabase-js';
import {consentInput,POLICY_VERSION} from './accountPolicy';
import {validateState} from '../model';

// Shared username workspaces deliberately use the username as their only access
// key. They never read or migrate auth-owned ds_* rows or legacy app records.
export function createAccountBackend(config,clientOverride){
 if(!config?.usernameOnlyReady||!config?.url||!config?.publishableKey)return null;
 const url=new URL(config.url);
 if(url.protocol!=='https:'||!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url.origin)||!config.publishableKey.startsWith('sb_publishable_'))throw Error('Account configuration requires a Supabase HTTPS URL and publishable key.');
 const client=clientOverride||createClient(url.origin,config.publishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 function unwrap(result){if(result.error)throw result.error;return result.data;}
 const rpc=async(name,args)=>unwrap(await client.rpc(name,args));
 const normalize=result=>({...result,state:validateState(result.state),revision:Number(result.revision)||0});
 return {
  async open(username,terms,privacy){const input=consentInput(username,terms,privacy);return normalize(await rpc('ds_shared_open',{p_username:input.p_username,p_version:POLICY_VERSION,p_terms:true,p_privacy:true}));},
  async load(username){return normalize(await rpc('ds_shared_load',{p_username:username}));},
  async save(username,state,revision,operation){return normalize(await rpc('ds_shared_save',{p_username:username,p_state:validateState(state),p_revision:revision,p_operation:operation}));},
 };
}
