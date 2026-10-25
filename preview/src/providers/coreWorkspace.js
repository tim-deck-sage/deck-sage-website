import {baseState,validateState} from '../model';
const copy=value=>structuredClone(value);
export function createCoreWorkspace(backend,{delay=700,uuid=()=>crypto.randomUUID(),storage=globalThis.localStorage}={}){
 let epoch=0,timer,writing=false,operation=null,blocked=false,closed=false;
 const lockKey='deck-sage-core-logout-lock';
 let locked=storage?.getItem(lockKey)==='1';
 let snapshot={epoch,mode:locked?'locked':'guest',state:baseState(),profile:null,user:null,username:'',revision:0,dirty:false,conflict:null,recovery:false,status:'Sign in for your collection',error:''};
 const listeners=new Set();
 const emit=patch=>{snapshot={...snapshot,...patch};for(const fn of listeners)fn(snapshot);};
 function clear(){clearTimeout(timer);operation=null;writing=false;blocked=false;}
 async function refresh(event='SESSION',session){
  if(locked||closed)return;
  if(snapshot.mode==='recovery'&&session?.user?.id===snapshot.user?.id&&['USER_UPDATED','INITIAL_SESSION','TOKEN_REFRESHED','SIGNED_IN'].includes(event))return;
  if(event==='TOKEN_REFRESHED'&&session?.user?.id===snapshot.user?.id&&snapshot.mode==='account')return;
  // Revalidate even same-user refreshes. Clear private state synchronously first.
  const current=++epoch;clear();emit({epoch,mode:'loading',state:baseState(),profile:null,user:null,username:'',revision:0,dirty:false,conflict:null,error:'',status:'Checking account',recovery:event==='PASSWORD_RECOVERY'});
  try{
   const user=await backend?.user();if(current!==epoch||closed)return;
   if(!user||session?.user?.is_anonymous){emit({mode:'guest',status:'Sign in for your collection'});return;}
   if(event==='PASSWORD_RECOVERY'){emit({mode:'recovery',user,status:'Choose a new password',recovery:true});return;}
   const data=await backend.load(user.id);if(current!==epoch||closed)return;
   if(!data.profile){emit({mode:'onboarding',user,status:'Finish your new account'});return;}
   if(!data.workspace)throw Error('Account data unavailable');
   emit({mode:'account',user,profile:data.profile,username:data.profile.username,state:validateState(data.workspace.state),revision:Number(data.workspace.revision),status:'Synced to your account'});
  }catch{if(current===epoch)emit({mode:'locked',status:'Account unavailable',error:'Sign in again to continue.'});}
 }
 async function sync(){
  if(snapshot.mode!=='account'||!snapshot.dirty||writing||blocked)return;
  const current=epoch;writing=true;
  operation ||= {id:uuid(),user:snapshot.user.id,state:copy(snapshot.state),revision:snapshot.revision};
  const pending=operation;
  try{const result=await backend.save(pending.user,pending.state,pending.revision,pending.id);if(current!==epoch)return;operation=null;writing=false;const dirty=JSON.stringify(snapshot.state)!==JSON.stringify(pending.state);emit({revision:Number(result.revision),dirty,status:dirty?'Changes waiting to sync':'Synced to your account'});if(dirty)schedule();return result;}
  catch(error){if(current!==epoch)return;writing=false;blocked=true;if(error.message?.includes('ACCOUNT_CHANGED')){++epoch;clear();emit({epoch,mode:'locked',state:baseState(),user:null,profile:null,username:'',dirty:false,status:'Sign in again',error:'Your account changed.'});}else emit({status:'Sync paused',error:'Changes remain in memory. Export a backup before leaving.',conflict:error.message?.includes('REVISION_CONFLICT')?true:null});throw error;}
 }
 function schedule(){clearTimeout(timer);timer=setTimeout(()=>void sync().catch(()=>{}),delay);}
 const api={
  getSnapshot:()=>snapshot,subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
  start(){closed=false;const unsubscribe=backend?.subscribe((event,session)=>void refresh(event,session));const crossTab=event=>{if(event.key===lockKey&&event.newValue==='1'){locked=true;++epoch;clear();emit({epoch,mode:'locked',state:baseState(),user:null,profile:null,username:'',dirty:false,status:'Signed out in another tab'});}};globalThis.addEventListener?.('storage',crossTab);if(backend)void refresh();return()=>{closed=true;++epoch;clear();unsubscribe?.();globalThis.removeEventListener?.('storage',crossTab);};},
  edit(value,expectedEpoch=epoch){if(expectedEpoch!==epoch)return;if(snapshot.mode!=='account')throw Error('Sign in to change your collection.');emit({state:validateState(typeof value==='function'?value(snapshot.state):value),dirty:true,status:'Changes waiting to sync'});schedule();},
  async commitAtomic(transform){if(snapshot.mode!=='account'||snapshot.dirty||writing)throw Error('SYNC_NOT_READY');api.edit(transform);return sync();},
  async signIn(username,password,captcha){if(locked)throw Error('Finish signing out first.');await backend.signIn(username,password,captcha);return refresh();},
  async onboard(username,zip,terms,privacy){if(snapshot.mode!=='onboarding')throw Error('ONBOARDING_REQUIRED');const current=epoch;await backend.onboard(username,zip,terms,privacy);if(current===epoch)return refresh();},
  async logout(){locked=true;storage?.setItem(lockKey,'1');++epoch;clear();emit({epoch,mode:'locked',state:baseState(),profile:null,user:null,username:'',revision:0,dirty:false,conflict:null,recovery:false,status:'Signing out',error:''});try{await backend.signOut();storage?.removeItem(lockKey);locked=false;emit({mode:'guest',status:'Signed out'});}catch{emit({error:'Your account is hidden. Retry sign out to finish.',status:'Sign out incomplete'});throw Error('SIGN_OUT_INCOMPLETE');}},
  async resetPassword(password){if(snapshot.mode!=='recovery')throw Error('Open the recovery link first.');const current=epoch,owner=snapshot.user.id;await backend.resetPassword(password);if(current!==epoch)return;const data=await backend.load(owner);if(current!==epoch)return;if(!data.profile)return refresh('RECOVERED_SETUP');await backend.endRecovery();return api.logout();},
  retry:()=>refresh(),sync,
 };
 return api;
}
