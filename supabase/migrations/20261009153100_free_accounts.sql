-- Pending review; local only. No application to any hosted project is authorized.
begin;
create schema if not exists ds_private;
revoke all on schema ds_private from public, anon, authenticated;
grant usage on schema ds_private to authenticated;

create table public.ds_policy_versions (
 version text primary key, terms_path text not null, privacy_path text not null,
 terms_effective_date date not null, privacy_effective_date date not null,
 active boolean not null default false
);
create unique index ds_one_active_policy on public.ds_policy_versions(active) where active;
insert into public.ds_policy_versions values ('web-2026-10-09-v1','/terms-of-use/','/privacy-policy/','2026-07-04','2026-07-30',true);
alter table public.ds_policy_versions enable row level security;
create policy ds_policy_read on public.ds_policy_versions for select to anon,authenticated using(true);

create table public.ds_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 username text not null unique check(username ~ '^[a-z0-9_]{3,24}$'),
 created_at timestamptz not null default now()
);
create table public.ds_consents (
 user_id uuid not null references auth.users(id) on delete cascade,
 policy_version text not null references public.ds_policy_versions(version),
 terms_accepted boolean not null check(terms_accepted),
 privacy_acknowledged boolean not null check(privacy_acknowledged),
 accepted_at timestamptz not null default now(), primary key(user_id,policy_version)
);
create index ds_consents_policy_idx on public.ds_consents(policy_version,user_id);
create table public.ds_workspaces (
 user_id uuid primary key references auth.users(id) on delete cascade,
 revision bigint not null default 0 check(revision>=0),
 state jsonb not null,
 updated_at timestamptz not null default now(),
 check((jsonb_typeof(state)='object' and state->>'version'='1') is true),
 check((jsonb_typeof(state->'decks')='array' and jsonb_typeof(state->'bulk')='array') is true),
 check(octet_length(state::text)<=30000000)
);
create table ds_private.operations (
 user_id uuid not null references auth.users(id) on delete cascade,
 operation uuid not null, expected_revision bigint not null, input_hash text not null,
 result_revision bigint not null, created_at timestamptz not null default now(), primary key(user_id,operation)
);
create index ds_operations_revision_idx on ds_private.operations(user_id,result_revision desc);
create table ds_private.imports (
 user_id uuid not null references auth.users(id) on delete cascade,
 fingerprint text not null,
 created_at timestamptz not null default now(), primary key(user_id,fingerprint)
);
create table ds_private.account_roles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 role text not null check(role='administrator'), granted_at timestamptz not null default now()
);
-- No client grants on roles/receipts, including to a username named tmoore.
alter table ds_private.operations enable row level security;
alter table ds_private.imports enable row level security;
alter table ds_private.account_roles enable row level security;
revoke all on all tables in schema ds_private from public,anon,authenticated;
alter table public.ds_profiles enable row level security;
alter table public.ds_consents enable row level security;
alter table public.ds_workspaces enable row level security;
create policy ds_profiles_read on public.ds_profiles for select to authenticated using((select auth.uid())=user_id);
create policy ds_consents_read on public.ds_consents for select to authenticated using((select auth.uid())=user_id);
create policy ds_workspaces_read on public.ds_workspaces for select to authenticated using((select auth.uid())=user_id);
-- Explicit grants survive Supabase's change to automatic Data API exposure.
-- Writes are RPC-only so clients cannot forge acceptance timestamps or bypass CAS.
revoke all on public.ds_policy_versions,public.ds_profiles,public.ds_consents,public.ds_workspaces from public,anon,authenticated;
grant select on public.ds_policy_versions to anon,authenticated;
grant select on public.ds_profiles,public.ds_consents,public.ds_workspaces to authenticated;

