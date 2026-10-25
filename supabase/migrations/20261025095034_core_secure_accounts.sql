-- STAGED ONLY. Requires exact live approval and shared-project isolation review.
-- No legacy account/data adoption, deletion, Auth settings, or cross-app changes.
begin;
create schema ds_core_private;
revoke all on schema ds_core_private from public,anon,authenticated;
grant usage on schema ds_core_private to authenticated,service_role;

create table public.ds_core_profiles (
 user_id uuid primary key references auth.users(id),
 username text not null unique check(username ~ '^[a-z0-9_]{3,24}$'),
 zip_code text not null check(zip_code ~ '^[0-9]{5}$'),
 policy_version text not null check(policy_version='core-accounts-2026-10-25'),
 accepted_at timestamptz not null default now()
);
create table public.ds_core_workspaces (
 user_id uuid primary key references public.ds_core_profiles(user_id),
 revision bigint not null default 0 check(revision>=0),
 state jsonb not null,
 updated_at timestamptz not null default now()
);
create table ds_core_private.operations (
 user_id uuid not null references public.ds_core_profiles(user_id),
 operation uuid not null, revision bigint not null, input_hash text not null,
 result jsonb not null, created_at timestamptz not null default now(),
 primary key(user_id,operation)
);
create table ds_core_private.login_limits (
 key_hash text primary key, window_start timestamptz not null, attempts integer not null
);
alter table public.ds_core_profiles enable row level security;
alter table public.ds_core_workspaces enable row level security;
alter table ds_core_private.operations enable row level security;
alter table ds_core_private.login_limits enable row level security;
revoke all on public.ds_core_profiles,public.ds_core_workspaces from public,anon,authenticated;
revoke all on ds_core_private.operations,ds_core_private.login_limits from public,anon,authenticated;
grant select on public.ds_core_profiles,public.ds_core_workspaces to authenticated;

create function ds_core_private.require_user() returns uuid
language plpgsql stable security definer set search_path='' as $$
declare owner uuid:=auth.uid();
begin
 if owner is null or not exists(select 1 from auth.users where id=owner
   and email_confirmed_at is not null and coalesce(is_anonymous,false)=false) then
  raise exception 'AUTHENTICATION_REQUIRED' using errcode='42501';
 end if;
 return owner;
end $$;
create policy core_profile_owner on public.ds_core_profiles for select to authenticated
using(user_id=(select ds_core_private.require_user()));
create policy core_workspace_owner on public.ds_core_workspaces for select to authenticated
using(user_id=(select ds_core_private.require_user()));

create function ds_core_private.onboard(p_username text,p_zip text,p_terms boolean,p_privacy boolean) returns void
language plpgsql security definer set search_path='' as $$
declare owner uuid:=ds_core_private.require_user(); normalized text:=lower(btrim(p_username));
begin
 if p_terms is distinct from true or p_privacy is distinct from true then raise exception 'CONSENT_REQUIRED'; end if;
 if normalized is null or normalized !~ '^[a-z0-9_]{3,24}$' then raise exception 'INVALID_USERNAME'; end if;
 if p_zip is null or p_zip !~ '^[0-9]{5}$' then raise exception 'INVALID_ZIP'; end if;
 perform 1 from auth.users where id=owner for update;
 if exists(select 1 from public.ds_core_profiles where user_id=owner) then raise exception 'ALREADY_REGISTERED'; end if;
 -- Legacy names and data are separate: choosing a matching name confers no access.
 insert into public.ds_core_profiles(user_id,username,zip_code,policy_version)
 values(owner,normalized,p_zip,'core-accounts-2026-10-25');
 insert into public.ds_core_workspaces(user_id,state)
 values(owner,ds_private.shared_default_state());
exception when unique_violation then raise exception 'USERNAME_UNAVAILABLE';
end $$;

