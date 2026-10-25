# Final local account release candidate

This review changes only the existing UI/Auth adapter and its required expected-
owner onboarding argument. It preserves the isolation migration from commit
8caf98fd9ccedef1de304e5615e72138098d515e byte for byte. No connector catalog,
live Auth, database, SMTP/DNS, account, credential, deploy or push operation ran.
Secure accounts remain disabled in the generated public configuration.

## Final migrations — both UNAPPLIED

1. `20261025095034_core_secure_accounts.sql`
   SHA256 `415C8767296E805C0E506281ECE281F0A9BCC7E72A1D19ED731C238B48981CC6`.
   This replaces the earlier 0AB1... hash: both private/public onboarding
   signatures now include `p_expected_user uuid`, checked against actual
   `auth.uid()` before any profile, consent or workspace insert. The earlier
   saved hashes must not be used to approve the revised file.
2. `20261025111714_core_legacy_membership_boundary.sql`
   SHA256 `B72D2244FDE893C8313218AAE93FA327AB6BDC66A2EFECB63620B92372FBA3D5`.
   Unchanged: explicit private legacy membership, five exact internal EXECUTE
   restrictions, preserved public active-news/merchant projections and checked
   wrapper/service paths, no data deletion, atomic drift checks.

## Review findings fixed

- Cached Auth/localStorage user objects and username knowledge never authorize
  access. The adapter obtains a cached token, verifies that exact token through
  native Auth GET /user, checks confirmed/nonanonymous status and matching
  subject, then rechecks that the native current session has not switched.
- Data RPCs use a client bound to that captured bearer. Onboarding also carries
  the expected owner UUID into real SQL. Password update and global recovery
  logout use the same native Auth REST operations as the installed SDK, with a
  verified captured owner's bearer. A later account switch cannot substitute
  another user's token. Password verification/storage stays entirely in Auth.
- Auth callbacks synchronously hide private state before asynchronous SDK work.
  Controller epochs reject late responses. Dirty edits can be restored only
  after re-verifying the same owner. A JWT deadline triggers verification even
  if SDK refresh fails without emitting an event. Failed verification clears
  private state. Logout hides data before storage/network operations and remains
  locked if sign-out fails, even when browser storage throws.
- A recovery event for user A cannot authorize a password update for currently
  verified user B. Recovery owner proof stays in memory and is cleared on owner
  changes/logout. Existing accounts revoke sessions after reset; an unfinished
  account resumes verified onboarding. No email/password sign-in fallback exists.
- Only the fixed PKCE callback marker plus code triggers URL-session discovery.
  The real SDK exchanges the code and removes it. Missing verifier cannot show
  the password-update form. No arbitrary external return URL is accepted.
  Recovery failures have an opaque user-facing result. No implementation logger
  receives passwords, access/refresh tokens or recovery codes. Both static shells
  specify no-referrer; browser tests check console output for synthetic secrets.
- Removed obsolete global gates that hid public content whenever Auth was
  configured, loading or failed. Private routes retain their gates. Modals are
  tagged with their owner's epoch and cannot render across identity changes.
- Signup still collects username/password/email/ZIP. ZIP is mandatory five-digit
  text (leading zeros preserved), and must be confirmed again after email
  verification before profile creation. It is not persisted in JWT metadata.
  Consent checks precede native signup. An unexpectedly immediate signup session
  is signed out; production must have email confirmation required.
- Turnstile script loading is shared across form remounts. Forms stay disabled
  without its token. Build refuses an explicit enablement without a site key,
  before writing an enabled config. The old username-only flag cannot enable it.

## Exact route/action matrix

| Route or action | Access |
|---|---|
| home | Public in guest, loading and failed-Auth states |
| cards, card details, public prices/rules/search | Public |
| precons and detail pages, combos and detail pages | Public |
| lore, songs, news, help | Public |
| legal/support/deletion-information static pages | Public |
| account/sign-in/signup/recovery-request entry | Public shell |
| reset-password | Public recovery-request shell; update requires verified recovery session |
| decks and decks/:id, analyses/coach/upgrades within a deck | Signed-in owner |
| bulk, bulk discovery, collection value | Signed-in owner |
| batch-upload/:type/:id, local scan/save/import/export/restore | Signed-in owner |
| commander-swap, sage | Signed-in owner: current implementations consume private collections |
| friends, stores | Signed-in owner drafts; no newly connected sending/sharing service |
| settings, notifications, profile/backup/reset | Signed-in owner |
| advertise | Signed-in account; existing Coming Soon placeholder only |
| publish | Public shell with existing separate publisher authorization; ordinary login grants no publishing authority |
| Favorite/add from a public card/catalog page | Prompt sign-in; updates still require owner RPC/RLS |
| Unknown routes | Fail closed for guest, existing not-found page after sign-in |

