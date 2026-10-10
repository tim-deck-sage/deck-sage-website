const esbuild=require('esbuild');
const assert=require('node:assert/strict');

const built=esbuild.buildSync({stdin:{contents:"export {createSharedWorkspace} from './preview/src/providers/sharedWorkspace';export {baseState} from './preview/src/model';export {createAccountBackend} from './preview/src/providers/supabaseAccounts';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',write:false});
const loaded={exports:{}};new Function('module','exports','require',built.outputFiles[0].text)(loaded,loaded.exports,require);
const {createSharedWorkspace,baseState,createAccountBackend}=loaded.exports;
const copy=value=>structuredClone(value),tick=()=>new Promise(r=>setTimeout(r,5));
async function until(fn){for(let n=0;n<200;n++){if(fn())return;await tick();}throw Error('Timed out waiting for shared workspace state');}
let checks=0;const pass=name=>{checks++;console.log('PASS SHARED CONTROLLER '+name);};

function service(){
 const rows=new Map(),receipts=new Map();let failNext=false,deferredLoad=null,deferredSave=null,saveCalls=0;
 const normalize=name=>{const value=name.trim().toLowerCase();if(!/^[a-z0-9_]{3,24}$/.test(value))throw Error('INVALID_USERNAME');return value;};
 const backend={
  async open(name,terms,privacy){if(!terms||!privacy)throw Error('CURRENT_CONSENT_REQUIRED');name=normalize(name);let row=rows.get(name),created=false;if(!row){row={username:name,state:baseState(),revision:0};rows.set(name,row);created=true;}return {...copy(row),created};},
  async load(name){name=normalize(name);if(deferredLoad){const pending=deferredLoad;deferredLoad=null;await pending.promise;}const row=rows.get(name);if(!row)throw Error('USERNAME_NOT_FOUND');return copy(row);},
  async save(name,state,revision,operation){saveCalls++;name=normalize(name);if(deferredSave){const pending=deferredSave;deferredSave=null;await pending.promise;}const key=name+'/'+operation;if(receipts.has(key))return copy(receipts.get(key));if(failNext){failNext=false;throw Error('FIXTURE_NETWORK_FAILED');}const row=rows.get(name);if(!row)throw Error('USERNAME_NOT_FOUND');if(row.revision!==revision)throw Error('REVISION_CONFLICT');const saved={username:name,state:copy(state),revision:revision+1};rows.set(name,copy(saved));receipts.set(key,copy(saved));return saved;}
 };
 const deferred=()=>{let release;const promise=new Promise(r=>release=r);return {promise,release};};
 return {backend,rows,fail(){failNext=true;},deferLoad(){return deferredLoad=deferred();},deferSave(){return deferredSave=deferred();},saveCalls:()=>saveCalls};
}
function storage(){const values=new Map();return {getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k),clear:()=>values.clear()};}
function guest(){let value=baseState();value.bulk=[{name:'Browser guest',quantity:2}];return {load:()=>copy(value),save:v=>value=copy(v)};}

(async()=>{
 const remote=service(),guestA=guest(),namesA=storage();let sequence=0;
 const first=createSharedWorkspace(guestA,remote.backend,{delay:100000,uuid:()=>`00000000-0000-4000-8000-${String(++sequence).padStart(12,'0')}`,nameStorage:namesA});first.start();
 await first.createUsername('  Cross_Device  ',true,true);assert.equal(first.getSnapshot().username,'cross_device');assert.equal(first.getSnapshot().state.bulk.length,0);assert.equal(guestA.load().bulk[0].name,'Browser guest');pass('open normalizes name and never imports guest data implicitly');

 const state=baseState();state.decks=[{id:'deck-a',name:'Shared deck',cards:[],basicLands:{},commanderCard:null}];state.bulk=[{name:'Shared bulk',quantity:7}];first.edit(state);await first.sync();assert.equal(remote.rows.get('cross_device').state.decks[0].name,'Shared deck');assert.equal(remote.rows.get('cross_device').state.bulk[0].quantity,7);pass('controller saves decks and bulk together');

 const second=createSharedWorkspace(guest(),remote.backend,{delay:100000,nameStorage:storage()});second.start();await second.createUsername('CROSS_DEVICE',true,true);assert.equal(second.getSnapshot().state.decks[0].name,'Shared deck');assert.equal(second.getSnapshot().state.bulk[0].quantity,7);second.edit(s=>({...s,bulk:[{name:'Second browser edit',quantity:9}]}));await second.sync();await first.retry();assert.equal(first.getSnapshot().state.bulk[0].name,'Second browser edit');pass('separate controller opens and updates the same remote collection');

 namesA.clear();const cleared=createSharedWorkspace(guest(),remote.backend,{delay:100000,nameStorage:namesA});cleared.start();assert.equal(cleared.getSnapshot().mode,'guest');await cleared.createUsername('cross_device',true,true);assert.equal(cleared.getSnapshot().state.bulk[0].quantity,9);pass('cleared browser storage recovers collection by re-entering username');

 first.edit(s=>({...s,bulk:[{name:'Pending stale edit',quantity:3}]}));second.edit(s=>({...s,bulk:[{name:'Newest remote edit',quantity:5}]}));await second.sync();await assert.rejects(()=>first.sync(),/REVISION_CONFLICT/);assert.equal(first.getSnapshot().state.bulk[0].name,'Pending stale edit');assert.equal(first.getSnapshot().conflict.state.bulk[0].name,'Newest remote edit');first.resolveConflict(false);assert.equal(first.getSnapshot().state.bulk[0].name,'Newest remote edit');pass('stale revision preserves pending state until explicit conflict choice');

 remote.fail();first.edit(s=>({...s,bulk:[{name:'Retry after failure',quantity:4}]}));await assert.rejects(()=>first.sync(),/FIXTURE_NETWORK_FAILED/);assert.equal(first.getSnapshot().dirty,true);const before=remote.saveCalls();await Promise.all([first.retry(),first.retry()]);assert.equal(remote.saveCalls(),before+1);assert.equal(first.getSnapshot().dirty,false);pass('failed save stays in memory and repeated retry clicks issue one write');

 first.edit(s=>({...s,bulk:[{name:'Pending switch',quantity:8}]}));await assert.rejects(()=>first.logout(),/UNSAVED_SHARED_CHANGES/);assert.equal(first.getSnapshot().state.bulk[0].name,'Pending switch');await first.logout({discard:true});assert.equal(first.getSnapshot().mode,'guest');assert.equal(first.getSnapshot().state.bulk[0].name,'Browser guest');pass('username switch requires deliberate discard and restores separate guest data');

 const late=createSharedWorkspace(guest(),remote.backend,{delay:100000,nameStorage:storage()});const held=remote.deferLoad();const opening=late.createUsername('cross_device',true,true);await tick();await late.logout({discard:true});held.release();await opening;assert.equal(late.getSnapshot().mode,'guest');assert.equal(late.getSnapshot().state.bulk[0].name,'Browser guest');pass('late load after cancellation cannot leak remote state into guest mode');

 const delayed=createSharedWorkspace(guest(),remote.backend,{delay:100000,nameStorage:storage()});await delayed.createUsername('cross_device',true,true);delayed.edit(s=>({...s,bulk:[{name:'Delayed save',quantity:6}]}));const heldSave=remote.deferSave(),saving=delayed.sync();await tick();await delayed.logout({discard:true});heldSave.release();await saving;assert.equal(delayed.getSnapshot().mode,'guest');assert.equal(delayed.getSnapshot().state.bulk[0].name,'Browser guest');pass('late save response cannot replace a switched workspace');

 const calls=[],client={rpc:async(name,args)=>{calls.push([name,args]);return {data:{username:'rpc_user',state:baseState(),revision:0},error:null};}};
 const backend=createAccountBackend({url:'https://mihmykgxbneuhlcxolzm.supabase.co',publishableKey:'sb_publishable_TEST_FIXTURE_ONLY',usernameOnlyReady:true},client);await backend.open(' RPC_User ',true,true);await backend.load('rpc_user');await backend.save('rpc_user',baseState(),0,'11111111-1111-4111-8111-111111111111');assert.deepEqual(calls.map(x=>x[0]),['ds_shared_open','ds_shared_load','ds_shared_save']);assert.equal(Object.keys(client).includes('auth'),false);pass('browser backend uses only three shared RPCs and no Auth calls');

 assert.equal(createAccountBackend({url:'https://mihmykgxbneuhlcxolzm.supabase.co',publishableKey:'sb_publishable_TEST_FIXTURE_ONLY',usernameOnlyReady:false},client),null);pass('backend remains disabled without explicit readiness flag');
 console.log(checks+' shared controller checks passed.');process.exit(0);
})().catch(e=>{console.error(e);process.exit(1);});
