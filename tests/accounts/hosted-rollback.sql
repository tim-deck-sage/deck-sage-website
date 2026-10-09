-- Run only against mihmykgxbneuhlcxolzm AFTER migration/security review.
-- No passwords, tokens or persistent credentials. Both fixture users and every
-- website row are created inside this transaction and rolled back at the end.
-- Run the whole script in ONE database connection. Any assertion failure aborts
-- the transaction; explicitly ROLLBACK before reusing that connection.
begin;
create temporary table ds_test_ids(a uuid,b uuid);
insert into ds_test_ids values(gen_random_uuid(),gen_random_uuid());
grant select on ds_test_ids to authenticated;
insert into auth.users(id,email,email_confirmed_at,is_anonymous,raw_user_meta_data)
select a,'ds-transaction-a-'||a::text||'@example.invalid',now(),false,jsonb_build_object('username','ds_a_'||left(replace(a::text,'-',''),12)) from ds_test_ids
union all
select b,'ds-transaction-b-'||b::text||'@example.invalid',now(),false,jsonb_build_object('username','ds_b_'||left(replace(b::text,'-',''),12)) from ds_test_ids;

set local role authenticated;
select set_config('request.jwt.claim.sub',(select a::text from ds_test_ids),true);
select public.ds_finish_onboarding(auth.uid(),'ds_a_'||left(replace(a::text,'-',''),12),'web-2026-10-09-v1',true,true) from ds_test_ids;
select public.ds_save_workspace(auth.uid(),'{"version":1,"decks":[],"bulk":[{"name":"A transaction card","quantity":2}]}',0,gen_random_uuid());
do $$ begin
 if (select count(*) from public.ds_workspaces)<>1 then raise exception 'FAIL: A owner read'; end if;
 if (select count(*) from public.ds_consents where policy_version='web-2026-10-09-v1' and terms_accepted and privacy_acknowledged and accepted_at is not null)<>1 then raise exception 'FAIL: consent record'; end if;
 if public.ds_is_administrator() then raise exception 'FAIL: fixture unexpectedly administrator'; end if;
 begin
  update public.ds_workspaces set user_id=(select b from ds_test_ids);
  raise exception 'FAIL: owner reassignment allowed';
 exception when insufficient_privilege then null; end;
 begin
  select public.ds_save_workspace(auth.uid(),'{"version":1,"decks":[],"bulk":[]}',0,gen_random_uuid());
  raise exception 'FAIL: stale revision allowed';
 exception when others then
  if sqlerrm not like '%REVISION_CONFLICT%' then raise; end if;
 end;
end $$;

select set_config('request.jwt.claim.sub',(select b::text from ds_test_ids),true);
select public.ds_finish_onboarding(auth.uid(),'ds_b_'||left(replace(b::text,'-',''),12),'web-2026-10-09-v1',true,true) from ds_test_ids;
do $$ begin
 if exists(select 1 from public.ds_workspaces where user_id=(select a from ds_test_ids)) then raise exception 'FAIL: B read A collection'; end if;
 if exists(select 1 from public.ds_profiles where user_id=(select a from ds_test_ids)) then raise exception 'FAIL: B read A profile'; end if;
 if exists(select 1 from public.ds_consents where user_id=(select a from ds_test_ids)) then raise exception 'FAIL: B read A consent'; end if;
 if (select state->'bulk' from public.ds_workspaces)<>'[]'::jsonb then raise exception 'FAIL: B collection not independent'; end if;
end $$;

select set_config('request.jwt.claim.sub','',true);
do $$ begin
 if exists(select 1 from public.ds_workspaces) then raise exception 'FAIL: missing JWT owner sees data'; end if;
end $$;
select set_config('request.jwt.claim.sub',(select a::text from ds_test_ids),true);
do $$ begin
 if (select state->'bulk'->0->>'quantity' from public.ds_workspaces)<>'2' then raise exception 'FAIL: relogin persistence'; end if;
end $$;

reset role;
set local role anon;
do $$ begin
 begin
  perform 1 from public.ds_workspaces;
  raise exception 'FAIL: anon private read allowed';
 exception when insufficient_privilege then null; end;
 begin
  perform public.ds_is_administrator();
  raise exception 'FAIL: anon account RPC allowed';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'PASS: transactional database role isolation, consent, revision conflict and relogin; Auth/email transport NOT tested' as result;
rollback;
