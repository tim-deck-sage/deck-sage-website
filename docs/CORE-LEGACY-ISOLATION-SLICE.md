# Focused local isolation slice — 2026-10-25

No connector request, live SQL write, deployment, push, account, credential,
SMTP, DNS, job, or paid-service change occurred in this slice. It uses the saved
audited catalog and the parent's independently verified metadata. It does not
claim to have inventoried unknown external applications consuming this project.

## Exact patch

Migration: `20261025111714_core_legacy_membership_boundary.sql`.
SHA256: `B72D2244FDE893C8313218AAE93FA327AB6BDC66A2EFECB63620B92372FBA3D5`.
Apply only after the earlier `20261025095034_core_secure_accounts.sql`, and before
creating/enabling permanent Core accounts. Both remain UNAPPLIED.

1. Create `ds_private.legacy_principals(user_id, granted_at, review_reference)`.
   RLS is enabled with no client policies or client table grants. It starts
   empty. The audited project has zero permanent Auth users; the migration
   aborts if any exist at action time, requiring an explicit operator decision.
   No account is enrolled by username, profile existence, editable metadata,
   administrator-looking display data, or permanent Auth status alone.
2. Replace only `ds_private.legacy_identity_allowed()`: an existing actual
   nonanonymous Auth user must have an explicit private membership row. Trusted
   service calls are recognized through PostgreSQL's actual selected
   `service_role`, not a user metadata field or a caller-supplied user UUID.
   The existing `require_legacy_identity()` and its grants remain unchanged.
   Existing legacy RPC guards and restrictive table policies therefore deny new
   permanent Core accounts even before their Core profile is completed.
3. Separate the intentionally public news path. `is_active_news_run(uuid)`
   remains a narrowly scoped definer boolean predicate for active successful
   runs; it no longer invokes the legacy-membership guard. The existing
   permissive active-item SELECT policy remains. On
   `daily_news_dispatch_items` alone, split the restrictive ALL policy into an
   active-run SELECT restriction and membership-only INSERT/UPDATE/DELETE
   restrictions. No table read/write grants are added. Other news/run records
   remain under the legacy boundary; trusted service writers retain their path.
4. Keep `store_public_profiles` as an intentional public definer projection of
   the same 16 merchant columns with `is_public AND is_active`. Remove its
   inappropriate legacy-identity filter. The underlying `stores` table stays
   restricted. Private/inactive stores and account email/ZIP are not exposed.
   Existing view grants are preserved; no direct base-table grant is added.
5. Revoke direct client EXECUTE only on these five internal public helpers:
   `reserve_connected_match_usage(uuid,text)`,
   `get_connected_match_monthly_limit(uuid)`,
   `connected_match_complete_if_ready(uuid)`,
   `increment_connected_match_cost_counter(uuid,text,integer,integer,boolean)`,
   `record_connected_match_cost_event(uuid,uuid,text,integer,boolean,integer,jsonb)`.
   Remove PUBLIC/anon/authenticated grants, retaining existing service-role
   grants. Checked SECURITY DEFINER wrappers retain their grants and execute
   internals under their existing owner authority after their original checks.
   `complete_connected_match_if_ready(uuid)` is preserved; it checks actual
   participation before calling the now-restricted internal completion helper.
   Self/admin wallet helpers and participant-checked snapshot paths are not
   blanket-revoked.

The migration verifies seven exact saved function-body hashes, the exact 62
restrictive policy definitions/roles/table names, RLS enabled on each table,
the expected guarded public callable inventory, the public news read policy,
the store projection columns, and the absence of permanent Auth identities.
It aborts atomically on drift. The generator is local-only and deterministic.

## Impact by domain

Only this project's `public` and `ds_private` objects change. No other Supabase
project, `auth.users` record, Auth setting, or service credential is modified.

The affected legacy namespace is the old Deck Sage app's profiles, reservations,
cloud decks/bulk/sync, Connected Match/game history/telemetry, entitlements/token
wallets, stores/rewards/analytics, notifications, and feature suggestions. The
shared news cache is explicitly separated for public reads. The Core website's
new `ds_core_*` owner tables/RPCs, publisher surface, public cards/precons/combos,
lore/help/homepage, and browser-local engines are not modified by this slice.

The 62 existing restrictive-policy tables are:

