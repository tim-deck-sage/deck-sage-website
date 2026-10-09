# Free account feature — local candidate

The initial local candidate was rejected by independent security review. See
`SECURITY-FIXES.md` for the identity/logout/recovery fixes and current evidence;
the earlier 67-check matrix below is historical and superseded by that review.
Test connection is now authorized subject to independent recheck. Remote
application/publication has still not occurred; see `TEST-CONNECTION.md`.

Base: published `39098efa25ddaa358a76e5608d758e182031129f`.
Branch: `feature/free-accounts`. No hosted schema, settings, credentials, admin grant,
push, or deployment was performed for this feature.

## Behavior

Email/password signup, email confirmation, sign-in, logout, PKCE recovery callback,
password update, and session restoration use pinned `@supabase/supabase-js 2.117.3`.
Password fields clear after submission and are never stored by application code.
Accounts and store drafts have the same free access. Scanning, social messages,
payments, and optional device permissions are not activated.

The inspected original app signup uses email/password and a permanent normalized
3–24 character username. First-run introduction intent is stored locally. Its
legal screens describe privacy/terms and feature-specific camera permission;
no durable signup policy acceptance was found in that flow. This candidate adds
two unchecked affirmations, links existing Terms (July 4, 2026) and Privacy
(July 30, 2026), and records `web-2026-10-09-v1` and database acceptance time.
Authenticated setup deliberately asks again after email confirmation; an
interrupted signup cannot silently mark policies accepted from user metadata.
Optional camera/photo/location/notification permissions are not signup gates.
Policy content must be reviewed before release and its version advanced whenever
the accepted text changes. No marketing consent or subscription entitlement is
invented.

## Proposed database migration

`supabase/migrations/20261009153100_free_accounts.sql` was created with CLI 2.120.0
`migration new`. It is a pending, additive migration, not remotely applied.

Distinct `ds_profiles`, `ds_consents`, `ds_policy_versions`, and `ds_workspaces`
avoid changing legacy mobile-app tables and their subscription/bootstrap flows.
Legacy `profiles` can be visible to other authenticated users, so private website
consent and collection data are not put there. Website setup does not depend on
the reportedly missing legacy `auth.users` profile trigger. This means website
and legacy app collections/profiles are independent; existing app data is not
silently imported. A future shared app migration would need a separate design.

All exposed tables have RLS and explicit grants. Private data SELECT is restricted
to `auth.uid() = user_id`. Clients have no direct write/delete privileges.
Public RPC wrappers are SECURITY INVOKER. Narrow SECURITY DEFINER mutations live
in unexposed `ds_private`, use an empty search_path, derive owner from `auth.uid()`,
require confirmed non-anonymous auth users, accept no owner argument, and check
current consent. This privilege boundary is needed to prevent direct API callers
from forging timestamps or bypassing revision checks. No views or exposed
SECURITY DEFINER functions are introduced. PUBLIC/anon EXECUTE is revoked.

Workspace saves compare revisions under a row lock. Operation UUIDs and hashes
make a lost response safe to retry; changed reuse is rejected. Receipts retain at
most 100 operations per user. An expired retry fails its stale revision. Import
uses a server-computed SHA-256 fingerprint and is atomic: only a new unused account
accepts the first import, and repeats of that import return the current workspace
without adding quantities or overwriting subsequent account edits. Guest storage
is preserved. There is no automatic account-to-account/guest copying.

Account snapshots and pending edits are kept in memory, not guest localStorage.
Logout/account switching clears private UI state; epoch checks discard stale
loads, save responses, and UI callbacks. Lost-response retries retain their
operation UUID. Conflicts pause sync and require exporting/choosing a version.
Unsaved changes warn on navigation and sign-out offers an export before discard.
Whole-workspace conflict choices intentionally replace one version; there is no
silent quantity sum or automatic merge.

Admin authority is a private `ds_private.account_roles` UUID assignment made only
through an approved privileged setup. Username `tmoore`, profile role strings,
and editable JWT user_metadata confer no privileges. No admin grant exists here;
no administrator management interface is implemented by this account slice.

