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
 let epoch=0,timer,writing=false,operation=null,blocked=false;
 let snapshot={epoch:0,mode:'guest',state:guest.load(),username:'',revision:0,dirty:false,status:'Saved in this browser',error:'',conflict:null,profile:null,recovery:false};
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
  catch(e){if(current===epoch)emit({mode:'guest',state:guest.load(),username:'',profile:null,status:'Saved in this browser',error:e.message.includes('USERNAME_NOT_FOUND')?'That shared username no longer exists.':e.message});remember('');throw e;}
 }
 async function sync(){
  if(!backend||snapshot.mode!=='account'||!snapshot.dirty||writing||blocked)return;
  const current=epoch;writing=true;
  if(!operation)operation={id:uuid(),state:copy(snapshot.state),revision:snapshot.revision,username:snapshot.username};
  const pending=operation;emit({status:'Saving shared collection…',error:''});
  try{const saved=await backend.save(pending.username,pending.state,pending.revision,pending.id);if(current!==epoch)return;base=validateState(saved.state);operation=null;writing=false;const dirty=!equal(snapshot.state,pending.state);emit({revision:saved.revision,dirty,status:dirty?'Changes waiting to sync':'Shared collection synced'});if(dirty)schedule();return saved;}
  catch(e){if(current!==epoch)return;writing=false;if(e.message?.includes('REVISION_CONFLICT')){blocked=true;operation=null;try{const remote=await backend.load(pending.username);if(current===epoch)emit({conflict:remote,error:'Another browser changed this collection. Export your pending changes, then choose which version to keep.',status:'Sync conflict'});}catch{if(current===epoch)emit({error:'Could not load the other version. Retry sync.',status:'Sync paused'});}}else emit({error:'Changes are still in memory. Export a backup before leaving, or retry sync. '+e.message,status:'Sync paused'});throw e;}
 }
 const api={
  getSnapshot:()=>snapshot,
  subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
  start(){if(!backend)return()=>{};const name=remembered();if(name)void load(name,'Shared collection restored').catch(()=>{});return()=>{++epoch;clear();};},
  edit(value,expectedEpoch=epoch){if(expectedEpoch!==epoch)return;if(!['guest','account'].includes(snapshot.mode))throw Error('Open a username before editing its collection.');const state=validateState(typeof value==='function'?value(snapshot.state):value);if(snapshot.mode==='guest'){try{guest.save(state);emit({state,error:'',status:'Saved in this browser'});}catch{emit({state,error:'Browser storage is full. Export a backup before leaving.',status:'Guest save failed'});}}else{emit({state,dirty:true,status:'Changes waiting to sync'});schedule();}},
  retry:async()=>{if(snapshot.mode==='account'){blocked=false;return snapshot.dirty?sync():load(snapshot.username,'Shared collection refreshed');}const name=remembered();if(name)return load(name,'Shared collection restored');},
  async createUsername(username,terms,privacy){if(!backend)throw Error('Username service is not connected.');if(snapshot.mode==='account'&&(snapshot.dirty||writing||snapshot.conflict))throw Error('UNSAVED_SHARED_CHANGES');const current=++epoch;clear();emit({epoch:current,mode:'loading',state:baseState(),username:'',profile:null,status:'Opening shared collection',error:'',conflict:null});try{const result=await backend.open(username,terms,privacy);if(current===epoch)enter(result,result.created?'Shared username created':'Existing shared username opened');return result;}catch(e){if(current===epoch)emit({mode:'guest',state:guest.load(),status:'Saved in this browser',error:e.message});throw e;}},
  onboard(username,terms,privacy){return api.createUsername(username,terms,privacy);},
  async logout({discard=false}={}){if((snapshot.dirty||writing||snapshot.conflict)&&!discard)throw Error('UNSAVED_SHARED_CHANGES');++epoch;clear();remember('');base=guest.load();emit({epoch,mode:'guest',state:copy(base),username:'',profile:null,revision:0,dirty:false,error:'',conflict:null,status:'Saved in this browser'});},
  async importGuest(){if(snapshot.mode!=='account'||snapshot.dirty||writing)throw Error('Sync shared changes before importing.');if(snapshot.revision!==0)throw Error('Import is available only before this shared workspace has been changed.');const current=epoch;blocked=true;emit({mode:'importing',status:'Importing browser collection'});try{const saved=await backend.save(snapshot.username,guest.load(),snapshot.revision,uuid());if(current!==epoch)return;blocked=false;enter(saved,'Browser collection imported');return saved;}catch(e){if(current===epoch){blocked=false;emit({mode:'account',error:e.message,status:'Import paused'});}throw e;}},
  resolveConflict(keepLocal){if(!snapshot.conflict)throw Error('Retry loading the conflicting version first.');base=validateState(snapshot.conflict.state);operation=null;blocked=false;emit({state:keepLocal?snapshot.state:copy(base),revision:snapshot.conflict.revision,dirty:keepLocal,conflict:null,error:'',status:keepLocal?'Changes waiting to sync':'Loaded other browser version'});if(keepLocal)schedule();},
  exportGuest:()=>copy(guest.load()),sync,
 };
 return api;
}