account_deletion_jobs; app_subscription_plans; bulk_deck_analysis_attempts;
bulk_deck_analysis_monthly_usage; bulk_deck_analysis_requests;
bulk_deck_analysis_saved_reports; cloud_bulk_card_stacks; cloud_deck_card_stacks;
cloud_deck_commanders; cloud_decks; cloud_sync_devices; connected_game_history;
connected_match_commander_damage; connected_match_cost_assumptions;
connected_match_cost_events; connected_match_cost_rollups; connected_match_events;
connected_match_monthly_usage; connected_match_participants;
connected_match_sessions; daily_news_dispatch_items; daily_news_runs;
deck_sage_feature_suggestions; entitlement_capabilities; entitlement_events;
friend_requests; notification_daily_feature_messages;
notification_digest_deliveries; notification_digest_items;
notification_digest_runs; notification_event_types; notification_events;
notification_preferences; notification_push_attempts; player_store_preferences;
premium_features; profiles; sanctum_beta_grants; sanctum_beta_programs;
sanctum_beta_redemption_attempts; sanctum_beta_testers; store_analytics_events;
store_checkins; store_flyer_settings; store_home_takeovers; store_lfg_interest;
store_members; store_messages; store_reward_campaign_daily_awards;
store_reward_campaigns; store_reward_settings; store_rewards; store_staff;
store_subscription_plans; store_subscriptions; store_token_wallets; stores;
user_entitlements; user_push_tokens; user_token_grants; user_token_wallets;
username_reservations.

Data remains intact. Existing anonymous beta users were already denied the
legacy app APIs. An unexpected permanent consumer will cause the migration to
abort rather than silently removing their access. A later legitimate legacy
consumer needs independently reviewed private membership. Direct client calls
to the five unchecked internals intentionally stop even for such members;
checked wrapper/service paths remain the supported route. Unknown external
consumers of this shared project must not be assumed absent merely because the
old app is described as dead.

## Executed evidence

`node tests/accounts/core-isolation.cjs`: 15 focused proof groups, using actual
saved SQL definitions and actual migration files in PGlite/PostgreSQL, not
string-only assertions or mocked RLS:

- Function drift, unexpected permanent users and disabled RLS abort without
  creating a partial membership table.
- Empty membership initialization, unchanged non-news policies and exactly five
  changed public-function ACLs are verified from the running local catalog.
- Anonymous callers, new permanent Core users and anonymous Auth users read
  active news and the public active merchant projection; inactive content stays
  hidden. The public news exception grants no Core insert/update authority.
- Core cannot read synthetic legacy profiles, reservations, decks or sessions,
  or enroll itself. A synthetic Admin profile, editable metadata and a forged
  service-role claim without the actual database role do not grant membership.
  Even an accidentally enrolled anonymous Auth identity is still denied.
- All 80 currently client-callable non-public legacy non-trigger RPC definitions
  are invoked with a new permanent Core identity and reject it. The one public
  legacy predicate is tested separately as an allowed public read.
- An explicitly admitted participant completes a synthetic match through the
  real checked wrapper and revoked internal. An admitted nonparticipant is
  rejected. Trusted service-role monthly-limit lookup still executes.
- New Core onboarding/owner save works; anonymous and cross-user reads/writes
  fail. Retired username-only access stays denied; old UUID rows do not expose
  another identity's data.
- Explicitly admitted legacy Admin token grant and owner spend still work.
  The actual service-only news lease returns the existing active cache without
  starting a refresh, model call or external request.

The earlier `core-security.cjs` 9 owner-API SQL proof groups were also rerun and
passed. UI source/build was not changed by this slice; its previously passing
eight public routes/twelve protected direct links were not rerun here.

Proof limits: the fixture reconstructs saved column types/defaults, actual
function bodies, existing role allow/deny ACLs and RLS policies. It reproduces
only the constraints needed for selected service/wrapper execution, not a full
production restore or original triggers. Auth users and request claims are
synthetic. It does not verify real Auth JWT signatures, PostgREST transport,
concurrent transactions, CAPTCHA, mailbox recovery, or unknown consumer code.
The service news test includes fixture-only service table grants; migration
adds no production grants. These limits prevent an unwarranted live-ready claim.

## Narrowed live approval and next step

Approval must name project `mihmykgxbneuhlcxolzm`, both unapplied migration
files/hashes, the new private membership boundary, the public news/store split,
and the five exact EXECUTE revocations. At action time, recheck that the guard's
zero-permanent-user premise still holds. If it does not, stop for an exact
membership decision; do not auto-enroll or delete users. Preserve database and
sanitized configuration backups. Apply as one coordinated cutover before new
permanent signup and before enabling the Core frontend flag.

Then obtain separate approval for hosted two-user/anonymous smoke tests and any
account/email creation. SMTP/Resend/subdomain work belongs to the parent and was
not touched here. Production mail is not certified by these local proofs.
This finishes the requested isolation slice; the prior frontend/Auth adapter
still needs its separate adversarial session/recovery review before deployment.

Rollback: disable the new frontend readiness flag, retain all data and the
membership boundary, and repair forward. Do not reopen username-only RPCs or
blanket permanent-user legacy admission as a UI rollback. Do not delete legacy
rows, drop schemas, reset the shared database, or revoke other projects' access.
