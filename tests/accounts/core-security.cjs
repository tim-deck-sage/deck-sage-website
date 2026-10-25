const {PGlite}=require('@electric-sql/pglite'),fs=require('fs'),assert=require('node:assert/strict');
const migration=fs.readdirSync('supabase/migrations').find(name=>name.endsWith('_core_secure_accounts.sql'));
const owner='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222',unconfirmed='33333333-3333-4333-8333-333333333333';
let checks=0;const pass=name=>{checks++;console.log('PASS '+name);};
(async()=>{const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,is_anonymous boolean);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`);
 for(const name of ['20261009153100_free_accounts.sql','20261010114605_shared_username_workspaces.sql','20261017090000_shared_username_registration.sql'])await db.exec(fs.readFileSync('supabase/migrations/'+name,'utf8'));
 await db.exec(`insert into auth.users values('${owner}','a@example.invalid',now(),false),('${other}','b@example.invalid',now(),false),('${unconfirmed}','c@example.invalid',null,false);set role anon;select ds_shared_register('old_beta','web-2026-10-09-v1',true,true);reset role;`);
 await db.exec(fs.readFileSync('supabase/migrations/'+migration,'utf8'));
 for(const role of ['anon','authenticated']){
  await db.exec('set role '+role);
  for(const query of ["select ds_shared_load('old_beta')","select ds_shared_open('old_beta','web-2026-10-09-v1',true,true)","select ds_shared_register('other_beta','web-2026-10-09-v1',true,true)","select ds_shared_save('old_beta','{}',0,'44444444-4444-4444-8444-444444444444')","select ds_private.load_shared_workspace('old_beta')"]){await assert.rejects(()=>db.query(query),/permission denied/);}
  await db.exec('reset role');
 }
 assert.equal((await db.query('select count(*)::int n from ds_private.shared_workspaces')).rows[0].n,1);pass('legacy username APIs denied to both roles; beta rows retained');
 await db.exec('set role anon');
 await assert.rejects(()=>db.query("select ds_core_onboard('new_owner','00501',true,true)"),/permission denied/);
 await assert.rejects(()=>db.query('select * from ds_core_profiles'),/permission denied/);
 await assert.rejects(()=>db.query('select * from ds_core_workspaces'),/permission denied/);
 await db.exec('reset role');pass('anonymous direct table and RPC rejection');
 async function as(id){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated');}
 await as(unconfirmed);await assert.rejects(()=>db.query("select ds_core_onboard('new_owner','00501',true,true)"),/AUTHENTICATION_REQUIRED/);pass('unconfirmed identity rejected server-side');
 await as(owner);await assert.rejects(()=>db.query("select ds_core_onboard('new_owner','00501',false,true)"),/CONSENT_REQUIRED/);
 await assert.rejects(()=>db.query("select ds_core_onboard('new_owner','501',true,true)"),/INVALID_ZIP/);
 await db.query("select ds_core_onboard(' NEW_Owner ','00501',true,true)");
 const profile=(await db.query('select username,zip_code from ds_core_profiles')).rows;assert.deepEqual(profile,[{username:'new_owner',zip_code:'00501'}]);pass('atomic signup policy, normalized username and ZIP leading zeros');
 await as(other);await assert.rejects(()=>db.query("select ds_core_onboard('NEW_OWNER','90210',true,true)"),/USERNAME_UNAVAILABLE/);assert.equal((await db.query('select count(*)::int n from ds_core_profiles')).rows[0].n,0);
 await db.query("select ds_core_onboard('old_beta','90210',true,true)");
 assert.deepEqual((await db.query('select state from ds_core_workspaces')).rows[0].state.decks,[]);pass('case collision rejects atomically; legacy matching name starts empty');
 assert.equal((await db.query('select count(*)::int n from ds_core_workspaces where user_id=$1',[owner])).rows[0].n,0);
 await assert.rejects(()=>db.query('select ds_core_login_email($1)',['new_owner']),/permission denied/);pass('cross-user select denial and email directory denial');
 const empty=(await db.query('select state from ds_core_workspaces')).rows[0].state;
 const state={...empty,decks:[{id:'private-deck',name:'Owner only',cards:[]}],bulk:[]},op='44444444-4444-4444-8444-444444444444';
 await assert.rejects(()=>db.query('select ds_core_save($1,$2,0,$3)',[owner,state,op]),/ACCOUNT_CHANGED/);
 await assert.rejects(()=>db.query('update ds_core_workspaces set user_id=$1',[owner]),/permission denied/);pass('cross-user save and owner reassignment rejected');
 await as(owner);const first=(await db.query('select ds_core_save($1,$2,0,$3) value',[owner,state,op])).rows[0].value;
 assert.equal(first.revision,1);assert.deepEqual((await db.query('select ds_core_save($1,$2,0,$3) value',[owner,state,op])).rows[0].value,first);
 await assert.rejects(()=>db.query('select ds_core_save($1,$2,0,$3)',[owner,empty,op]),/OPERATION_REUSE/);
 await assert.rejects(()=>db.query('select ds_core_save($1,$2,0,$3)',[owner,empty,other]),/REVISION_CONFLICT/);pass('owner save, idempotent retry and stale write rejection');
 await db.exec('reset role;set role service_role');assert.equal((await db.query("select ds_core_login_email('NEW_OWNER') email")).rows[0].email,'a@example.invalid');
 for(let i=0;i<11;i++)assert.equal((await db.query("select ds_core_login_attempt(repeat('a',64),10) ok")).rows[0].ok,i<10);
 pass('service-only email resolution and durable atomic rate limit');
 console.log(checks+' core SQL proof groups passed. No hosted mutations.');
}finally{await db.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
