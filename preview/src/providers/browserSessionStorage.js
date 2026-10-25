// Native Auth storage shared by tabs for one browser session. Only an ephemeral
// AES key is in a Secure session cookie; bearer/refresh/PKCE values are encrypted.
// Browser "restore previous session" can restore session cookies too: a website
// cannot reliably distinguish that from a browser which never closed.
export function createBrowserSessionStorage(options={}){
 let storage;try{storage=options.storage||globalThis.localStorage;}catch{}
 const document=options.document||globalThis.document,crypto=options.crypto||globalThis.crypto,locks=options.locks||globalThis.navigator?.locks;
 const cookie='__Host-deck-sage-core-browser',prefix='deck-sage-core-session-v3:';
 const encode=bytes=>btoa(String.fromCharCode(...bytes));
 const decode=value=>Uint8Array.from(atob(value),c=>c.charCodeAt(0));
 const readKey=()=>document.cookie.split(';').map(x=>x.trim()).find(x=>x.startsWith(cookie+'='))?.slice(cookie.length+1);
 const serial=fn=>locks?.request?locks.request('deck-sage-core-browser-key',fn):fn();
 async function key(create){
  return serial(async()=>{
   let raw=readKey();
   if(!raw&&create){
    raw=encode(crypto.getRandomValues(new Uint8Array(32)));
    document.cookie=cookie+'='+raw+'; Path=/; Secure; SameSite=Lax';
    if(readKey()!==raw)throw Error('BROWSER_SESSION_STORAGE_UNAVAILABLE');
   }
   if(!raw)return null;
   return crypto.subtle.importKey('raw',decode(raw),'AES-GCM',false,['encrypt','decrypt']);
  });
 }
 return {
  async getItem(name){
   try{const value=storage?.getItem(prefix+name);if(!value)return null;
    const k=await key(false);if(!k){storage.removeItem(prefix+name);return null;}
    const [version,iv,data]=value.split('.');if(version!=='v1')throw Error('INVALID_STORAGE');
    return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(iv),additionalData:new TextEncoder().encode(name)},k,decode(data)));
   }catch{try{storage?.removeItem(prefix+name);}catch{}return null;}
  },
  async setItem(name,value){
   const k=await key(true),iv=crypto.getRandomValues(new Uint8Array(12));
   const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(name)},k,new TextEncoder().encode(value));
   storage.setItem(prefix+name,'v1.'+encode(iv)+'.'+encode(new Uint8Array(encrypted)));
  },
  async removeItem(name){storage.removeItem(prefix+name);},
 };
}