Normal username/password sign-in preserves a protected hash deep link. Verified
signup goes to account setup; recovery goes to its fixed reset screen. Beta data
remains separate, never attached through a matching name.

## Executed final validation

- 9 Core SQL proof groups, now including wrong-owner onboarding rejection.
- 15 real-SQL legacy-isolation proof groups; all 80 private legacy client RPCs
  reject new permanent Core identities; public active news/store reads continue.
- 12 controller proof groups: stale loads/saves, logout, storage failure,
  wrong-owner recovery event, JWT-deadline refresh failure, pending edits and
  unfinished-account recovery.
- 10 real SDK/intercepted HTTP groups: forged cached sessions, unconfirmed and
  anonymous users, owner mismatch, verification/account-switch race, captured
  reset/revocation bearer, onboarding RPC parameters, signup privacy/policy,
  opaque recovery and late-login-after-logout rejection.
- Login-handler proof checks generic nonexistent/wrong-password failures,
  service-only email resolution, no-store, fixed origin, CAPTCHA and limiting.
- Rendered headless Edge: eight public routes, twelve protected deep links,
  mandatory signup fields and unchecked agreements, mobile layout, authenticated
  owner/account and advertising placeholder, public news before/after Auth
  failure, logout privacy, real SDK PKCE callback/update, missing-verifier denial,
  removed callback code, no sensitive synthetic values in console logs.
- Static Next webpack production compile, TypeScript and all seven pages passed.
  Browser bundle rebuilt; final local postbuild/assembly status is recorded in
  the parent-facing final report. `git diff --check` passed.

These proofs use synthetic users/tokens/data. SQL tests execute actual migration
and function bodies in reconstructed PostgreSQL/PGlite, not mocked RLS. Native
SDK and browser tests intercept HTTP; they do not verify real server JWT
signatures, real mailbox delivery, CAPTCHA-provider responses, hosted gateway
behavior or live multi-connection concurrency. No live test account/email was
created, and public mail readiness is not inferred from these tests.

## Exact function and configuration rollout

Deploy only `website-core-login`; its staged config is `verify_jwt=false` because
login is unauthenticated. Its fixed-origin/CAPTCHA/rate/native-password checks
remain required. Server environment:

- `CORE_SITE_ORIGIN=https://deck-sage.com` (enforced by function source).
- `CORE_PUBLISHABLE_KEY`: the existing project's modern publishable key.
- Default Supabase-provided `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` remain
  server-only. No new service credential is needed in the website bundle.

Frontend build settings, only after approved live tests:

- `DECK_SAGE_SUPABASE_URL=https://mihmykgxbneuhlcxolzm.supabase.co`
- `DECK_SAGE_SUPABASE_PUBLISHABLE_KEY`: that existing modern publishable key.
- `DECK_SAGE_SECURE_ACCOUNTS_READY=true`
- `DECK_SAGE_TURNSTILE_SITE_KEY`: reviewed site key for the actual Core origin.

Required Auth settings: email provider/signup enabled; email confirmation
required (`mailer_autoconfirm=false`); server password minimum 12; Turnstile
CAPTCHA enabled with its matching private secret; reviewed signup/reset/token
rate limits; exact Core callback allowlist entry
`https://deck-sage.com/?accountCallback=1` and native SDK flow-specific callback
parameters if required by the project's redirect matcher. Do not add arbitrary
external destinations or remove other apps' callbacks/providers. Check effective
token-endpoint limits because the login proxy shares server egress. Configure
reviewed JWT expiry; browser logout does not instantly invalidate stolen JWTs.

The parent owns verified SMTP/Resend/subdomain work. Preserve that coordination;
this review changes neither SMTP nor email templates and creates no credentials.

## Minimal live approval batch

1. Approve both exact migration files/hashes on the named shared project. Keep
   backup, zero-permanent-user/drift checks, and retained beta rows. If permanent
   users now exist, stop for an explicit membership decision rather than seeding
   or revoking them automatically.
2. Approve deployment of the one login Edge function and the exact Core public
   environment values; no other functions or shared service keys change.
3. Approve required project-wide Auth confirmation/password/CAPTCHA/rate/redirect
   settings after checking existing callers. SMTP/domain changes stay in their
   separate already-coordinated approval path; no paid service or subscription.
4. Approve two specifically identified test accounts and recovery emails for
   hosted owner/cross-user/anonymous, expiry, CAPTCHA and real mailbox smoke
   tests. Their identities/recipients must be known before execution.
5. After those succeed, approve publishing the final static build and enabling
   its readiness flag. No additional account-claim or legacy-deletion decision
   remains. Roll back by disabling readiness while retaining data and the access
   boundary, never by reopening username-only access.
