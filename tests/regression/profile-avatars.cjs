const assert=require('node:assert/strict'),fs=require('fs'),crypto=require('crypto'),esbuild=require('esbuild');
const built=esbuild.buildSync({stdin:{contents:"export * from './preview/src/avatars';export {baseState,validateState} from './preview/src/model';export {createSharedWorkspace} from './preview/src/providers/sharedWorkspace';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',write:false});
const mod={exports:{}};new Function('module','exports','require',built.outputFiles[0].text)(mod,mod.exports,require);
const {AVATAR_NUMBERS,normalizeAvatarNumber,avatarImagePath,baseState,validateState,createSharedWorkspace}=mod.exports;
const copy=x=>structuredClone(x);let checks=0;const pass=n=>{checks++;console.log('PASS AVATARS '+n);};
(async()=>{
 assert.deepEqual(AVATAR_NUMBERS,Array.from({length:19},(_,i)=>i+1));
 for(const n of AVATAR_NUMBERS){assert.equal(normalizeAvatarNumber(n),n);assert.equal(normalizeAvatarNumber(String(n)),n);assert.equal(avatarImagePath(n),'/avatars/avatar'+n+'.webp');}
 for(const bad of [undefined,null,0,-1,20,1.5,Infinity,NaN,'https://example.com/a.png','avatar99'])assert.equal(normalizeAvatarNumber(bad),1);
 const old=baseState();delete old.profile.avatar;assert.equal(validateState(old).profile.avatar,1);pass('stable 1–19 IDs, safe defaults and closed image URLs');
 const manifest=JSON.parse(fs.readFileSync('docs/avatar-assets.json','utf8'));
 assert.equal(manifest.assets.length,19);
 for(const a of manifest.assets){const data=fs.readFileSync('preview/public/'+a.output);assert.equal(crypto.createHash('sha256').update(data).digest('hex'),a.sha256);assert.equal(data.toString('ascii',8,12),'WEBP');assert.ok(data.length<80000);}
 pass('all 19 shipped WebP assets match provenance hashes and size budget');
 let guestState=baseState();guestState.profile.avatar=3;
 const guest={load:()=>copy(guestState),save:s=>{guestState=copy(s);}},rows=new Map();
 const backend={load:async n=>copy(rows.get(n)),signIn:async n=>copy(rows.get(n)),save:async(n,s,r)=>{assert.equal(rows.get(n).revision,r);const row={username:n,state:copy(s),revision:r+1};rows.set(n,row);return copy(row);}};
 for(const [n,a] of [['first',7],['second',12]]){const s=baseState();s.profile.avatar=a;s.bulk=[{name:'Sol Ring',quantity:2}];rows.set(n,{username:n,state:s,revision:0});}
 const names=new Map(),nameStorage={getItem:k=>names.get(k),setItem:(k,v)=>names.set(k,v),removeItem:k=>names.delete(k)};
 const first=createSharedWorkspace(guest,backend,{delay:100000,nameStorage});first.start();await first.signInUsername('first');
 const before=copy(first.getSnapshot().state);first.edit(s=>({...s,profile:{...s.profile,avatar:19}}));await first.sync();assert.equal(rows.get('first').state.profile.avatar,19);assert.deepEqual(rows.get('first').state.bulk,before.bulk);assert.equal(guestState.profile.avatar,3);pass('avatar saves through existing shared workspace without changing collection or guest');
 const backup=validateState(JSON.parse(JSON.stringify(first.getSnapshot().state)));assert.equal(backup.profile.avatar,19);pass('backup round trip retains selection');
 const refreshed=createSharedWorkspace(guest,backend,{delay:100000,nameStorage});const stop=refreshed.start();for(let n=0;n<50&&refreshed.getSnapshot().mode!=='account';n++)await new Promise(r=>setTimeout(r,2));assert.equal(refreshed.getSnapshot().state.profile.avatar,19);stop();pass('fresh controller restores saved avatar for remembered username');
 const staleEpoch=first.getSnapshot().epoch;await first.signInUsername('second');assert.equal(first.getSnapshot().state.profile.avatar,12);first.edit(s=>({...s,profile:{...s.profile,avatar:4}}),staleEpoch);assert.equal(first.getSnapshot().state.profile.avatar,12);await first.logout();assert.equal(first.getSnapshot().state.profile.avatar,3);await first.signInUsername('first');assert.equal(first.getSnapshot().state.profile.avatar,19);pass('account switches, stale callbacks and logout preserve separate selections');
 console.log(JSON.stringify({checks,success:true}));
})().catch(e=>{console.error(e);process.exitCode=1;});
