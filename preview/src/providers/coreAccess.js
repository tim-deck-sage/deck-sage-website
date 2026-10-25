// UI policy is only a presentation boundary; database ownership remains mandatory.
export const PUBLIC_ROUTES=new Set(['home','cards','precons','combos','lore','songs','news','help','account','reset-password','publish']);
export function requiresAccount(route){return !PUBLIC_ROUTES.has(String(route).split('/')[0]);}
export function safeReturnRoute(route){const value=String(route||'home');return /^[a-z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(value)?value:'home';}
export function signupFields(username,zip){
 const normalized=String(username||'').trim().toLowerCase();
 if(!/^[a-z0-9_]{3,24}$/.test(normalized))throw Error('Use 3–24 letters, numbers, or underscores for your username.');
 if(!/^[0-9]{5}$/.test(String(zip)))throw Error('Enter a five-digit US ZIP code.');
 return {username:normalized,zip_code:String(zip)};
}
