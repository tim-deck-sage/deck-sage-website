-- Test-project shared username workspaces. A username is the access key by product
-- decision: anyone who knows it can load and change that one workspace. This is
-- deliberately separate from auth-owned ds_* records, legacy app tables and roles.
begin;

create table ds_private.shared_workspaces (
 username text primary key check (username ~ '^[a-z0-9_]{3,24}$'),
 state jsonb not null,
 revision bigint not null default 0 check (revision >= 0),
 policy_version text not null references public.ds_policy_versions(version) on update restrict on delete restrict,
 terms_accepted boolean not null check (terms_accepted),
 privacy_acknowledged boolean not null check (privacy_acknowledged),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table ds_private.shared_operations (
 username text not null references ds_private.shared_workspaces(username) on update cascade on delete cascade,
 operation_id uuid not null,
 base_revision bigint not null,
 resulting_revision bigint not null,
 state_hash text not null,
 response jsonb not null,
 created_at timestamptz not null default now(),
 primary key (username,operation_id)
);
create index shared_operations_recent on ds_private.shared_operations(username,created_at desc);
create index shared_workspaces_policy_version on ds_private.shared_workspaces(policy_version);
alter table ds_private.shared_workspaces enable row level security;
alter table ds_private.shared_operations enable row level security;
revoke all on ds_private.shared_workspaces,ds_private.shared_operations from public,anon,authenticated;

create function ds_private.normalize_shared_username(p_username text) returns text
language plpgsql immutable security invoker set search_path='' as $$
declare normalized text:=lower(btrim(p_username));
begin
 if normalized is null or normalized !~ '^[a-z0-9_]{3,24}$' then
  raise exception 'INVALID_USERNAME';
 end if;
 return normalized;
end $$;

create function ds_private.shared_default_state() returns jsonb
language sql immutable security invoker set search_path='' as $$
 select '{"version":1,"profile":{"name":"Planeswalker","username":"","avatar":1,"role":"Player","bio":""},"decks":[],"bulk":[],"favorites":[],"contacts":[],"stores":[],"notifications":[],"settings":{"theme":"forest","motion":true,"images":true,"notificationInbox":true}}'::jsonb;
$$;

create function ds_private.validate_shared_state(p_state jsonb) returns void
language plpgsql immutable security invoker set search_path='' as $$
begin
 if p_state is null or jsonb_typeof(p_state)<>'object'
    or p_state->>'version'<>'1'
    or jsonb_typeof(p_state->'decks')<>'array'
    or jsonb_typeof(p_state->'bulk')<>'array'
    or octet_length(p_state::text)>30000000 then
  raise exception 'INVALID_WORKSPACE';
 end if;
end $$;

create function ds_private.open_shared_workspace(p_username text,p_version text,p_terms boolean,p_privacy boolean) returns jsonb
language plpgsql security definer set search_path='' as $$
declare normalized text:=ds_private.normalize_shared_username(p_username); current_row ds_private.shared_workspaces; created boolean:=false;
begin
 if p_terms is distinct from true or p_privacy is distinct from true
    or not exists(select 1 from public.ds_policy_versions where version=p_version and active) then
  raise exception 'CURRENT_CONSENT_REQUIRED';
 end if;
 insert into ds_private.shared_workspaces(username,state,policy_version,terms_accepted,privacy_acknowledged)
 values(normalized,ds_private.shared_default_state(),p_version,true,true)
 on conflict(username) do nothing returning true into created;
 select * into strict current_row from ds_private.shared_workspaces where username=normalized;
 return jsonb_build_object('username',current_row.username,'state',current_row.state,'revision',current_row.revision,'created',coalesce(created,false));
end $$;

create function ds_private.load_shared_workspace(p_username text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare normalized text:=ds_private.normalize_shared_username(p_username); current_row ds_private.shared_workspaces;
begin
 select * into current_row from ds_private.shared_workspaces where username=normalized;
 if not found then raise exception 'USERNAME_NOT_FOUND'; end if;
 return jsonb_build_object('username',current_row.username,'state',current_row.state,'revision',current_row.revision);
end $$;

create function ds_private.save_shared_workspace(p_username text,p_state jsonb,p_revision bigint,p_operation uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare normalized text:=ds_private.normalize_shared_username(p_username); current_row ds_private.shared_workspaces; receipt ds_private.shared_operations; result jsonb; state_hash text;
begin
 perform ds_private.validate_shared_state(p_state);
 if p_operation is null then raise exception 'OPERATION_REQUIRED'; end if;
 if p_revision is null or p_revision < 0 then raise exception 'INVALID_REVISION'; end if;
 state_hash:=encode(sha256(convert_to(p_state::text,'UTF8')),'hex');
 -- Serialize before checking receipts so simultaneous retries with the same
 -- operation ID both return the first saved result.
 select * into current_row from ds_private.shared_workspaces where username=normalized for update;
 if not found then raise exception 'USERNAME_NOT_FOUND'; end if;
 select * into receipt from ds_private.shared_operations where username=normalized and operation_id=p_operation;
 if found then
  if receipt.base_revision<>p_revision or receipt.state_hash<>state_hash then raise exception 'OPERATION_REUSE'; end if;
  return receipt.response;
 end if;
 if current_row.revision<>p_revision then raise exception 'REVISION_CONFLICT'; end if;
 update ds_private.shared_workspaces set state=p_state,revision=revision+1,updated_at=now() where username=normalized
 returning * into current_row;
 result:=jsonb_build_object('username',current_row.username,'state',current_row.state,'revision',current_row.revision);
 insert into ds_private.shared_operations(username,operation_id,base_revision,resulting_revision,state_hash,response)
 values(normalized,p_operation,p_revision,current_row.revision,state_hash,result);
 delete from ds_private.shared_operations where username=normalized and operation_id not in (
  select operation_id from ds_private.shared_operations where username=normalized order by created_at desc,operation_id limit 100
 );
 return result;
end $$;

create function public.ds_shared_open(p_username text,p_version text,p_terms boolean,p_privacy boolean) returns jsonb
language sql security invoker set search_path='' as $$ select ds_private.open_shared_workspace(p_username,p_version,p_terms,p_privacy); $$;
create function public.ds_shared_load(p_username text) returns jsonb
language sql security invoker set search_path='' as $$ select ds_private.load_shared_workspace(p_username); $$;
create function public.ds_shared_save(p_username text,p_state jsonb,p_revision bigint,p_operation uuid) returns jsonb
language sql security invoker set search_path='' as $$ select ds_private.save_shared_workspace(p_username,p_state,p_revision,p_operation); $$;

grant usage on schema ds_private to anon,authenticated;
revoke execute on function ds_private.normalize_shared_username(text),ds_private.shared_default_state(),ds_private.validate_shared_state(jsonb),ds_private.open_shared_workspace(text,text,boolean,boolean),ds_private.load_shared_workspace(text),ds_private.save_shared_workspace(text,jsonb,bigint,uuid) from public,anon,authenticated;
grant execute on function ds_private.open_shared_workspace(text,text,boolean,boolean),ds_private.load_shared_workspace(text),ds_private.save_shared_workspace(text,jsonb,bigint,uuid) to anon,authenticated;
revoke execute on function public.ds_shared_open(text,text,boolean,boolean),public.ds_shared_load(text),public.ds_shared_save(text,jsonb,bigint,uuid) from public,anon,authenticated;
grant execute on function public.ds_shared_open(text,text,boolean,boolean),public.ds_shared_load(text),public.ds_shared_save(text,jsonb,bigint,uuid) to anon,authenticated;
commit;