## Setup gates — not yet performed

1. Review/apply the exact additive migration only to authorized integration project
   `mihmykgxbneuhlcxolzm`. Do not apply to Development/Production or alter legacy
   triggers/tables. Inspect schema for collisions first. Run hosted security and
   performance advisors after application, and repair findings before release.
2. Verify email/password signup, confirmation enabled, session/password policies,
   Site URL, and exact redirect allowlist for the intended test browser origin and
   `/?accountCallback=1`. Changes require approval; no settings were changed here.
3. Configure and verify custom SMTP using secure dashboard entry. Supabase default
   SMTP only delivers to project-team addresses and is not production-ready.
   Test confirmation and password recovery mail with two real test users.
4. Supply only the project's URL and a publishable key via build variables
   `DECK_SAGE_SUPABASE_URL` and `DECK_SAGE_SUPABASE_PUBLISHABLE_KEY`. Never supply
   service_role/secret keys. The build currently defaults to accounts disabled and
   accepts only the integration test URL. CSP adds only that HTTPS API origin when
   configured. Future production configuration requires a separately approved
   project/design; this candidate does not silently connect to production.
5. Run hosted two-user REST/RPC isolation, anonymous access, owner reassignment,
   durable relogin/reload, confirmation/recovery callbacks, interrupted onboarding,
   consent renewal, lost-response/conflict, import replay, and logout tests. Embedded
   PostgreSQL cannot certify Supabase Auth/JWT transport or email delivery.
6. Tim enters credentials himself. Once Tim's verified account exists, separately
   approve provisioning its exact auth UUID as administrator. Do not infer identity
   from a requested username or place passwords/tokens in a chat, migration, or file.
7. Review legacy username-reservation deletion restrictions and the operational
   account-deletion process before public account rollout. New website tables
   cascade on auth-user deletion; legacy constraints can still prevent deletion.
8. Review the final candidate and explicitly authorize publication. Main and the
   published site remain unchanged by this feature.

## Verification

`npm run build` exports legal routes and the static preview. `npm run test:accounts`
runs isolated SQL and mocked client contracts. `tests/accounts/server.cjs` serves
the static output on localhost:4182 for browser checks. `tests/accounts/browser.cjs`
uses the real SDK with intercepted fixture HTTP: no requests reach Supabase.
Preserved guest/fantasy regressions are under `tests/regression/`.

No Docker/PostgreSQL daemon is installed here. Embedded PGlite executes actual
PostgreSQL RLS/grants/functions with fixture auth roles and `auth.uid()`. It does
not emulate the complete Supabase services. Hosted CLI migration history/advisors
verification is pending; the local migration file has no hosted history entry.
An attempted `supabase db advisors --local --type security --fail-on error` failed
with ECONNREFUSED on 127.0.0.1:54322. It made no hosted request. Hosted advisor
results are not claimed.

Final local evidence: 15 embedded PostgreSQL checks, 12 mocked controller/SDK
checks, 8 browser/real-SDK-with-mocked-HTTP checks, 23 preserved guest workflows,
and 9 fantasy UI/accessibility checks passed (67 total). Browser reports and
screenshots remain local and ignored. Full static build and `git diff --check`
passed. An initial audio module interop failure was fixed and regressions rerun;
the old visual test's null-storage wait was corrected to wait for actual import.

Npm audit found six pre-existing Next/PostCSS/Sharp/build dependency advisories
(one critical, four high, one moderate) in the inherited lock. Added Supabase
packages were not flagged. This static Pages site does not run Next server APIs,
but dependency remediation should be reviewed separately before any server-based
deployment. No unrelated dependency upgrades were made.

Current documentation verified October 9, 2026:
- https://supabase.com/changelog.md
- https://supabase.com/docs/reference/javascript/auth-signup
- https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/auth/auth-smtp
- https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically

The current PostgreSQL minor breaking-change advisory concerns ltree/btree_gist,
legacy-cipher pgcrypto, and custom operators; this migration uses none of those.
