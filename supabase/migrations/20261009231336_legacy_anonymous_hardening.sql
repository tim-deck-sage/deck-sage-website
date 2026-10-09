-- TEST PROJECT ONLY: mihmykgxbneuhlcxolzm. PENDING separate review/authorization.
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
 if exposed_count<>81 then raise exception 'Legacy exposed function inventory changed; re-audit required'; end if;
 for item in select * from (values
('public.accept_friend_request(uuid,boolean)','13118513edcf28ba179a94dccab5d584',true),
('public.activate_store_reward_campaign(uuid,integer)','37e26b1ab0857e298fd120059ed4277d',true),
('public.adjust_user_token_balance(uuid,integer)','bc62a787dae2700e5bde46315d304b76',true),
('public.check_in_to_store(uuid)','e55c0221672983d789006dab2ba1c88c',true),
('public.complete_connected_match_if_ready(uuid)','d801fcc1e6d1bed577ed8d1f2247734e',true),
('public.complete_player_store_onboarding()','8393bde567b6ae7298899d9847e7a77e',true),
('public.complete_store_owner_onboarding(text)','a1a59394d3ffe706a437deadcd9edc3a',true),
('public.connected_match_build_player_payload(jsonb,uuid)','8295b6467cf5a2e2b5a9a26189807d93',true),
('public.connected_match_commander_snapshot(uuid)','d07b420241e188125f38ea3542f656a3',true),
('public.connected_match_complete_if_ready(uuid)','dbbe0f1aea61fd38e57a8941ccd92eef',true),
('public.connected_match_cost_assumption_value(text,numeric)','54a697673f9ecf63251fbe4fadefe0f8',true),
('public.connected_match_cost_estimate(integer,integer,integer,boolean)','fcec11353cf74604ce0a031e3292e3b7',true),
('public.connected_match_cost_increment_breakdown(jsonb,text,integer)','af2f991a5a4a97b604bc7841c8246a0a',true),
('public.connected_match_cost_model_version()','9fd234e20ffdd7863689d602db5d97ab',true),
('public.connected_match_cost_telemetry_enabled()','2f342a74aeb0f1e3ffedd35a1b8cf2db',true),
('public.connected_match_participant_snapshot(uuid)','019a056b1d6050d3ad002518a7650ba3',true),
('public.connected_match_snapshot(uuid)','fce1639993061fa168b604b061248646',true),
('public.connected_match_usage_month_utc()','08c8c1025d5b580f4c8175fc7859f59e',true),
('public.connected_match_user_is_participant(uuid)','23db61c62c3c3e776dfd202faab18f43',true),
('public.create_connected_match(jsonb)','f858bf0908d9eba7710d7cce705c9e87',true),
('public.create_connected_play_again_for_creator(uuid,jsonb)','dea4b56dfa548cbecbe7bf8146d25427',true),
('public.create_store_lfg_interest(uuid,uuid)','331bcd21578e75810236101f83ab2ff7',true),
('public.current_store_check_in_date()','1cce27993d14070c3634e98001beceee',true),
('public.current_user_role()','4cf74503bb0f9b27f0205f559b204331',true),
('public.ensure_store_token_wallet(uuid)','45044d7872c813d16421121621413c5c',true),
('public.ensure_user_token_wallet(uuid)','dd1a12bd86a0c53f99ec50b7773f93fa',true),
('public.generate_connected_match_join_code()','c13848456d9624c76ecb143f37128116',true),
('public.get_bulk_deck_analysis_phase4_result(uuid,uuid)','6a4640a0b7e886305ed0f25b02104b2a',true),
('public.get_bulk_deck_analysis_request_status(uuid,uuid)','e100968e0c720e2593b8aa44c27b7693',true),
('public.get_bulk_deck_analysis_usage_snapshot()','92208760f523c81896f49a4cd2b547cb',true),
('public.get_commander_pod_ready(uuid)','3f3ba13b00a95292b9fac7bbaef0c5fe',true),
('public.get_connected_match_cost_admin_summary(date,date)','9cd2005e0de416b21f71bbe7940ba9a3',true),
('public.get_connected_match_monthly_limit(uuid)','42b50ce7f589cd7cf7b389155cf15c92',true),
('public.get_connected_match_monthly_usage()','50b17f96cec9e54ccad6e97991035a42',true),
('public.get_my_entitlement_snapshot()','03f78011fc9889958d55ac52c3e9b2bd',true),
('public.get_my_notification_digest_preview(integer)','bdeeb8eeaf4872b315c93ddb68d2f175',true),
('public.get_my_store_checkin_reward_result(uuid)','2b3654ef7520803e6d4a2a68a4a6f494',true),
('public.get_shared_bulk_card_owners(text[])','034b4c414b92cf8b040a9885472b0220',true),
('public.get_store_daily_push_notification_preview(uuid,integer)','474233e5cf0c1b872500536f190f2c5f',true),
('public.get_store_lfg_today(uuid)','6ecc85c9b7498963aa76436d515087e4',true),
('public.get_store_reward_campaign_status(uuid)','71197b666393e506a4d39703f0d35634',true),
('public.get_store_welcome_message(uuid)','f11337d13bf76eb1cbc9a32aa776b080',true),
('public.grant_user_tokens(uuid,integer)','3def557b316ecbcdeb24ebdc9201ecfb',true),
('public.heartbeat_connected_match(uuid)','5e692b74eda662102736034a6c0a8042',true),
('public.increment_connected_match_cost_counter(uuid,text,integer,integer,boolean)','07302d1000282f4693acc1dcbd168590',true),
('public.is_active_news_run(uuid)','8b2e3d2bee480416af123c9201582a12',true),
('public.is_public_active_store(uuid)','4cfbb1a7b1bde9ded42f29cc79bb64fb',true),
('public.is_store_owner_or_admin(uuid)','61b1989c5777d993522d9d2839e42c7b',true),
('public.is_store_staff(uuid,text[])','92924a20f7f6e472cdb1ee931ccb9753',true),
('public.is_super_admin()','bcc3c438dc592453ea9191546ae588eb',true),
('public.is_valid_sanctum_avatar_id(text)','c69e5db073c4778021cc353d1b7e193d',true),
('public.is_valid_username(text)','16313eb3cc95e3d65c1071f9d66eae3e',true),
('public.join_connected_match(text,jsonb)','78568648150ae876f9c9800b488cc77b',true),
('public.leave_connected_match_lobby(uuid)','cb70ed3686dcf3d4599b844a4f2c6d73',true),
('public.normalize_username(text)','4ed1091c09b68704b40e01459fd4757a',true),
('public.pull_cloud_deck_changes(timestamp with time zone,uuid,integer)','e8f3c04df08add1c7f4fffd32e2dc7a2',true),
('public.push_cloud_bulk_card_stacks(jsonb)','e5a8dcacc1e11141fc52f36f78297467',true),
('public.push_cloud_deck_snapshot(jsonb,jsonb,jsonb,boolean,integer,integer)','bb0091a1833ef8931d74cd0466de681b',true),
('public.reconcile_store_reward_campaigns(uuid)','a6269267b2271000ed2bde6d9c4adae1',true),
('public.record_connected_match_cost_event(uuid,uuid,text,integer,boolean,integer,jsonb)','7aef290e0b498bb8ef702a23f1a89b31',true),
('public.refresh_connected_match_cost_rollup(uuid)','346a664762b15f55e0e25724c9d4c35b',true),
('public.renew_friend_request(uuid,boolean)','e55eb269717412d806bb9840becb4f01',true),
('public.request_store_staff_onboarding(text)','f628b92f40893619cdcd03e3b85571bc',true),
('public.reserve_connected_match_usage(uuid,text)','3adeae6bed8f1baf31666041b446e42e',true),
('public.revoke_my_sanctum_beta_grant()','2cbde991e49f7709110833193b56091e',true),
('public.select_store_reward_campaign_winner(uuid)','2f2b578e96b41a6a4036e358dea95d9c',true),
('public.set_connected_match_ready(uuid,jsonb)','555f0bb237ef25aa158d0ad62eed70e8',true),
('public.set_connected_terminal_state(uuid,text,text)','addfdc99146ba57a1f7c7940881f7234',true),
('public.set_friend_bulk_sharing(uuid,boolean)','ac68f2925ed62da87d4364c197a5a813',true),
('public.set_my_sanctum_avatar(text,boolean)','510091807f68e5a505ac546f17c7e568',true),
('public.spend_user_tokens(uuid,integer)','9f22fd0e7e7fa9a676f403f9a058662d',true),
('public.start_bulk_deck_analysis_request(uuid,text)','71af146a41f79c42b89d837506cb78d1',true),
('public.start_connected_match(uuid)','fdfb89c4339cd6f6bdc495f810b7ee60',true),
('public.store_slug_base(text)','19a374d9cd42d82c7bc109c95b639aa1',true),
('public.update_connected_commander_damage(uuid,uuid,integer)','ca5c6096a17951f1f523e273d199a936',true),
('public.update_connected_counter(uuid,text,integer)','6d8f5038d5817ae76daedb6b2b4fd4c3',true),
('public.update_connected_life(uuid,integer)','35545d033b0401ac33a0fab69593c109',true),
('public.update_connected_toggle(uuid,text,boolean)','508c0e7b00078a757bc2e99fe091ae3d',true),
('public.update_store_checkin_lfg(uuid,boolean,text,jsonb,text)','b00deef2d077ed54b30d891721c96e63',true),
('public.update_store_daily_push_message(uuid,text,boolean)','d01fc86a278b506bd2befc2a67eb8e35',true),
('public.update_store_welcome_message(uuid,text,boolean)','d049fe087b1752d32892dcbf75c9a773',true),
('public.get_store_daily_push_digest_candidates(date)','a3e75ce6f9377c7c26f7e194ce63e0de',false),
('public.mark_store_daily_push_sent(uuid,date)','127797495f2eaafda010cfbf5e7f8999',false)
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
    guarded_body:=E'begin\n perform ds_private.require_legacy_identity();\n'||guarded_body||E'\nend;';
   elsif language_name='sql' then
    -- Multiple statements prevent SQL inlining from discarding the guard.
    guarded_body:=E'select ds_private.require_legacy_identity();\n'||guarded_body;
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
 if table_count<>62 then raise exception 'Legacy table inventory changed; re-audit required'; end if;
 foreach table_name in array ARRAY['account_deletion_jobs','app_subscription_plans','bulk_deck_analysis_attempts','bulk_deck_analysis_monthly_usage','bulk_deck_analysis_requests','bulk_deck_analysis_saved_reports','cloud_bulk_card_stacks','cloud_deck_card_stacks','cloud_deck_commanders','cloud_decks','cloud_sync_devices','connected_game_history','connected_match_commander_damage','connected_match_cost_assumptions','connected_match_cost_events','connected_match_cost_rollups','connected_match_events','connected_match_monthly_usage','connected_match_participants','connected_match_sessions','daily_news_dispatch_items','daily_news_runs','deck_sage_feature_suggestions','entitlement_capabilities','entitlement_events','friend_requests','notification_daily_feature_messages','notification_digest_deliveries','notification_digest_items','notification_digest_runs','notification_event_types','notification_events','notification_preferences','notification_push_attempts','player_store_preferences','premium_features','profiles','sanctum_beta_grants','sanctum_beta_programs','sanctum_beta_redemption_attempts','sanctum_beta_testers','store_analytics_events','store_checkins','store_flyer_settings','store_home_takeovers','store_lfg_interest','store_members','store_messages','store_reward_campaign_daily_awards','store_reward_campaigns','store_reward_settings','store_rewards','store_staff','store_subscription_plans','store_subscriptions','store_token_wallets','stores','user_entitlements','user_push_tokens','user_token_grants','user_token_wallets','username_reservations']
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
 if md5(pg_get_viewdef('public.store_public_profiles'::regclass,true))<>'30f1ed8ed111494e53e368e7c4fc25ab' then raise exception 'Reviewed store view changed; re-audit required'; end if;
end;
$view$;
create or replace view public.store_public_profiles as
 select id,name,slug,description,logo_url,website_url,phone,address_line1,address_line2,city,region,postal_code,country,timezone,created_at,updated_at
 from public.stores where is_public and is_active and (select ds_private.legacy_identity_allowed());
commit;
