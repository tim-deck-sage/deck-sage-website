import {baseState,validateState} from '../model';
const copy=value=>structuredClone(value);
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
// All private account data stays in memory; guest storage is a separate boundary.
// Epoch checks discard late responses after logout/account changes.
export function createAccountWorkspace(guest,backend,{delay=700,uuid=()=>crypto.randomUUID(),recoveryStorage}={}){
 const recoveryKey='deck-sage-recovery-user';
 if(!recoveryStorage)try{recoveryStorage=globalThis.sessionStorage;}catch{}
 const recoveryOwner=()=>{try{return recoveryStorage?.getItem(recoveryKey);}catch{return null;}};
 const rememberRecovery=id=>{try{id?recoveryStorage?.setItem(recoveryKey,id):recoveryStorage?.removeItem(recoveryKey);}catch{}};
 let epoch=0,timer,unsubscribe,writing=false,operation=null,blocked=false;
 let snapshot={epoch:0,mode:'guest',state:guest.load(),user:null,revision:0,dirty:false,status:'Saved in this browser',error:'',conflict:null,recovery:false,profile:null};
 let base=copy(snapshot.state);const listeners=new Set();
 const emit=patch=>{snapshot={...snapshot,...patch};for(const fn of listeners)fn(snapshot);};
 const clear=()=>{clearTimeout(timer);operation=null;blocked=false;writing=false;};
 function schedule(){clearTimeout(timer);if(!blocked)timer=setTimeout(()=>sync(),delay);}
 async function transition(event,session){
  const id=session?.user?.id||null;
  if(id&&id===snapshot.user?.id&&snapshot.mode==='account'&&event!=='PASSWORD_RECOVERY')return;
  const current=++epoch;clear();base=baseState();
  emit({epoch:current,mode:id?'loading':'guest',state:id?baseState():guest.load(),user:null,revision:0,dirty:false,error:'',conflict:null,profile:null,status:id?'Checking account…':'Saved in this browser',recovery:event==='PASSWORD_RECOVERY'});
  if(!id){rememberRecovery(null);return;}
  try{
   const user=await backend.user();if(current!==epoch)return;
   if(!user||user.id!==id)throw Error('Your session needs a fresh login.');
   if(event==='PASSWORD_RECOVERY')rememberRecovery(id);
   else if(recoveryOwner()!==id)rememberRecovery(null);
   emit({recovery:event==='PASSWORD_RECOVERY'||recoveryOwner()===id});
   const data=await backend.load();if(current!==epoch)return;
   if(!data.profile||!data.consent){emit({mode:'onboarding',user,status:'Finish account setup',profile:data.profile});return;}
   if(!data.workspace)throw Error('Account collection is unavailable. Retry account loading.');
   base=validateState(data.workspace.state);
   emit({mode:'account',user,profile:data.profile,state:copy(base),revision:data.workspace.revision,status:'Synced to your account'});
  }catch(e){if(current===epoch)emit({mode:'locked',status:'Account unavailable',error:e.message});}
 }
 async function sync(){
  if(!backend||snapshot.mode!=='account'||!snapshot.dirty||writing||blocked)return;
  const current=epoch;writing=true;
  if(!operation)operation={id:uuid(),state:copy(snapshot.state),revision:snapshot.revision};
  const pending=operation;emit({status:'Saving…',error:''});
  try{
   const saved=await backend.save(pending.state,pending.revision,pending.id);if(current!==epoch)return;
   base=validateState(saved.state);operation=null;writing=false;
   const dirty=!equal(snapshot.state,pending.state);
   emit({revision:saved.revision,dirty,status:dirty?'Changes waiting to sync':'Synced to your account'});
   if(dirty)schedule();
  }catch(e){if(current!==epoch)return;writing=false;
   if(e.message?.includes('REVISION_CONFLICT')){
    blocked=true;operation=null;
    try{const remote=await backend.load();if(current===epoch)emit({conflict:remote.workspace,error:'Another session changed this collection. Export your pending changes, then choose which version to keep.',status:'Sync conflict'});}catch{if(current===epoch)emit({error:'Could not load the other version. Retry sync.',status:'Sync paused'});}
   }else emit({error:'Changes are still in memory. Export a backup before leaving, or retry sync. '+e.message,status:'Sync paused'});
  }
 }
 const api={
  getSnapshot:()=>snapshot,subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
  start(){if(!backend)return()=>{};unsubscribe=backend.subscribe((event,session)=>{void transition(event,session);});void backend.user().then(user=>{if(epoch===0)void transition('INITIAL_SESSION',user?{user}:null);}).catch(e=>{if(epoch===0)emit({mode:'locked',state:baseState(),error:e.message,status:'Session check failed'});});return()=>{++epoch;clear();unsubscribe?.();};},
  edit(value,expectedEpoch=epoch){if(expectedEpoch!==epoch)return;if(!['guest','account'].includes(snapshot.mode))throw Error('Finish account setup before editing your collection.');const state=validateState(typeof value==='function'?value(snapshot.state):value);if(snapshot.mode==='guest'){try{guest.save(state);emit({state,error:'',status:'Saved in this browser'});}catch{emit({state,error:'Browser storage is full. Export a backup before leaving.',status:'Guest save failed'});}}else{emit({state,dirty:true,status:'Changes waiting to sync'});schedule();}},
  retry:async()=>{if(snapshot.mode==='account'){blocked=false;return sync();}const user=await backend.user();return transition('RETRY',user?{user}:null);},
  async onboard(username,terms,privacy){const current=epoch;await backend.onboard(username,terms,privacy);if(current===epoch)return transition('ONBOARDED',{user:snapshot.user});},
  async logout(){++epoch;clear();rememberRecovery(null);emit({epoch,mode:'locked',state:baseState(),user:null,profile:null,dirty:false,conflict:null,recovery:false,status:'Signing out…',error:''});try{await backend.signOut();await transition('SIGNED_OUT',null);}catch(e){emit({status:'Sign out failed',error:'Your account is hidden. Retry sign out to finish. '+e.message});throw e;}},
  async importGuest(){if(snapshot.mode!=='account'||snapshot.dirty||writing)throw Error('Sync your account changes before importing.');const current=epoch;blocked=true;emit({mode:'importing',status:'Importing browser collection…'});try{const saved=await backend.importGuest(guest.load(),snapshot.revision);if(current!==epoch)return;blocked=false;base=validateState(saved.state);emit({mode:'account',state:copy(base),revision:saved.revision,status:'Browser collection imported',error:''});}catch(e){if(current===epoch){blocked=false;emit({mode:'account',error:e.message,status:'Import paused'});}throw e;}},
  resolveConflict(keepLocal){if(!snapshot.conflict)throw Error('Retry loading the conflicting version first.');base=validateState(snapshot.conflict.state);operation=null;blocked=false;emit({state:keepLocal?snapshot.state:copy(base),revision:snapshot.conflict.revision,dirty:keepLocal,conflict:null,error:'',status:keepLocal?'Changes waiting to sync':'Loaded account version'});if(keepLocal)schedule();},
  exportGuest:()=>copy(guest.load()),sync,
  async resetPassword(password){await backend.resetPassword(password);rememberRecovery(null);emit({recovery:false});},
 };
 return api;
}
