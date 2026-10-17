-- Separate atomic registration from username-only sign-in. Knowing a username
-- remains the complete access key by product decision; this adds no private auth.
begin;

create function ds_private.register_shared_workspace(p_username text,p_version text,p_terms boolean,p_privacy boolean) returns jsonb
language plpgsql security definer set search_path='' as $$
declare normalized text:=ds_private.normalize_shared_username(p_username); current_row ds_private.shared_workspaces;
begin
 if p_terms is distinct from true or p_privacy is distinct from true
    or not exists(select 1 from public.ds_policy_versions where version=p_version and active) then
  raise exception 'CURRENT_CONSENT_REQUIRED';
 end if;
 begin
  insert into ds_private.shared_workspaces(username,state,policy_version,terms_accepted,privacy_acknowledged)
  values(normalized,ds_private.shared_default_state(),p_version,true,true)
  returning * into current_row;
 exception when unique_violation then
  raise exception 'USERNAME_TAKEN';
 end;
 return jsonb_build_object('username',current_row.username,'state',current_row.state,'revision',current_row.revision,'created',true);
end $$;

create function public.ds_shared_register(p_username text,p_version text,p_terms boolean,p_privacy boolean) returns jsonb
language sql security invoker set search_path='' as $$
 select ds_private.register_shared_workspace(p_username,p_version,p_terms,p_privacy);
$$;

revoke execute on function ds_private.register_shared_workspace(text,text,boolean,boolean),public.ds_shared_register(text,text,boolean,boolean) from public,anon,authenticated;
grant execute on function ds_private.register_shared_workspace(text,text,boolean,boolean),public.ds_shared_register(text,text,boolean,boolean) to anon,authenticated;

commit;
