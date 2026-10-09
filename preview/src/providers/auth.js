export class ProviderError extends Error{constructor(code,message){super(message);this.code=code;}}
export function createOfflineAuthProvider(){
 const unsupported=()=>{throw new ProviderError('NOT_CONNECTED','Online authentication requires a configured staging provider.');};
 return Object.freeze({kind:'offline',getSession:()=>null,subscribe:()=>()=>{},signIn:unsupported,signUp:unsupported,recover:unsupported,signOut:()=>null,capabilities:{online:false,emailDelivery:false}});
}

// TEST ONLY. Fixed fixture identities, no passwords, network or persistent credentials.
export function createFixtureAuthProvider({users,now=()=>Date.now(),ttl=60000}){
 const allowed=new Set(users),sessions=new Map(),listeners=new Set(),recoverySink=[];let sequence=0,current=null;
 const clone=value=>value?structuredClone(value):null;
 function authenticate(token){const session=sessions.get(token);if(!session||session.expiresAt<=now())throw new ProviderError('UNAUTHENTICATED','Fixture session is absent, expired or revoked.');return clone(session);}
 function emit(){for(const listener of listeners)listener(api.getSession());}
 const api={kind:'test-fixture',capabilities:{online:false,emailDelivery:false},
  signIn(userId){if(!allowed.has(userId))throw new ProviderError('UNKNOWN_FIXTURE','Choose an existing test identity.');current={userId,token:'fixture-session-'+(++sequence),expiresAt:now()+ttl};sessions.set(current.token,current);emit();return clone(current);},
  getSession(){if(!current)return null;try{return authenticate(current.token);}catch{return null;}},
  signOut(){if(current)sessions.delete(current.token);current=null;emit();},
  revoke(token){sessions.delete(token);emit();},authenticate,
  subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);},
  recover(userId){if(!allowed.has(userId))throw new ProviderError('UNKNOWN_FIXTURE','Unknown test identity.');recoverySink.push({userId,type:'recovery-request'});return {delivery:'test-sink-only'};},
  signUp(){throw new ProviderError('NOT_SUPPORTED','Test fixtures do not create accounts.');},
  recoverySink,
 };return api;
}
