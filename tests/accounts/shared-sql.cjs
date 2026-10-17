const {PGlite}=require('@electric-sql/pglite');
const fs=require('fs');
const assert=require('node:assert/strict');

let checks=0;
const pass=name=>{checks++;console.log('PASS SHARED SQL '+name);};
const base=()=>({version:1,profile:{name:'Planeswalker',username:'',avatar:1,role:'Player',bio:''},decks:[],bulk:[],favorites:[],contacts:[],stores:[],notifications:[],settings:{theme:'forest',motion:true,images:true,notificationInbox:true}});

(async()=>{
 const db=new PGlite();
 try{
  await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email_confirmed_at timestamptz,is_anonymous boolean);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`);
  await db.exec(fs.readFileSync('supabase/migrations/20261009153100_free_accounts.sql','utf8'));
  await db.exec(fs.readFileSync('supabase/migrations/20261010114605_shared_username_workspaces.sql','utf8'));
  await db.exec(fs.readFileSync('supabase/migrations/20261017090000_shared_username_registration.sql','utf8'));
  await db.exec('set role anon');

  await assert.rejects(()=>db.query("select public.ds_shared_register('alpha_user','web-2026-10-09-v1',false,true)"),/CURRENT_CONSENT_REQUIRED/);
  await db.exec('reset role');
  assert.equal((await db.query('select count(*)::int n from ds_private.shared_workspaces')).rows[0].n,0);
  pass('policy rejection creates no partial workspace');

  await db.exec('set role anon');
  const opened=(await db.query("select public.ds_shared_register('  Alpha_User  ','web-2026-10-09-v1',true,true) value")).rows[0].value;
  assert.equal(opened.username,'alpha_user');assert.equal(opened.created,true);assert.deepEqual(opened.state.decks,[]);assert.deepEqual(opened.state.bulk,[]);
  await assert.rejects(()=>db.query("select public.ds_shared_register('ALPHA_USER','web-2026-10-09-v1',true,true) value"),/USERNAME_TAKEN/);
  await db.exec('reset role');
  assert.equal((await db.query("select count(*)::int n from ds_private.shared_workspaces where username='alpha_user'")).rows[0].n,1);
  await db.exec('set role anon');
  pass('registration normalizes atomically and rejects an existing name without returning its workspace');

  const state=base();state.decks=[{id:'deck-1',name:'Fixture deck',cards:[],basicLands:{Plains:0,Island:0,Swamp:0,Mountain:0,Forest:0,Wastes:0},commanderCard:null}];state.bulk=[{name:'Fixture bulk',quantity:4,cardVariant:'Normal'}];
  const op='11111111-1111-4111-8111-111111111111';
  const saved=(await db.query('select public.ds_shared_save($1,$2,$3,$4) value',['alpha_user',state,0,op])).rows[0].value;
  assert.equal(saved.revision,1);assert.equal(saved.state.decks[0].name,'Fixture deck');assert.equal(saved.state.bulk[0].quantity,4);
  const loaded=(await db.query("select public.ds_shared_load(' ALPHA_USER ') value")).rows[0].value;
  assert.deepEqual(loaded,saved);
  pass('decks and bulk save centrally and load through normalized name');

  const retry=(await db.query('select public.ds_shared_save($1,$2,$3,$4) value',['alpha_user',state,0,op])).rows[0].value;
  assert.deepEqual(retry,saved);
  await assert.rejects(()=>db.query('select public.ds_shared_save($1,$2,$3,$4)', ['alpha_user',{...state,bulk:[]},0,op]),/OPERATION_REUSE/);
  pass('operation retry is idempotent and reuse with different data fails closed');

  await assert.rejects(()=>db.query('select public.ds_shared_save($1,$2,$3,$4)', ['alpha_user',state,0,'22222222-2222-4222-8222-222222222222']),/REVISION_CONFLICT/);
  await assert.rejects(()=>db.query('select public.ds_shared_save($1,$2,$3,$4)', ['alpha_user',state,null,'33333333-3333-4333-8333-333333333333']),/INVALID_REVISION/);
  pass('stale and invalid revisions never overwrite current state');

  await assert.rejects(()=>db.query('select * from ds_private.shared_workspaces'),/permission denied/);
  await assert.rejects(()=>db.query('select * from ds_private.shared_operations'),/permission denied/);
  pass('anonymous role cannot access shared tables directly');

  await db.exec('reset role');
  const properties=(await db.query("select relname,relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='ds_private' and c.relkind='r' and relname like 'shared_%' order by relname")).rows;
  assert.deepEqual(properties.map(x=>[x.relname,x.relrowsecurity]),[['shared_operations',true],['shared_workspaces',true]]);
  assert.equal((await db.query("select count(*)::int n from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and relname like '%shared%'")).rows[0].n,0);
  pass('shared tables have RLS and no public-table exposure');

  await db.exec('set role anon');
  for(const signature of ['public.ds_shared_register(text,text,boolean,boolean)','public.ds_shared_open(text,text,boolean,boolean)','public.ds_shared_load(text)','public.ds_shared_save(text,jsonb,bigint,uuid)'])assert.equal((await db.query('select has_function_privilege(current_user,$1,$2) ok',[signature,'execute'])).rows[0].ok,true);
  await assert.rejects(()=>db.query("select public.ds_finish_onboarding(null,'x','web-2026-10-09-v1',true,true)"),/permission denied/);
  pass('anonymous API is limited to shared username contracts; private account onboarding stays denied');

  const tmoore=(await db.query("select public.ds_shared_open('tmoore','web-2026-10-09-v1',true,true) value")).rows[0].value;
  assert.equal(tmoore.username,'tmoore');
  await db.exec('reset role');
  assert.equal((await db.query("select count(*)::int n from ds_private.account_roles")).rows[0].n,0);
  assert.equal((await db.query('select count(*)::int n from ds_profiles')).rows[0].n,0);
  assert.equal((await db.query('select count(*)::int n from ds_workspaces')).rows[0].n,0);
  pass('tmoore shared name grants no admin role and no private-account records');

  await db.exec("delete from ds_private.shared_workspaces where username='tmoore'");
  console.log(checks+' shared SQL checks passed.');
 }finally{await db.close();}
})().catch(e=>{console.error(e);process.exit(1);});