-- Privileged mutations live in a non-exposed schema. Each derives its owner from
-- auth.uid(), checks confirmed non-anonymous identity, and accepts no owner argument.
create function ds_private.require_user(p_expected_user uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare owner uuid:=auth.uid();
begin
 if owner is distinct from p_expected_user then raise exception 'ACCOUNT_CHANGED' using errcode='42501'; end if;
 if owner is null or not exists(select 1 from auth.users where id=owner and email_confirmed_at is not null and coalesce(is_anonymous,false)=false) then
  raise exception 'AUTHENTICATED_CONFIRMED_USER_REQUIRED' using errcode='42501';
 end if;
 return owner;
end $$;
create function ds_private.require_consent(owner uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if owner is distinct from auth.uid() or not exists(select 1 from public.ds_consents c join public.ds_policy_versions v on v.version=c.policy_version where c.user_id=owner and v.active and c.terms_accepted and c.privacy_acknowledged) then
  raise exception 'CURRENT_CONSENT_REQUIRED' using errcode='42501';
 end if;
end $$;
create function ds_private.finish_onboarding(p_expected_user uuid,p_username text,p_version text,p_terms boolean,p_privacy boolean) returns void
language plpgsql security definer set search_path='' as $$
declare owner uuid:=ds_private.require_user(p_expected_user); existing text;
begin
 if p_terms is distinct from true or p_privacy is distinct from true or not exists(select 1 from public.ds_policy_versions where version=p_version and active) then raise exception 'CURRENT_CONSENT_REQUIRED'; end if;
 if p_username is null or p_username !~ '^[a-z0-9_]{3,24}$' then raise exception 'INVALID_USERNAME'; end if;
 -- Serializes repeated onboarding for the same owner.
 perform 1 from auth.users where id=owner for update;
 select username into existing from public.ds_profiles where user_id=owner;
 if existing is not null and existing<>p_username then raise exception 'USERNAME_IS_PERMANENT'; end if;
 insert into public.ds_profiles(user_id,username) values(owner,p_username) on conflict(user_id) do nothing;
 insert into public.ds_consents(user_id,policy_version,terms_accepted,privacy_acknowledged) values(owner,p_version,true,true) on conflict do nothing;
 insert into public.ds_workspaces(user_id,state) values(owner,'{"version":1,"profile":{"name":"Planeswalker","username":"","avatar":1,"role":"Player","bio":""},"decks":[],"bulk":[],"favorites":[],"contacts":[],"stores":[],"notifications":[],"settings":{"theme":"forest","motion":true,"images":true,"notificationInbox":true}}'::jsonb) on conflict do nothing;
end $$;
create function ds_private.save_workspace(p_expected_user uuid,p_state jsonb,p_revision bigint,p_operation uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare owner uuid:=ds_private.require_user(p_expected_user); current_row public.ds_workspaces; receipt ds_private.operations; result jsonb;
begin
 perform ds_private.require_consent(owner);
 if p_operation is null then raise exception 'OPERATION_REQUIRED'; end if;
 select * into current_row from public.ds_workspaces where user_id=owner for update;
 if not found then raise exception 'ONBOARDING_REQUIRED'; end if;
 select * into receipt from ds_private.operations where user_id=owner and operation=p_operation;
 if found then
  if receipt.input_hash<>encode(sha256(convert_to(p_state::text,'UTF8')),'hex') or receipt.expected_revision<>p_revision then raise exception 'OPERATION_REUSE'; end if;
  if current_row.revision<>receipt.result_revision then raise exception 'REVISION_CONFLICT'; end if;
  return jsonb_build_object('revision',current_row.revision,'state',current_row.state);
 end if;
 if p_revision is null or p_revision<>current_row.revision then raise exception 'REVISION_CONFLICT'; end if;
 update public.ds_workspaces set state=p_state,revision=revision+1,updated_at=now() where user_id=owner returning jsonb_build_object('revision',revision,'state',state) into result;
 insert into ds_private.operations values(owner,p_operation,p_revision,encode(sha256(convert_to(p_state::text,'UTF8')),'hex'),current_row.revision+1,now());
 -- Bound receipt storage; an expired old retry still fails its stale revision.
 delete from ds_private.operations where user_id=owner and operation not in(select operation from ds_private.operations where user_id=owner order by result_revision desc limit 100);
 return result;
end $$;
create function ds_private.import_guest(p_expected_user uuid,p_state jsonb,p_revision bigint) returns jsonb
language plpgsql security definer set search_path='' as $$
declare owner uuid:=ds_private.require_user(p_expected_user); current_row public.ds_workspaces; v_fingerprint text:=encode(sha256(convert_to(p_state::text,'UTF8')),'hex'); result jsonb;
begin
 perform ds_private.require_consent(owner);
 select * into current_row from public.ds_workspaces where user_id=owner for update;
 if not found then raise exception 'ONBOARDING_REQUIRED'; end if;
 if exists(select 1 from ds_private.imports where user_id=owner and fingerprint=v_fingerprint) then
  return jsonb_build_object('revision',current_row.revision,'state',current_row.state);
 end if;
 if p_revision is null or p_revision<>current_row.revision then raise exception 'REVISION_CONFLICT'; end if;
 if current_row.revision<>0 then raise exception 'IMPORT_REQUIRES_EMPTY_NEW_ACCOUNT'; end if;
 update public.ds_workspaces set state=p_state,revision=revision+1,updated_at=now() where user_id=owner returning jsonb_build_object('revision',revision,'state',state) into result;
 insert into ds_private.imports(user_id,fingerprint) values(owner,v_fingerprint);
 return result;
end $$;
create function ds_private.is_administrator() returns boolean
language plpgsql security definer set search_path='' as $$
declare owner uuid:=ds_private.require_user(auth.uid());
begin
 return exists(select 1 from ds_private.account_roles where user_id=owner and role='administrator');
end $$;
-- Public wrappers are invokers. No SECURITY DEFINER API in an exposed schema.
create function public.ds_finish_onboarding(p_expected_user uuid,p_username text,p_version text,p_terms boolean,p_privacy boolean) returns void
language sql security invoker set search_path='' as $$ select ds_private.finish_onboarding(p_expected_user,p_username,p_version,p_terms,p_privacy); $$;
create function public.ds_save_workspace(p_expected_user uuid,p_state jsonb,p_revision bigint,p_operation uuid) returns jsonb
language sql security invoker set search_path='' as $$ select ds_private.save_workspace(p_expected_user,p_state,p_revision,p_operation); $$;
create function public.ds_import_guest(p_expected_user uuid,p_state jsonb,p_revision bigint) returns jsonb
language sql security invoker set search_path='' as $$ select ds_private.import_guest(p_expected_user,p_state,p_revision); $$;
create function public.ds_is_administrator() returns boolean
language sql security invoker set search_path='' as $$ select ds_private.is_administrator(); $$;
revoke execute on all functions in schema ds_private from public,anon,authenticated;
grant execute on function ds_private.finish_onboarding(uuid,text,text,boolean,boolean),ds_private.save_workspace(uuid,jsonb,bigint,uuid),ds_private.import_guest(uuid,jsonb,bigint),ds_private.is_administrator() to authenticated;
revoke execute on function public.ds_finish_onboarding(uuid,text,text,boolean,boolean),public.ds_save_workspace(uuid,jsonb,bigint,uuid),public.ds_import_guest(uuid,jsonb,bigint),public.ds_is_administrator() from public,anon,authenticated;
grant execute on function public.ds_finish_onboarding(uuid,text,text,boolean,boolean),public.ds_save_workspace(uuid,jsonb,bigint,uuid),public.ds_import_guest(uuid,jsonb,bigint),public.ds_is_administrator() to authenticated;
commit;
