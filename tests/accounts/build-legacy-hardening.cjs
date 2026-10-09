const fs=require('fs'),crypto=require('node:crypto');const snapshot=require('./fixtures/legacy-test-catalog.json');
const functions=snapshot.functions.filter(f=>(f.anon_execute||f.authenticated_execute)&&!f.proname.startsWith('ds_')&&!/RETURNS (?:event_)?trigger/.test(f.definition));
const tables=snapshot.tables.filter(t=>!t.relname.startsWith('ds_'));const serviceNames=['get_store_daily_push_digest_candidates','mark_store_daily_push_sent'];const patched=snapshot.functions.filter(f=>serviceNames.includes(f.proname));
const literal=s=>"'"+s.replaceAll("'","''")+"'";const body=f=>f.definition.split('AS $function$')[1].split('$function$')[0];const entries=functions.concat(patched).map(f=>'('+literal('public.'+f.signature)+','+literal(crypto.createHash('md5').update(body(f)).digest('hex'))+','+(serviceNames.includes(f.proname)?'false':'true')+')').join(',\n');
const view=require('./fixtures/legacy-test-extra.json').views[0];const viewHash=crypto.createHash('md5').update(view.definition).digest('hex');
const sql=`-- TEST PROJECT ONLY: mihmykgxbneuhlcxolzm. PENDING separate review/authorization.
-- No hosted execution. Reviewed catalog snapshot: tests/accounts/fixtures/legacy-test-catalog.json.
-- Preserve permanent-user/client grants and service behavior; reject anonymous Auth
-- before all 81 client-callable non-trigger legacy functions and on 62 legacy tables.
-- Four wallet and two service-only role guards fail closed when the role is NULL.
begin;
create or replace function ds_private.legacy_identity_allowed() returns boolean
language sql stable security definer set search_path='' as $guard$
 select case when auth.uid() is null then true else exists(
  select 1 from auth.users where id=auth.uid() and is_anonymous is not true
 ) end;
$guard$;
create or replace function ds_private.require_legacy_identity() returns void
language plpgsql stable security definer set search_path='' as $guard$
begin
 if not ds_private.legacy_identity_allowed() then
  raise exception 'ANONYMOUS_LEGACY_ACCESS_DENIED' using errcode='42501';
 end if;
end;
$guard$;
revoke all on function ds_private.legacy_identity_allowed(),ds_private.require_legacy_identity() from public,anon,authenticated;
-- Private helper execution only, no private table or existing RPC privileges added.
grant usage on schema ds_private to anon;
grant execute on function ds_private.legacy_identity_allowed(),ds_private.require_legacy_identity() to anon,authenticated;

do $migration$
declare item record; oid_value oid; original_body text; guarded_body text; definition text; language_name text; exposed_count integer;
begin
 select count(*) into exposed_count from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.prokind='f' and p.oid not in ('public.ds_finish_onboarding(uuid,text,text,boolean,boolean)'::regprocedure,'public.ds_save_workspace(uuid,jsonb,bigint,uuid)'::regprocedure,'public.ds_import_guest(uuid,jsonb,bigint)'::regprocedure,'public.ds_is_administrator()'::regprocedure)
 and p.prorettype not in ('trigger'::regtype,'event_trigger'::regtype)
 and (has_function_privilege('anon',p.oid,'execute') or has_function_privilege('authenticated',p.oid,'execute'));
 if exposed_count<>${functions.length} then raise exception 'Legacy exposed function inventory changed; re-audit required'; end if;
 for item in select * from (values
${entries}
 ) as reviewed(signature,body_md5,guard_anonymous)
 loop
  oid_value:=to_regprocedure(item.signature);
  if oid_value is null then raise exception 'Reviewed function missing: %',item.signature; end if;
  if item.guard_anonymous and not (has_function_privilege('anon',oid_value,'execute') or has_function_privilege('authenticated',oid_value,'execute')) then raise exception 'Reviewed callable inventory changed: %',item.signature; end if;
  select p.prosrc,l.lanname into original_body,language_name from pg_proc p join pg_language l on l.oid=p.prolang where p.oid=oid_value;
  if md5(original_body)<>item.body_md5 then raise exception 'Reviewed function changed: %',item.signature; end if;
  guarded_body:=replace(original_body,'public.current_user_role() not in (''Admin'', ''SuperAdmin'')','not coalesce(public.current_user_role() in (''Admin'', ''SuperAdmin''), false)');
  guarded_body:=replace(guarded_body,'target_user_id <> auth.uid()','target_user_id is distinct from auth.uid()');
  guarded_body:=replace(guarded_body,'auth.role() <> ''service_role''','auth.role() is distinct from ''service_role''');
  if item.guard_anonymous then
   if language_name='plpgsql' then
    -- Outer guard runs before declarations and outside original exception handlers.
    guarded_body:=E'begin\\n perform ds_private.require_legacy_identity();\\n'||guarded_body||E'\\nend;';
   elsif language_name='sql' then
    -- Multiple statements prevent SQL inlining from discarding the guard.
    guarded_body:=E'select ds_private.require_legacy_identity();\\n'||guarded_body;
   else raise exception 'Unsupported reviewed function language: %',item.signature;
   end if;
  end if;
  definition:=pg_get_functiondef(oid_value);
  if position('AS $function$' in definition)=0 then raise exception 'Unexpected function delimiter: %',item.signature; end if;
  definition:=substring(definition from 1 for position('AS $function$' in definition)-1);
  -- Change header volatility only; preserve original body literals.
  if item.guard_anonymous then definition:=replace(definition,' IMMUTABLE',' STABLE'); end if;
  definition:=definition||'AS '||quote_literal(guarded_body)||';';
  execute definition;
 end loop;
end;
$migration$;

do $policies$
declare table_name text; table_count integer; target oid;
begin
 select count(*) into table_count from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relkind in ('r','p') and c.relname not in ('ds_policy_versions','ds_profiles','ds_consents','ds_workspaces');
 if table_count<>${tables.length} then raise exception 'Legacy table inventory changed; re-audit required'; end if;
 foreach table_name in array ARRAY[${tables.map(t=>literal(t.relname)).join(',')}]
 loop
  target:=to_regclass(format('public.%I',table_name));
  if target is null or not (select relrowsecurity from pg_class where oid=target) then raise exception 'Reviewed RLS table missing/disabled: %',table_name; end if;
  execute format('create policy ds_deny_anonymous_legacy on public.%I as restrictive for all to authenticated using ((select ds_private.legacy_identity_allowed())) with check ((select ds_private.legacy_identity_allowed()))',table_name);
 end loop;
end;
$policies$;
-- The public store projection is an owner-rights view and bypasses base-table RLS.
-- Keep its public unauthenticated behavior but explicitly filter anonymous Auth.
do $view$
begin
 if (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('v','m'))<>1 then raise exception 'Public view inventory changed; re-audit required'; end if;
 if md5(pg_get_viewdef('public.store_public_profiles'::regclass,true))<>${literal(viewHash)} then raise exception 'Reviewed store view changed; re-audit required'; end if;
end;
$view$;
create or replace view public.store_public_profiles as
 select id,name,slug,description,logo_url,website_url,phone,address_line1,address_line2,city,region,postal_code,country,timezone,created_at,updated_at
 from public.stores where is_public and is_active and (select ds_private.legacy_identity_allowed());
commit;
`;
fs.writeFileSync('supabase/migrations/20261009231336_legacy_anonymous_hardening.sql',sql);console.log('Generated held hardening: '+functions.length+' RPC guards, '+tables.length+' restrictive policies, '+patched.length+' service-only guard fixes.');

