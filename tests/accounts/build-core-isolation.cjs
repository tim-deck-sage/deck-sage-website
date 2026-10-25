// Generate an UNAPPLIED local migration from the already audited catalog.
// No network, CLI link, live query, or live mutation is performed here.
const fs=require('fs'),crypto=require('node:crypto');
const catalog=require('../../docs/core-readonly-catalog-2026-10-25.json');
const target=fs.readdirSync('supabase/migrations').find(name=>name.endsWith('_core_legacy_membership_boundary.sql'));
if(!target)throw Error('Generate the local migration with supabase migration new first.');
const internals=[
 ['reserve_connected_match_usage','uuid,text'],
 ['get_connected_match_monthly_limit','uuid'],
 ['connected_match_complete_if_ready','uuid'],
 ['increment_connected_match_cost_counter','uuid,text,integer,integer,boolean'],
 ['record_connected_match_cost_event','uuid,uuid,text,integer,boolean,integer,jsonb'],
];
const literal=value=>"'"+value.replaceAll("'","''")+"'";
const reviewed=[['ds_private','legacy_identity_allowed',''],['public','is_active_news_run','uuid'],...internals.map(([name,args])=>['public',name,args])];
const entries=reviewed.map(([schema,name,args])=>{
 const f=catalog.functions.find(f=>f.schema===schema&&f.name===name);if(!f)throw Error('Missing reviewed definition '+name);
 const match=f.definition.match(/AS \$function\$([\s\S]*)\$function\$/);if(!match)throw Error('Unexpected function delimiter '+name);
 return '('+literal(schema+'.'+name+'('+args+')')+','+literal(crypto.createHash('md5').update(match[1]).digest('hex'))+')';
}).join(',\n');
const legacyTables=catalog.policies.filter(p=>p.policyname==='ds_deny_anonymous_legacy').map(p=>p.tablename).sort();
if(legacyTables.length!==62)throw Error('Unexpected reviewed legacy table inventory');
const sql=`-- LOCAL CANDIDATE ONLY. No live application authorized.
-- Target: mihmykgxbneuhlcxolzm. Source: saved read-only 2026-10-25 catalog.
-- Apply after core_secure_accounts, before enabling any permanent Core signup.
-- Preserve data and checked/service paths; no automatic legacy membership.
begin;
do $drift$
declare item record; body text; actual text[]; table_name text;
begin
 for item in select * from (values
${entries}
 ) reviewed(signature,body_md5) loop
  select prosrc into body from pg_proc where oid=to_regprocedure(item.signature);
  if body is null or md5(body)<>item.body_md5 then raise exception 'Reviewed isolation function changed: %',item.signature; end if;
 end loop;
 select array_agg(tablename order by tablename) into actual from pg_policies
 where schemaname='public' and policyname='ds_deny_anonymous_legacy'
 and permissive='RESTRICTIVE' and cmd='ALL' and roles=array['authenticated']::name[]
 and qual='( SELECT ds_private.legacy_identity_allowed() AS legacy_identity_allowed)'
 and with_check='( SELECT ds_private.legacy_identity_allowed() AS legacy_identity_allowed)';
 if actual is distinct from ARRAY[${legacyTables.map(literal).join(',')}]::text[] then raise exception 'Reviewed restrictive legacy policy inventory changed'; end if;
 foreach table_name in array actual loop
  if not coalesce((select relrowsecurity from pg_class where oid=to_regclass(format('public.%I',table_name))),false) then
   raise exception 'Reviewed legacy RLS missing or disabled: %',table_name;
  end if;
 end loop;
 if (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.prokind='f' and p.proname not like 'ds_%'
   and p.prorettype not in ('trigger'::regtype,'event_trigger'::regtype)
   and (has_function_privilege('anon',p.oid,'execute') or has_function_privilege('authenticated',p.oid,'execute')))<>81
   or exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.prokind='f' and p.proname not like 'ds_%' and p.proname<>'is_active_news_run'
   and p.prorettype not in ('trigger'::regtype,'event_trigger'::regtype)
   and (has_function_privilege('anon',p.oid,'execute') or has_function_privilege('authenticated',p.oid,'execute'))
   and position('ds_private.require_legacy_identity()' in p.prosrc)=0) then
  raise exception 'Reviewed legacy callable guard inventory changed';
 end if;
 if exists(select 1 from auth.users where is_anonymous is not true) then
  raise exception 'Permanent Auth inventory changed: explicit legacy membership review required before application';
 end if;
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='daily_news_dispatch_items'
   and policyname='Anyone can read cached active news dispatch items' and cmd='SELECT'
   and qual='is_active_news_run(run_id)' and roles=array['anon','authenticated']::name[]) then
  raise exception 'Reviewed public news read policy changed';
 end if;
 if (select array_agg(attname::text order by attnum) from pg_attribute
   where attrelid='public.store_public_profiles'::regclass and attnum>0 and not attisdropped)
   is distinct from ARRAY['id','name','slug','description','logo_url','website_url','phone','address_line1','address_line2','city','region','postal_code','country','timezone','created_at','updated_at']::text[] then
  raise exception 'Reviewed public store projection changed';
 end if;
end $drift$;

create table ds_private.legacy_principals (
 user_id uuid primary key references auth.users(id),
 granted_at timestamptz not null default now(),
 review_reference text not null check(length(btrim(review_reference))>0)
);
alter table ds_private.legacy_principals enable row level security;
revoke all on ds_private.legacy_principals from public,anon,authenticated;
-- Empty intentionally: audited project has no permanent legacy Auth identities.
-- An operator may grant an independently reviewed user membership later.
-- Do not seed from username, user_metadata, profiles, or simply being permanent.
create or replace function ds_private.legacy_identity_allowed() returns boolean
language sql stable security definer set search_path='' as $guard$
 select case when current_setting('role',true)='service_role' then true
 else exists(
  select 1 from auth.users u join ds_private.legacy_principals p on p.user_id=u.id
  where u.id=auth.uid() and u.is_anonymous is not true
 ) end;
$guard$;
-- Existing guarded RPCs and 62 restrictive policies now require membership.
-- Preserve helper EXECUTE grants: RLS uses it for authenticated callers, and
-- existing checked definer wrappers call it without new privileges.

-- A deliberately public predicate: reveals only whether a run is active/successful.
-- Its definer read bypasses private run RLS without exposing run/error metadata.
create or replace function public.is_active_news_run(input_run_id uuid) returns boolean
language sql stable security definer set search_path='' as $news$
 select exists(select 1 from public.daily_news_runs
 where id=input_run_id and status='success' and is_active=true);
$news$;
-- Existing permissive public SELECT predicate is preserved. Split only this
-- table's restrictive ALL policy so public active reads do not need membership.
drop policy ds_deny_anonymous_legacy on public.daily_news_dispatch_items;
create policy ds_legacy_news_select on public.daily_news_dispatch_items
 as restrictive for select to authenticated using(public.is_active_news_run(run_id));
create policy ds_legacy_news_insert on public.daily_news_dispatch_items
 as restrictive for insert to authenticated with check((select ds_private.legacy_identity_allowed()));
create policy ds_legacy_news_update on public.daily_news_dispatch_items
 as restrictive for update to authenticated using((select ds_private.legacy_identity_allowed())) with check((select ds_private.legacy_identity_allowed()));
create policy ds_legacy_news_delete on public.daily_news_dispatch_items
 as restrictive for delete to authenticated using((select ds_private.legacy_identity_allowed()));
-- Service role bypasses RLS as before. No news write grants are added.

-- Intentional public merchant projection, same 16 columns and public/active flags.
-- The underlying stores table and all private store data remain membership-gated.
create or replace view public.store_public_profiles as
 select id,name,slug,description,logo_url,website_url,phone,address_line1,address_line2,city,region,postal_code,country,timezone,created_at,updated_at
 from public.stores where is_public and is_active;

-- Internal entry points must only run behind their checked SECURITY DEFINER
-- wrappers or existing trusted service-role grants. Preserve those grants.
${internals.map(([name,args])=>'revoke execute on function public.'+name+'('+args+') from public,anon,authenticated;').join('\n')}
commit;
`;
fs.writeFileSync('supabase/migrations/'+target,sql);
console.log('Generated local-only isolation migration '+target+' from '+reviewed.length+' exact function definitions and 62 restrictive policies.');