create function ds_core_private.save(p_expected_user uuid,p_state jsonb,p_revision bigint,p_operation uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare owner uuid:=ds_core_private.require_user(); row public.ds_core_workspaces;
 receipt ds_core_private.operations; digest text; result jsonb;
begin
 if owner is distinct from p_expected_user then raise exception 'ACCOUNT_CHANGED' using errcode='42501'; end if;
 if p_operation is null or p_revision is null or p_revision<0 then raise exception 'INVALID_OPERATION'; end if;
 perform ds_private.validate_shared_state(p_state);
 digest:=encode(sha256(convert_to(p_state::text,'UTF8')),'hex');
 select * into row from public.ds_core_workspaces where user_id=owner for update;
 if not found then raise exception 'ONBOARDING_REQUIRED'; end if;
 select * into receipt from ds_core_private.operations where user_id=owner and operation=p_operation;
 if found then
  if receipt.revision<>p_revision or receipt.input_hash<>digest then raise exception 'OPERATION_REUSE'; end if;
  if row.revision<>(receipt.result->>'revision')::bigint then raise exception 'REVISION_CONFLICT'; end if;
  return receipt.result;
 end if;
 if row.revision<>p_revision then raise exception 'REVISION_CONFLICT'; end if;
 update public.ds_core_workspaces set state=p_state,revision=revision+1,updated_at=now() where user_id=owner
 returning jsonb_build_object('state',state,'revision',revision) into result;
 insert into ds_core_private.operations(user_id,operation,revision,input_hash,result) values(owner,p_operation,p_revision,digest,result);
 delete from ds_core_private.operations where user_id=owner and operation not in
 (select operation from ds_core_private.operations where user_id=owner order by created_at desc,operation limit 100);
 return result;
end $$;
create function public.ds_core_onboard(p_username text,p_zip text,p_terms boolean,p_privacy boolean) returns void
language sql security invoker set search_path='' as $$select ds_core_private.onboard(p_username,p_zip,p_terms,p_privacy)$$;
create function public.ds_core_save(p_expected_user uuid,p_state jsonb,p_revision bigint,p_operation uuid) returns jsonb
language sql security invoker set search_path='' as $$select ds_core_private.save(p_expected_user,p_state,p_revision,p_operation)$$;

-- Edge-only username resolution. No email directory callable by website users.
create function public.ds_core_login_email(p_username text) returns text
language sql stable security definer set search_path='' as $$
 select u.email from public.ds_core_profiles p join auth.users u on u.id=p.user_id
 where p.username=lower(btrim(p_username)) and u.email_confirmed_at is not null and coalesce(u.is_anonymous,false)=false
$$;
-- Atomic counters: no raw email, username, password or IP retained. All attempts count.
create function public.ds_core_login_attempt(p_key_hash text,p_limit integer) returns boolean
language plpgsql security definer set search_path='' as $$
declare attempts integer;
begin
 if p_key_hash !~ '^[0-9a-f]{64}$' or p_limit not between 1 and 300 then raise exception 'INVALID_LIMIT'; end if;
 insert into ds_core_private.login_limits values(p_key_hash,now(),1)
 on conflict(key_hash) do update set
 attempts=case when login_limits.window_start<now()-interval '1 minute' then 1 else login_limits.attempts+1 end,
 window_start=case when login_limits.window_start<now()-interval '1 minute' then now() else login_limits.window_start end
 returning login_limits.attempts into attempts;
 delete from ds_core_private.login_limits where window_start<now()-interval '1 day';
 return attempts<=p_limit;
end $$;

revoke all on all functions in schema ds_core_private from public,anon,authenticated;
grant execute on function ds_core_private.require_user(),ds_core_private.onboard(text,text,boolean,boolean),ds_core_private.save(uuid,jsonb,bigint,uuid) to authenticated;
revoke all on function public.ds_core_onboard(text,text,boolean,boolean),public.ds_core_save(uuid,jsonb,bigint,uuid),public.ds_core_login_email(text),public.ds_core_login_attempt(text,integer) from public,anon,authenticated;
grant execute on function public.ds_core_onboard(text,text,boolean,boolean),public.ds_core_save(uuid,jsonb,bigint,uuid) to authenticated;
grant execute on function public.ds_core_login_email(text),public.ds_core_login_attempt(text,integer) to service_role;

-- Retain beta rows and receipts, but retire every username-only entry point.
revoke execute on function public.ds_shared_open(text,text,boolean,boolean),public.ds_shared_register(text,text,boolean,boolean),public.ds_shared_load(text),public.ds_shared_save(text,jsonb,bigint,uuid) from public,anon,authenticated;
revoke execute on function ds_private.open_shared_workspace(text,text,boolean,boolean),ds_private.register_shared_workspace(text,text,boolean,boolean),ds_private.load_shared_workspace(text),ds_private.save_shared_workspace(text,jsonb,bigint,uuid) from public,anon,authenticated;
commit;
