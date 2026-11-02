import {requiresAccount,safeReturnRoute} from './providers/coreAccess';

export function accountEntryRoute(snapshot){return snapshot?.mode==='account'?'settings':'account/settings';}
export function accountEntryHref(route,snapshot){return '#/'+(route==='settings'?accountEntryRoute(snapshot):route);}

// Keep authentication in one flow without losing a gated tool/deck destination.
export function canonicalAccountRoute(route,mode){
 if(mode==='recovery')return 'reset-password';
 if(mode==='onboarding'&&!requiresAccount(route)&&route.split('/')[0]!=='account')return 'account';
 if(mode==='account'&&route.startsWith('account/')){
  const target=safeReturnRoute(route.slice('account/'.length));
  return ['account','reset-password'].includes(target.split('/')[0])?'settings':target;
 }
 if(mode!=='account'&&route==='settings')return 'account/settings';
 return route;
}
