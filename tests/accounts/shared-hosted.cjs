// Explicitly authorized TEST-project integration. The caller deletes the named
// fixture workspace after this script reports its result.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const context={window:{}};vm.runInNewContext(fs.readFileSync('preview/public/account-config.js','utf8'),context);
const {url,publishableKey}=context.window.DECK_SAGE_ACCOUNTS;
assert.equal(url,'https://mihmykgxbneuhlcxolzm.supabase.co');assert.ok(publishableKey.startsWith('sb_publishable_'));
const headers={apikey:publishableKey,'Content-Type':'application/json'},stamp=Date.now().toString(36),username=('codex_'+stamp).slice(0,24);let checks=0;
const pass=name=>{checks++;console.log('PASS SHARED HOSTED '+name);};
const state=()=>({version:1,profile:{name:'Hosted fixture',username:'',avatar:1,role:'Player',bio:''},decks:[{id:'hosted-deck',name:'Hosted deck fixture',cards:[],basicLands:{Plains:0,Island:0,Swamp:0,Mountain:0,Forest:0,Wastes:0},commanderCard:null}],bulk:[{name:'Hosted bulk fixture',quantity:6,cardVariant:'Normal'}],favorites:[],contacts:[],stores:[],notifications:[],settings:{theme:'forest',motion:true,images:true,notificationInbox:true}});
async function rpc(name,body,expected=200){const response=await fetch(url+'/rest/v1/rpc/'+name,{method:'POST',headers,body:JSON.stringify(body)}),data=await response.json();assert.equal(response.status,expected,JSON.stringify(data));return data;}
(async()=>{
 const openArgs={p_username:username,p_version:'web-2026-10-09-v1',p_terms:true,p_privacy:true};
 const opened=await Promise.all([rpc('ds_shared_open',openArgs),rpc('ds_shared_open',{...openArgs,p_username:'  '+username.toUpperCase()+'  '})]);
 assert.equal(opened.filter(x=>x.created).length,1);assert.equal(opened.filter(x=>!x.created).length,1);assert.ok(opened.every(x=>x.username===username&&x.revision===0));pass('concurrent normalized creation yields one shared workspace');
 const first=await rpc('ds_shared_save',{p_username:username,p_state:state(),p_revision:0,p_operation:crypto.randomUUID()});assert.equal(first.revision,1);assert.equal(first.state.decks[0].name,'Hosted deck fixture');assert.equal(first.state.bulk[0].quantity,6);pass('first client saves both deck and bulk');
 const second=await rpc('ds_shared_load',{p_username:username.toUpperCase()});assert.deepEqual(second.state,first.state);pass('separate stateless client loads both deck and bulk');
 const stale=await rpc('ds_shared_save',{p_username:username,p_state:{...state(),bulk:[]},p_revision:0,p_operation:crypto.randomUUID()},400);assert.match(stale.message,/REVISION_CONFLICT/);assert.equal((await rpc('ds_shared_load',{p_username:username})).state.bulk[0].quantity,6);pass('stale revision fails without overwriting');
 const next=state();next.profile.name='Second browser saved';next.bulk[0].quantity=11;const retryOp=crypto.randomUUID();const retries=await Promise.all([rpc('ds_shared_save',{p_username:username,p_state:next,p_revision:1,p_operation:retryOp}),rpc('ds_shared_save',{p_username:username,p_state:next,p_revision:1,p_operation:retryOp})]);assert.deepEqual(retries[0],retries[1]);assert.equal(retries[0].revision,2);pass('simultaneous identical retries persist exactly once');
 const recovered=await rpc('ds_shared_open',openArgs);assert.equal(recovered.created,false);assert.equal(recovered.state.profile.name,'Second browser saved');assert.equal(recovered.state.bulk[0].quantity,11);pass('fresh client recovers state using only username');
 for(const table of ['ds_profiles','ds_consents','ds_workspaces']){const response=await fetch(url+'/rest/v1/'+table+'?select=*',{headers});assert.equal(response.status,401);assert.equal((await response.json()).code,'42501');}pass('legacy private account tables remain unavailable to publishable client');
 const privateSchema=await fetch(url+'/rest/v1/shared_workspaces?select=*',{headers:{...headers,'Accept-Profile':'ds_private'}});assert.equal(privateSchema.status,406);assert.equal((await privateSchema.json()).code,'PGRST106');pass('private schema is not exposed through Data API');
 const admin=await fetch(url+'/rest/v1/rpc/ds_is_administrator',{method:'POST',headers,body:'{}'});assert.equal(admin.status,401);assert.equal((await admin.json()).code,'42501');pass('shared username client has no private admin RPC');
 const legacy=await fetch(url+'/rest/v1/profiles?select=user_id&limit=1',{headers});assert.equal(legacy.status,401);assert.equal((await legacy.json()).code,'42501');pass('legacy profile directory remains inaccessible');
 console.log(JSON.stringify({project:'mihmykgxbneuhlcxolzm',username,checks,revision:recovered.revision,success:true}));
})().catch(e=>{console.error(JSON.stringify({project:'mihmykgxbneuhlcxolzm',username,checks,success:false,error:e.message}));process.exit(1);});
