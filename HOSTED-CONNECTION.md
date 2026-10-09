# Test connection applied — 2026-10-09

Target: `mihmykgxbneuhlcxolzm`, Deck Sage DB Integration Test, ACTIVE_HEALTHY.
Only this project was changed. The parent supplied independent approval for exact
commit `5d565d8e8e8c2f90b4755f2b7811e87c04630db4`; recheck found no blockers.
The candidate was clean and all proposed schema/table names absent before application.

## Provenance

Supported Supabase connector `apply_migration` returned success. Hosted migration
history records `20261009163446_free_accounts`. Exact applied source was
`supabase/migrations/20261009153100_free_accounts.sql` at the reviewed commit.
SHA256: `22da5fd59cde786abbdc9b4ff6a03fc55a90bacd4344e793fb4a84e31a6e7c84`.
The migration's pending-review comment is historical; it was applied only after approval.
The connector assigns its hosted timestamp, which differs from the local filename.

Creates four public `ds_*` tables, three inaccessible private tables, owner-read
RLS, immutable policy acceptance, revision/operation receipts, explicit guest import,
UUID-bound mutation RPCs and private administrator-role lookup. Legacy app schemas,
data, triggers, subscriptions and credentials were not modified.

## Hosted evidence

- Complete `tests/accounts/hosted-rollback.sql` executed as one BEGIN/ROLLBACK
  call and returned PASS: owner isolation, consent, denied owner reassignment,
  revision conflict, independent B account, anonymous denial and A relogin read.
- Followup query: auth users, temporary fixture users, profiles, consents,
  workspaces and administrator roles all zero. Every feature table has RLS.
- Public RPCs are security invokers with fixed empty search paths and no anonymous
  EXECUTE grant; only the reviewed expected-UUID overloads exist.
- `tests/accounts/hosted-public.cjs`: ten real HTTPS probes passed using only the
  enabled modern publishable key. Public policy and Auth settings readable;
  three private public-schema tables and all four account RPCs deny anonymous
  access (401/42501); `ds_private` is not exposed (406/PGRST106).
- Full static production build passed. Isolated local preview at
  `http://127.0.0.1:4182/#/settings` shows enabled free account controls, with
  no existing session. No signup/login/reset was submitted.

These prove hosted database roles and unauthenticated transport. They do not prove
real Auth JWT issuance, confirmation delivery, recovery mail or two-browser signed-in
isolation. No persistent passwords, real accounts or administrator grants were created.

## Auth dashboard and local build

Two exact allowlist entries saved and verified again after dashboard reload:
`https://deck-sage.com/?accountCallback=1` and
`http://127.0.0.1:4182/?accountCallback=1`.
Site URL remains `http://localhost:3000`. Email/signup enabled, confirmation required,
anonymous Auth disabled already; no changes needed to those flags. Custom SMTP is
absent and built-in email service remains. No SMTP credentials were inspected/entered.

Local build only uses existing public publishable key named default, id
`0f8c5f9c-254f-4d25-8c2c-3ca72e33c5c3`, with exact test project URL.
Generated `preview/public/account-config.js` and the index CSP are included in the
local feature-branch connection commit. No private key/management token is used.
No main push/deployment. Rebuild with both `DECK_SAGE_SUPABASE_URL` and
`DECK_SAGE_SUPABASE_PUBLISHABLE_KEY` set to the same public test configuration;
the build tool deliberately disables accounts when both are absent. CI/publication
configuration remains a separate reviewed step, so a default build is not evidence
that the connected candidate is enabled.

## Security advisors

Baseline notices are unchanged: 11 legacy tables with RLS and no policy; one legacy
security-definer view (`store_public_profiles`); one mutable-search-path function
(`current_store_check_in_date`); 38 anonymous-callable and 74 authenticated-callable
legacy security-definer function notices. These need a separate legacy review;
the notices alone do not establish exploitability. No legacy changes made.

Only three new INFO notices: RLS enabled without policies on private operations,
imports and account_roles. This is deliberate deny-by-default design: no client
table grants and private schema excluded from Data API; narrow private functions
manage them. No new feature ERROR/WARN notices.

Remediation references:
[RLS without policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy),
[definer views](https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view),
[mutable search path](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable),
[anonymous definer functions](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable).
Ignored local `tests/accounts/hosted-connection-report.json` retains exact connector
results and complete before/after advisor details, without private credentials.

## Remaining handoff

Tim supplies/configures an approved SMTP provider through secure credential entry.
The parent's read-only investigation reports that Production already uses Resend
(`smtp.resend.com:465`, sender name Deck Sage), while test and Dev use built-in
email. This identifies an existing provider; no Production/Dev settings or
credentials were copied, retrieved or changed here. Tim was given the test email
dashboard for secure entry; user completion is pending.
Then Tim creates two test accounts and verifies email confirmation, collection save,
logout/relogin, cross-account isolation and password recovery in real browsers.
Agent must not set Tim's password or silently create persistent fixture accounts.
Administrator provisioning requires separate exact-user-UUID authorization.
Publication remains a separate parent-controlled approval.
