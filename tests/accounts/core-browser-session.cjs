const assert=require('node:assert/strict'),esbuild=require('esbuild'),{webcrypto}=require('node:crypto');
const b=esbuild.buildSync({stdin:{contents:"export {createBrowserSessionStorage} from './preview/src/providers/browserSessionStorage';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',write:false});const m={exports:{}};new Function('module','exports',b.outputFiles[0].text)(m,m.exports);const {createBrowserSessionStorage}=m.exports;
const records=new Map(),cookies=new Map(),cookieWrites=[];
const storage={getItem:k=>records.get(k)||null,setItem:(k,v)=>records.set(k,v),removeItem:k=>records.delete(k)};
const document={get cookie(){return [...cookies].map(([k,v])=>k+'='+v).join('; ');},set cookie(value){cookieWrites.push(value);const item=value.split(';')[0],i=item.indexOf('=');cookies.set(item.slice(0,i),item.slice(i+1));}};
const make=()=>createBrowserSessionStorage({storage,document,crypto:webcrypto});
(async()=>{
 const a=make();await a.setItem('auth','synthetic-bearer-and-refresh');assert(![...records.values()].join('').includes('synthetic-bearer'));assert(cookieWrites.every(v=>v.includes('Secure')&&v.includes('Path=/')&&!/expires|max-age/i.test(v)));console.log('PASS auth material encrypted at rest; key uses Secure host-only browser-session cookie');
 assert.equal(await make().getItem('auth'),'synthetic-bearer-and-refresh');console.log('PASS same browser session survives adapter recreation, navigation and another tab');
 await a.setItem('auth-code-verifier','synthetic-pkce');assert.equal(await make().getItem('auth-code-verifier'),'synthetic-pkce');console.log('PASS email callback in another tab can read same-session PKCE verifier');
 records.set('deck-sage-core-session-v3:other',records.get('deck-sage-core-session-v3:auth'));assert.equal(await a.getItem('other'),null);console.log('PASS ciphertext cannot be substituted under another native Auth storage key');
 await a.removeItem('auth');assert.equal(await make().getItem('auth'),null);console.log('PASS logout storage removal visible across tabs');
 await a.setItem('auth','synthetic-second-session');cookies.clear();assert.equal(await make().getItem('auth'),null);assert.equal(await make().getItem('auth-code-verifier'),null);console.log('PASS browser-session cookie loss rejects previous session and PKCE material');
 await a.setItem('auth','synthetic-new-login');assert.equal(await make().getItem('auth'),'synthetic-new-login');console.log('PASS ordinary new login works after browser close');
 const blocked=createBrowserSessionStorage({document:{get cookie(){return '';},set cookie(v){}},storage,crypto:webcrypto});await assert.rejects(()=>blocked.setItem('blocked','fixture'),/BROWSER_SESSION_STORAGE_UNAVAILABLE/);console.log('PASS blocked cookies fail closed rather than persisting an unrestricted session');
 const broken=createBrowserSessionStorage({document,storage:{getItem(){throw Error('blocked');}},crypto:webcrypto});assert.equal(await broken.getItem('auth'),null);console.log('PASS unavailable storage does not crash public browsing');
})().catch(e=>{console.error(e);process.exitCode=1;});
