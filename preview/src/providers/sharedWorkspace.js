import {baseState,validateState} from '../model';
const copy=value=>structuredClone(value);
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

// A shared username is an intentionally public capability: knowing the normalized
// name grants access to that one workspace. The name is remembered only for
// convenience; authority comes from entering it, never from browser identity.
export function createSharedWorkspace(guest,backend,{delay=700,uuid=()=>crypto.randomUUID(),nameStorage}={}){
 const nameKey='deck-sage-shared-username-v1';
 if(!nameStorage)try{nameStorage=globalThis.localStorage;}catch{}
 const remembered=()=>{try{return nameStorage?.getItem(nameKey)||'';}catch{return '';}};
 const remember=name=>{try{name?nameStorage?.setItem(nameKey,name):nameStorage?.removeItem(nameKey);}catch{}};
 const guestStatus=backend?'Username required':'Saved in this browser';
 let epoch=0,timer,writing=false,operation=null,blocked=false;
 let snapshot={epoch:0,mode:'guest',state:guest.load(),username:'',revision:0,dirty:false,status:guestStatus,error:'',conflict:null,profile:null,recovery:false};
 let base=copy(snapshot.state);const listeners=new Set();
 const emit=patch=>{snapshot={...snapshot,...patch};for(const fn of listeners)fn(snapshot);};
 const clear=()=>{clearTimeout(timer);operation=null;writing=false;blocked=false;};
 const schedule=()=>{clearTimeout(timer);if(!blocked)timer=setTimeout(()=>{void sync().catch(()=>{});},delay);};
 function enter(result,status='Shared collection opened'){
  base=validateState(result.state);remember(result.username);
  emit({mode:'account',username:result.username,profile:{username:result.username},state:copy(base),revision:result.revision,dirty:false,error:'',conflict:null,status});
 }
 async function load(name,status){
  const current=++epoch;clear();emit({epoch:current,mode:'loading',state:baseState(),username:name||'',profile:null,dirty:false,error:'',conflict:null,status:'Opening shared collection'});
  try{const result=await backend.load(name);if(current===epoch)enter(result,status);return result;}
  catch(e){if(current===epoch)emit({mode:'guest',state:guest.load(),username:'',profile:null,status:guestStatus,error:e.message.includes('USERNAME_NOT_FOUND')?'That shared username no longer exists.':e.message});remember('');throw e;}
 }
 async function sync(){
  if(!backend||snapshot.mode!=='account'||!snapshot.dirty||writing||blocked)return;
  const current=epoch;writing=true;
  if(!operation)operation={id:uuid(),state:copy(snapshot.state),revision:snapshot.revision,username:snapshot.username};
  const pending=operation;emit({status:'Saving shared collection…',error:''});
  try{const saved=await backend.save(pending.username,pending.state,pending.revision,pending.id);if(current!==epoch)return;base=validateState(saved.state);operation=null;writing=false;const dirty=!equal(snapshot.state,pending.state);emit({revision:saved.revision,dirty,status:dirty?'Changes waiting to sync':'Shared collection synced'});if(dirty)schedule();return saved;}
  catch(e){if(current!==epoch)return;writing=false;if(e.message?.includes('REVISION_CONFLICT')){blocked=true;operation=null;try{const remote=await backend.load(pending.username);if(current===epoch)emit({conflict:remote,error:'Another browser changed this collection. Export your pending changes, then choose which version to keep.',status:'Sync conflict'});}catch{if(current===epoch)emit({error:'Could not load the other version. Retry sync.',status:'Sync paused'});}}else emit({error:'Changes are still in memory. Export a backup before leaving, or retry sync. '+e.message,status:'Sync paused'});throw e;}
 }
 async function commitAtomic(transform,{operationId=uuid(),retries=2,retryDelay=120}={}){
  if(!backend||snapshot.mode!=='account')throw Error('SHARED_USERNAME_REQUIRED');
  if(snapshot.dirty||writing||blocked||snapshot.conflict)throw Error('SYNC_NOT_READY');
  const current=epoch,username=snapshot.username,revision=snapshot.revision,before=copy(snapshot.state);
  const next=validateState(transform(copy(before)));
  writing=true;emit({state:next,dirty:true,status:'Saving confirmed deck.',error:''});
  let lastError;
  for(let attempt=0;attempt<=retries;attempt+=1){
   try{const saved=await backend.save(username,next,revision,operationId);if(current!==epoch)throw Error('ACCOUNT_CHANGED');base=validateState(saved.state);writing=false;emit({state:copy(base),revision:saved.revision,dirty:false,status:'Shared collection synced',error:''});return saved;}
   catch(error){lastError=error;if(current!==epoch){writing=false;throw error;}if(error.message?.includes('REVISION_CONFLICT'))break;if(attempt<retries)await new Promise(resolve=>setTimeout(resolve,retryDelay*(attempt+1)));}
  }
  try{const remote=await backend.load(username);if(current!==epoch)throw Error('ACCOUNT_CHANGED');if(equal(validateState(remote.state),next)){base=validateState(remote.state);writing=false;emit({state:copy(base),revision:remote.revision,dirty:false,status:'Shared collection synced',error:''});return remote;}if(lastError?.message?.includes('REVISION_CONFLICT')){blocked=true;emit({state:before,revision,dirty:false,conflict:remote,error:'Another browser changed this collection before the deck was confirmed. Review the refreshed collection and try again.',status:'Sync conflict'});}else emit({state:before,revision,dirty:false,error:'The confirmed deck was not saved. Your collection is unchanged. '+lastError.message,status:'Save failed'});
  }catch(loadError){emit({state:before,revision,dirty:false,error:'The confirmed deck could not be verified as saved. Reload this username before trying again. '+loadError.message,status:'Save unverified'});}
  writing=false;throw lastError||Error('SAVE_FAILED');
 }
 const api={
  getSnapshot:()=>snapshot,
  subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
  start(){if(!backend)return()=>{};const name=remembered();if(name)void load(name,'Shared collection restored').catch(()=>{});return()=>{++epoch;clear();};},
  edit(value,expectedEpoch=epoch){if(expectedEpoch!==epoch)return;if(!['guest','account'].includes(snapshot.mode))throw Error('Open a username before editing its collection.');const state=validateState(typeof value==='function'?value(snapshot.state):value);if(snapshot.mode==='guest'){try{guest.save(state);emit({state,error:'',status:'Saved in this browser'});}catch{emit({state,error:'Browser storage is full. Export a backup before leaving.',status:'Guest save failed'});}}else{emit({state,dirty:true,status:'Changes waiting to sync'});schedule();}},
  retry:async()=>{if(snapshot.mode==='account'){blocked=false;return snapshot.dirty?sync():load(snapshot.username,'Shared collection refreshed');}const name=remembered();if(name)return load(name,'Shared collection restored');},
  async registerUsername(username,terms,privacy){if(!backend)throw Error('Username service is not connected.');if(snapshot.mode==='account'&&(snapshot.dirty||writing||snapshot.conflict))throw Error('UNSAVED_SHARED_CHANGES');const current=++epoch;clear();emit({epoch:current,mode:'loading',state:baseState(),username:'',profile:null,status:'Creating shared username',error:'',conflict:null});try{const result=await backend.register(username,terms,privacy);if(current===epoch)enter(result,'Shared username created');return result;}catch(e){if(current===epoch)emit({mode:'guest',state:guest.load(),username:'',profile:null,status:'Username required',error:e.message});throw e;}},
  async signInUsername(username){if(!backend)throw Error('Username service is not connected.');if(snapshot.mode==='account'&&(snapshot.dirty||writing||snapshot.conflict))throw Error('UNSAVED_SHARED_CHANGES');const current=++epoch;clear();emit({epoch:current,mode:'loading',state:baseState(),username:'',profile:null,status:'Signing in',error:'',conflict:null});try{const result=await backend.signIn(username);if(current===epoch)enter(result,'Shared username signed in');return result;}catch(e){if(current===epoch)emit({mode:'guest',state:guest.load(),username:'',profile:null,status:'Username required',error:e.message});throw e;}},
  createUsername(username,terms,privacy){return api.registerUsername(username,terms,privacy);},
  onboard(username,terms,privacy){return api.registerUsername(username,terms,privacy);},
  async logout({discard=false}={}){if((snapshot.dirty||writing||snapshot.conflict)&&!discard)throw Error('UNSAVED_SHARED_CHANGES');++epoch;clear();remember('');base=guest.load();emit({epoch,mode:'guest',state:copy(base),username:'',profile:null,revision:0,dirty:false,error:'',conflict:null,status:guestStatus});},
  async importGuest(){if(snapshot.mode!=='account'||snapshot.dirty||writing)throw Error('Sync shared changes before importing.');if(snapshot.revision!==0)throw Error('Import is available only before this shared workspace has been changed.');const current=epoch;blocked=true;emit({mode:'importing',status:'Importing browser collection'});try{const saved=await backend.save(snapshot.username,guest.load(),snapshot.revision,uuid());if(current!==epoch)return;blocked=false;enter(saved,'Browser collection imported');return saved;}catch(e){if(current===epoch){blocked=false;emit({mode:'account',error:e.message,status:'Import paused'});}throw e;}},
  resolveConflict(keepLocal){if(!snapshot.conflict)throw Error('Retry loading the conflicting version first.');base=validateState(snapshot.conflict.state);operation=null;blocked=false;emit({state:keepLocal?snapshot.state:copy(base),revision:snapshot.conflict.revision,dirty:keepLocal,conflict:null,error:'',status:keepLocal?'Changes waiting to sync':'Loaded other browser version'});if(keepLocal)schedule();},
  exportGuest:()=>copy(guest.load()),sync,commitAtomic,
 };
 return api;
}
