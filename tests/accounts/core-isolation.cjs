// Execute actual saved function bodies/policies and actual local migrations in
// PGlite/PostgreSQL. Synthetic rows only; never contacts the hosted project.
const fs=require('fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {PGlite}=require('@electric-sql/pglite'),{pgcrypto}=require('@electric-sql/pglite/contrib/pgcrypto');
const base=require('./fixtures/legacy-test-catalog.json'),extra=require('./fixtures/legacy-test-extra.json'),live=require('../../docs/core-readonly-catalog-2026-10-25.json');
const q=value=>'"'+value.replaceAll('"','""')+'"';
const A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',B='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',L='cccccccc-cccc-4ccc-8ccc-cccccccccccc',M='dddddddd-dddd-4ddd-8ddd-dddddddddddd',ANON='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const RUN='11111111-1111-4111-8111-111111111111',INACTIVE='22222222-2222-4222-8222-222222222222',MATCH='33333333-3333-4333-8333-333333333333',PART='44444444-4444-4444-8444-444444444444';
let checks=0;const pass=name=>{checks++;console.log('PASS ISOLATION '+name);};
const file=suffix=>'supabase/migrations/'+fs.readdirSync('supabase/migrations').find(name=>name.endsWith(suffix));
(async()=>{const db=new PGlite({extensions:{pgcrypto}});try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema extensions;create extension pgcrypto with schema extensions;set search_path=public,extensions;create or replace function extensions.gen_random_uuid() returns uuid language sql volatile as $$select pg_catalog.gen_random_uuid()$$;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,is_anonymous boolean);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb)$$;create function auth.role() returns text language sql stable as $$select auth.jwt()->>'role'$$;grant usage on schema auth to anon,authenticated,service_role;grant execute on all functions in schema auth to anon,authenticated,service_role;create type public.app_role as enum('Player','StoreOwner','Admin','SuperAdmin');set check_function_bodies=false;`);
 for(const table of base.tables.filter(t=>!t.relname.startsWith('ds_'))){const cols=base.columns.filter(c=>c.relname===table.relname);await db.exec('create table public.'+q(table.relname)+'('+cols.map(c=>q(c.attname)+' '+c.data_type).join(',')+');alter table public.'+q(table.relname)+' enable row level security;');}
 // Only constraints needed to execute the chosen checked/service paths; full
 // original constraints/triggers are not represented by this catalog fixture.
 await db.exec('alter table public.user_token_wallets add primary key(user_id);alter table public.profiles add unique(user_id);alter table public.connected_match_monthly_usage add constraint connected_match_monthly_usage_user_month_unique unique(user_id,usage_month);alter table public.connected_game_history add unique(session_id);');
 for(const col of base.columns.filter(c=>!c.relname.startsWith('ds_')&&c.default_expression))await db.exec('alter table public.'+q(col.relname)+' alter column '+q(col.attname)+' set default '+col.default_expression);
 for(const name of ['20261009153100_free_accounts.sql','20261010114605_shared_username_workspaces.sql','20261017090000_shared_username_registration.sql'])await db.exec(fs.readFileSync('supabase/migrations/'+name,'utf8'));
 for(const f of live.functions)await db.exec(f.definition);
 // Reconstruct the current audited view, before the new intentional public split.
 await db.exec('create view public.store_public_profiles as '+extra.views[0].definition.replace(/;$/,'')+' and (select ds_private.legacy_identity_allowed());grant select on public.store_public_profiles to anon,authenticated;');
 for(const table of base.tables.filter(t=>!t.relname.startsWith('ds_'))){for(const role of ['anon','authenticated']){if(table[role+'_select'])await db.exec('grant select on public.'+q(table.relname)+' to '+role);if(table[role+'_write'])await db.exec('grant insert,update,delete on public.'+q(table.relname)+' to '+role);}}
 // Exact current function EXECUTE allow/deny, not fixture-wide execution grants.
 for(const f of live.functions){const name=f.schema+'.'+f.name+'('+f.signature+')';await db.exec('revoke execute on function '+name+' from public,anon,authenticated');for(const role of ['anon','authenticated'])if(f[role+'_execute'])await db.exec('grant execute on function '+name+' to '+role);if(f.acl?.some(acl=>acl.startsWith('service_role=X/')))await db.exec('grant execute on function '+name+' to service_role');}
 // Existing Core policy versions and UUID policies were installed by base SQL.
 for(const p of live.policies.filter(p=>!p.tablename.startsWith('ds_'))){await db.exec('create policy '+q(p.policyname)+' on '+q(p.schemaname)+'.'+q(p.tablename)+' as '+p.permissive+' for '+p.cmd+' to '+p.roles.map(r=>r==='public'?'public':q(r)).join(',')+(p.qual?' using ('+p.qual+')':'')+(p.with_check?' with check ('+p.with_check+')':''));}
 await db.exec(fs.readFileSync(file('_core_secure_accounts.sql'),'utf8'));
 const isolation=fs.readFileSync(file('_core_legacy_membership_boundary.sql'),'utf8');
 // Drift must fail atomically before creating the membership table.
 const predicate=live.functions.find(f=>f.name==='legacy_identity_allowed');
 await db.exec(predicate.definition.replace('auth.uid() is null','auth.uid() is null /* drift */'));
 await assert.rejects(()=>db.exec(isolation),/Reviewed isolation function changed/);await db.exec('rollback');
 assert.equal((await db.query("select to_regclass('ds_private.legacy_principals') t")).rows[0].t,null);await db.exec(predicate.definition);pass('function drift aborts without partial membership schema changes');
 await db.exec(`insert into auth.users values('${A}','not-live@example.invalid',now(),false)`);
 await assert.rejects(()=>db.exec(isolation),/Permanent Auth inventory changed/);await db.exec('rollback');await db.exec('delete from auth.users');
 assert.equal((await db.query("select to_regclass('ds_private.legacy_principals') t")).rows[0].t,null);pass('unexpected permanent identity aborts for an explicit operator membership decision');
 await db.exec('alter table public.profiles disable row level security');await assert.rejects(()=>db.exec(isolation),/RLS missing or disabled/);await db.exec('rollback');await db.exec('alter table public.profiles enable row level security');pass('disabled legacy RLS aborts the isolation migration');
 const tableHashBefore=(await db.query("select md5(string_agg(tablename||policyname||coalesce(qual,'')||coalesce(with_check,''),E'\n' order by tablename,policyname)) hash from pg_policies where schemaname='public' and tablename<>'daily_news_dispatch_items'")).rows[0].hash;
 const aclBefore=(await db.query("select p.oid::regprocedure::text signature,p.proacl::text acl from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' order by 1")).rows;
 await db.exec(isolation);
 assert.equal((await db.query('select count(*)::int n from ds_private.legacy_principals')).rows[0].n,0);
 assert.equal((await db.query("select md5(string_agg(tablename||policyname||coalesce(qual,'')||coalesce(with_check,''),E'\n' order by tablename,policyname)) hash from pg_policies where schemaname='public' and tablename<>'daily_news_dispatch_items'")).rows[0].hash,tableHashBefore);pass('real migration applies; no automatic members and only news restrictive policies split');
 await db.exec(`insert into auth.users values('${A}','a@example.invalid',now(),false),('${B}','b@example.invalid',now(),false),('${L}','legacy@example.invalid',now(),false),('${M}','legacy-admin@example.invalid',now(),false),('${ANON}',null,null,true);insert into ds_private.legacy_principals(user_id,review_reference) values('${L}','synthetic independent operator review'),('${M}','synthetic independent admin review');insert into profiles(user_id,role) values('${L}','Player'),('${M}','Admin'),('${A}','Admin');insert into username_reservations(username_normalized,claimed_by) values('legacy_reserved','${L}');insert into daily_news_runs(id,status,is_active,dispatch_date) values('${RUN}','success',true,current_date),('${INACTIVE}','success',false,current_date);insert into daily_news_dispatch_items(id,run_id,title) values(gen_random_uuid(),'${RUN}','Public active article'),(gen_random_uuid(),'${INACTIVE}','Private old article');insert into stores(id,name,slug,is_public,is_active) values(gen_random_uuid(),'Public store','public-store',true,true),(gen_random_uuid(),'Private store','private-store',false,true),(gen_random_uuid(),'Inactive store','inactive-store',true,false);insert into connected_match_sessions(id,host_user_id,status,created_at,started_at) values('${MATCH}','${L}','active',now(),now());insert into connected_match_participants(id,session_id,user_id,seat_index,terminal_state,display_name) values('${PART}','${MATCH}','${L}',0,'active','Legacy fixture');`);
 async function as(role,id,sql,args=[],claims={}){await db.exec('begin;set local role '+role);await db.query("select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claims',$2,true)",[id||'',JSON.stringify({role,...claims})]);try{const result=await db.query(sql,args);await db.exec('commit');return result;}catch(error){await db.exec('rollback');throw error;}}
 const core=(id,sql,args,claims)=>as('authenticated',id,sql,args,claims);
 for(const [role,id] of [['anon',null],['authenticated',A],['authenticated',ANON]]){
  assert.equal((await as(role,id,'select is_active_news_run($1) value',[RUN])).rows[0].value,true);
  assert.deepEqual((await as(role,id,'select title from daily_news_dispatch_items')).rows.map(r=>r.title),['Public active article']);
  assert.deepEqual((await as(role,id,'select name from store_public_profiles')).rows.map(r=>r.name),['Public store']);
 }pass('anon, Core and anonymous-Auth users read only active public news and public active store projection');
 await assert.rejects(()=>core(A,'insert into daily_news_dispatch_items(id,run_id,title) values(gen_random_uuid(),$1,$2)',[RUN,'Unauthorized new item']),/permission denied|row-level security|ANONYMOUS_LEGACY_ACCESS_DENIED/);
 await assert.rejects(()=>core(A,"update daily_news_dispatch_items set title='Unauthorized edit' where run_id=$1",[RUN]),/permission denied|row-level security|ANONYMOUS_LEGACY_ACCESS_DENIED/);
 assert.equal((await db.query('select title from daily_news_dispatch_items where run_id=$1',[RUN])).rows[0].title,'Public active article');pass('public news SELECT exception grants no new Core insert or update authority');
 for(const table of ['profiles','username_reservations','cloud_decks','connected_match_sessions'])assert.equal((await core(A,'select count(*)::int n from public.'+q(table))).rows[0].n,0,table);
 await db.exec(`insert into ds_private.legacy_principals(user_id,review_reference) values('${ANON}','synthetic mistaken grant must not bypass actual identity check')`);
 await assert.rejects(()=>core(A,"insert into ds_private.legacy_principals(user_id,review_reference) values($1,'self-claim')",[A]),/permission denied/);
 assert.equal((await core(A,'select ds_private.legacy_identity_allowed() value',[],{user_metadata:{role:'service_role',is_anonymous:false},app_metadata:{legacy:true}})).rows[0].value,false);
 assert.equal((await core(A,'select ds_private.legacy_identity_allowed() value',[],{role:'service_role'})).rows[0].value,false);
 assert.equal((await core(ANON,'select ds_private.legacy_identity_allowed() value')).rows[0].value,false);pass('Core cannot read private legacy rows or self-enroll despite Admin profile/editable metadata');
 const internals=['reserve_connected_match_usage','get_connected_match_monthly_limit','connected_match_complete_if_ready','increment_connected_match_cost_counter','record_connected_match_cost_event'];
 const arg=t=>t==='uuid'?"'"+MATCH+"'::uuid":t==='text'?"'fixture'::text":t==='text[]'?"array['fixture']::text[]":t==='jsonb'?"'{}'::jsonb":t==='boolean'?'false':t==='date'?'current_date':t==='timestamp with time zone'?'now()':['numeric','integer','bigint'].includes(t)?'1::'+t:(()=>{throw Error('Unhandled parameter '+t)})();
 const oldSignature=new Map(base.functions.map(f=>[f.proname,f.signature]));
 const publicLegacy=live.functions.filter(f=>f.schema==='public'&&(f.anon_execute||f.authenticated_execute)&&!f.name.startsWith('ds_')&&f.name!=='is_active_news_run'&&!/RETURNS (?:event_)?trigger/.test(f.definition));
 for(const f of publicLegacy){const signature=oldSignature.get(f.name);assert(signature,'Missing exact fixture signature '+f.name);const types=signature.slice(signature.indexOf('(')+1,-1);await assert.rejects(()=>core(A,'select public.'+f.name+'('+(types?types.split(',').map(arg).join(','):'')+')'),/permission denied|ANONYMOUS_LEGACY_ACCESS_DENIED/,f.name);}
 pass('all '+publicLegacy.length+' actual client-callable legacy non-trigger RPC bodies reject new permanent Core identity');
 for(const name of internals){const signature=oldSignature.get(name);assert.equal((await core(L,"select has_function_privilege(current_user,$1,'execute') allowed",['public.'+signature])).rows[0].allowed,false,name);}
 const changed=(await db.query("select p.oid::regprocedure::text signature,p.proacl::text acl from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' order by 1")).rows.filter((row,i)=>row.acl!==aclBefore[i].acl).map(row=>row.signature);
 assert.equal(changed.length,5);for(const signature of changed)assert(internals.some(name=>signature.startsWith(name+'(')));pass('only five identified internal EXECUTE ACLs change; checked wrapper grants preserved');
 // A checked definer wrapper still reaches its now-client-revoked internal.
 assert.equal((await core(L,'select complete_connected_match_if_ready($1) completed',[MATCH])).rows[0].completed,true);
 assert.equal((await db.query('select status from connected_match_sessions where id=$1',[MATCH])).rows[0].status,'completed');
 await assert.rejects(()=>core(M,'select complete_connected_match_if_ready($1)',[MATCH]),/not part of this Connected Match/);
 pass('admitted participant checked wrapper completes real match through revoked internal; admitted nonparticipant denied');
 // Service path retains direct internal access and can read only its intended contract.
 assert.equal((await as('service_role',null,'select * from get_connected_match_monthly_limit($1)',[L])).rows[0].monthly_limit,10);
 pass('existing trusted service-role helper path still executes');
 // Real new Core owner tables/RPCs continue operating alongside the boundary.
 await core(A,"select ds_core_onboard(auth.uid(),'core_a','00501',true,true)");await core(B,"select ds_core_onboard(auth.uid(),'core_b','90210',true,true)");
 const state=(await core(A,'select state from ds_core_workspaces')).rows[0].state;
 const saved=(await core(A,'select ds_core_save($1,$2,0,$3) value',[A,{...state,bulk:[{name:'Private fixture',quantity:1}]},RUN])).rows[0].value;assert.equal(saved.revision,1);
 assert.equal((await core(B,'select count(*)::int n from ds_core_workspaces where user_id=$1',[A])).rows[0].n,0);
 await assert.rejects(()=>core(B,'select ds_core_save($1,$2,1,$3)',[A,state,INACTIVE]),/ACCOUNT_CHANGED/);
 await assert.rejects(()=>as('anon',null,'select * from ds_core_workspaces'),/permission denied/);pass('new Core owner save works; anonymous and cross-user owner data remain denied');
 await assert.rejects(()=>core(A,"select ds_shared_load('legacy_player')"),/permission denied/);
 assert.equal((await core(A,'select count(*)::int n from ds_workspaces where user_id=$1',[L])).rows[0].n,0);pass('retired username API and old UUID-owned legacy rows cannot expose other accounts');
 // Prove the original wallet checked paths were not blanket-revoked.
 await db.exec(`insert into user_token_wallets(user_id,token_balance,lifetime_granted,lifetime_spent) values('${L}',100,0,0)`);
 assert.equal((await core(M,'select (grant_user_tokens($1,20)).token_balance n',[L])).rows[0].n,120);
 assert.equal((await core(L,'select (spend_user_tokens($1,5)).token_balance n',[L])).rows[0].n,115);pass('admitted legacy Admin grant and owner spend still enforce their original checked paths');
 // No live provider call: invoke the real service-only website scheduler lease.
 const begin=live.functions.find(f=>f.name==='begin_website_daily_news_run');assert(begin);
 await db.exec('grant select,insert,update on daily_news_runs to service_role');
 assert.equal((await as('service_role',null,'select begin_website_daily_news_run(current_date) run')).rows[0].run,null);pass('existing service-only news lease returns cached active run without refresh or external calls');
 const report={checks,legacyRpcBodiesInvoked:publicLegacy.length,changedInternalAcls:changed,syntheticOnly:true,hostedMutations:0,limitations:['Reconstructed saved schema, not full production backup','Only constraints needed by selected paths reproduced','No production triggers, PostgREST gateway, real Auth JWT signature verification or concurrency transport tested']};
 fs.writeFileSync('tests/accounts/core-isolation-report.json',JSON.stringify(report,null,2));console.log(checks+' real-SQL isolation proof groups passed. No hosted requests or mutations.');
 }finally{await db.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
