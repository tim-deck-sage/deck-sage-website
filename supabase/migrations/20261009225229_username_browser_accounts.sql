-- PENDING REVIEW: test-only migration, not applied to hosted Supabase.
begin;
create table ds_private.reserved_usernames (
 username text primary key check(username ~ '^[a-z0-9_]{3,24}$'),
 claimant_user_id uuid references auth.users(id) on delete restrict
);
insert into ds_private.reserved_usernames(username) values('tmoore');
alter table ds_private.reserved_usernames enable row level security;
revoke all on ds_private.reserved_usernames from public,anon,authenticated;

create or replace function ds_private.require_user(p_expected_user uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare owner uuid:=auth.uid();
begin
 if owner is distinct from p_expected_user then raise exception 'ACCOUNT_CHANGED' using errcode='42501'; end if;
 if owner is null or not exists(select 1 from auth.users where id=owner and
  (is_anonymous is true or (email_confirmed_at is not null and coalesce(is_anonymous,false)=false))) then
  raise exception 'AUTHENTICATED_USER_REQUIRED' using errcode='42501';
 end if;
 return owner;
end $$;

create or replace function ds_private.finish_onboarding(p_expected_user uuid,p_username text,p_version text,p_terms boolean,p_privacy boolean) returns void
language plpgsql security definer set search_path='' as $$
declare owner uuid:=ds_private.require_user(p_expected_user); existing text; reserved_owner uuid;
begin
 if p_terms is distinct from true or p_privacy is distinct from true or not exists(select 1 from public.ds_policy_versions where version=p_version and active) then raise exception 'CURRENT_CONSENT_REQUIRED'; end if;
 p_username:=lower(btrim(p_username));
 if p_username is null or p_username !~ '^[a-z0-9_]{3,24}$' then raise exception 'INVALID_USERNAME'; end if;
 perform 1 from auth.users where id=owner for update;
 select claimant_user_id into reserved_owner from ds_private.reserved_usernames where username=p_username for update;
 if found and reserved_owner is distinct from owner then raise exception 'USERNAME_RESERVED'; end if;
 select username into existing from public.ds_profiles where user_id=owner;
 if existing is not null and existing<>p_username then raise exception 'USERNAME_IS_PERMANENT'; end if;
 begin
  insert into public.ds_profiles(user_id,username) values(owner,p_username) on conflict(user_id) do nothing;
 exception when unique_violation then raise exception 'USERNAME_TAKEN'; end;
 insert into public.ds_consents(user_id,policy_version,terms_accepted,privacy_acknowledged) values(owner,p_version,true,true) on conflict do nothing;
 insert into public.ds_workspaces(user_id,state) values(owner,'{"version":1,"profile":{"name":"Planeswalker","username":"","avatar":1,"role":"Player","bio":""},"decks":[],"bulk":[],"favorites":[],"contacts":[],"stores":[],"notifications":[],"settings":{"theme":"forest","motion":true,"images":true,"notificationInbox":true}}'::jsonb) on conflict do nothing;
end $$;
-- Existing expected-UUID signatures, execute grants, owner RLS, CAS and import
-- checks remain. No anonymous-role grants, public username directory or admin grant.
commit;
