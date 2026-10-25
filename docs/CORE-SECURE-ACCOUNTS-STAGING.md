# Core account security candidate — 2026-10-25

Final UI/Auth review and current approval details: CORE-ACCOUNT-RELEASE-CANDIDATE.md. Its test results and migration hashes supersede historical counts below.

Follow-up: the focused LOCAL membership/isolation candidate is now staged in
`CORE-LEGACY-ISOLATION-SLICE.md`. Its 15 real-SQL proof groups pass. Neither
migration has been applied. The shared-project blocker described below is the
original finding; the follow-up stages its narrowly scoped repair for approval.

Local branch `stage/core-secure-accounts`, based on deployed main
`4ab99728a9ca7dabe89b918a8f4d5422a70fdeaf`. This is an isolated local clone;
the prior checkout and other apps were not modified. Nothing was deployed,
published, applied to Supabase, or pushed. No accounts, credentials, emails,
paid calls, subscriptions, sharing changes, or destructive operations occurred.

**This candidate must remain disabled.** Its new Core API has local ownership
proofs, but permanent Auth identities would also inherit existing shared-project
permissions. That wider authorization issue is a separate live rollout blocker.

## Findings and beta-data decision

The project `mihmykgxbneuhlcxolzm` reports its name as **Deck Sage DB Integration
Test**, PostgreSQL 17.6.1.147, active/healthy. Do not infer that it disappeared
because the dashboard browser is signed into a different account.

Read-only aggregate counts: 27 shared workspaces, 61 shared operation receipts,
16 workspaces containing decks, 11 containing bulk; 3 UUID profiles/workspaces;
5 Auth users, all anonymous, zero confirmed emails and zero passwords. No names,
emails, deck contents, ZIPs, or individual user records were retrieved.
Normalized legacy shared-name collision count is zero.

Current public `ds_shared_open`, `ds_shared_register`, `ds_shared_load`, and
`ds_shared_save` are executable by both `anon` and `authenticated`. Their private
implementations are SECURITY DEFINER and authorize by supplied username alone.
Private-table RLS does not secure those entry points. This is established from
catalog definitions and ACLs; no hosted exploit or collection mutation was run.

Tim authorized starting fresh. The candidate creates new empty accounts, never
copies old workspaces by matching username, and never grants a role by name.
Old beta shared rows and receipts remain in their existing private tables;
the migration revokes both public wrappers and directly granted private
implementations from PUBLIC, anon, and authenticated. Older UUID beta rows are
also retained. Their existing anonymous sessions are not adopted by the new
client, which uses a separate Auth storage key. There is no claim UI or deletion.

## Public/private route and action matrix

Routes below are SPA hash paths such as `/#/decks/id`; the static host cannot
make hash routes a server authorization boundary.

| Route/action | Anonymous browsing | Authenticated behavior / enforcement |
|---|---|---|
| home | Public, existing fantasy artwork/layout | Account statistics use current owner's in-memory workspace |
| cards and card details | Public catalog/search/rules/prices | Add/favorite changes require account; owned-card filter sees no signed-out data |
| precons, combos | Public catalog, detail and examples | Any collection mutation goes through account edit guard and owner API |
| lore, songs, news | Public content | Public cached publications/news do not reveal collections |
| help, legal, support | Public | Updated account/privacy explanations |
| account | Public signup/sign-in/recovery entry | Username/password sign-in; email only for signup/recovery |
| reset-password | Public shell; no collection | Update form requires a verified recovery session |
| decks, decks/:id | Sign-in prompt, including direct links | Owner's deck creation/edit/import/export/analysis/coach |
| bulk, value | Sign-in prompt | Owner inventory, transfers, valuation and discovery |
| batch-upload/:type/:id | Sign-in prompt | Local photo staging/OCR; save only to owner's workspace |
| commander-swap, sage | Sign-in prompt | Current implementations consume private collection state |
| friends, stores | Sign-in prompt | Private workspace drafts only; no connected social send/share API |
| settings, notifications | Sign-in prompt | Private profile, backup/restore, reset and notices |
| advertise | Sign-in prompt | Existing matched-style Coming Soon placeholder; no payments/ad platform |
| publish | Public shell | Separate existing publisher-key/server authority remains required; account does not confer publishing rights |
| Unknown routes | Sign-in first while signed out | Existing not-found view after sign-in; fail closed |

Personal modal actions from public pages redirect to account. Collection edits
also check account mode and expected controller epoch. Public detail dialogs
remain available. Deep links remain in place through sign-in; no arbitrary
external `next` URL is accepted. Legacy browser-local storage is left untouched
and is not auto-imported. Authenticated JSON backup restore remains explicit.

## API, table and external-action audit

`core-readonly-catalog-2026-10-25.json` contains current schema definitions,
function ACLs, table grants, policies and storage-policy metadata, without user
rows. Inventory covers 156 public/private functions, 111 client-executable
functions, 192 public/private policies and 131 table-grant records. Trigger
functions counted in that inventory are not ordinary callable PostgREST RPCs.
There were no storage policies. No Auth-user triggers were found.

| Surface | Current / proposed authority |
|---|---|
| Current shared workspace API | Insecure username capability; retire all four public and four private implementations |
| Historical ds_profiles, ds_consents, ds_workspaces and UUID RPCs | Older beta path; not used by new client; existing owner SELECT policies retained |
| New ds_core_profiles | Confirmed, nonanonymous owner SELECT only; username/ZIP/policy private; no public directory; email stays in Auth |
| New ds_core_workspaces | Confirmed owner SELECT; no direct client INSERT/UPDATE/DELETE grants |
| ds_core_onboard | Authenticated wrapper to narrowly scoped private definer; verifies actual auth.users identity, policy consent, normalized unique username, text ZIP; inserts empty workspace atomically |
| ds_core_save | Same actual-identity guard; supplied expected UUID must equal auth.uid; revision and operation receipt checks; bounded receipts; no caller-supplied target owner authority |
| ds_core_login_email / ds_core_login_attempt | EXECUTE only service_role; no public/authenticated lookup or counter control |
| website-core-login Edge function | Fixed allowed origin, bounded 8 KiB body, required CAPTCHA token, durable global and per-name limits, generic errors and no-store responses; delegates password verification to Supabase Auth |
| Friend/store/scanner/import/export/coach/analytics | All personal data is inside owner workspace; local engines only; no separate unguarded user-data backend added |
| website-ai-batch-scan | Retired tombstone; local OCR is active; no hosted model call |
| website-daily-news, public news tables | Cached public read surface; refresh never invokes paid generation in browser; scheduler authentication unchanged |
| website-publisher, ds_publications | Existing independent publishing authority/storage path unchanged; public publication reads preserved |
| Card/precon/combo assets and retrieval | Public static catalog and existing card providers; do not gate public discovery |
| Scryfall/model downloads | Existing external public card/price/model requests; no account email/ZIP sent |

No new permissive write policies are needed: mutations use narrow RPCs with
explicit ownership enforcement. New tables have RLS and explicit grants; all
new SECURITY DEFINER functions set an empty search_path. User-editable metadata
does not authorize anything. Passwords are not stored, hashed, logged, exported,
or compared by custom code. Only Supabase Auth verifies them.

### Shared-project blocker

`ds_private.legacy_identity_allowed()` allows any actual nonanonymous Auth user,
without requiring a legacy-app membership. Existing exposed definer helpers
`reserve_connected_match_usage(uuid,text)`,
`record_connected_match_cost_event(...)`, and
`increment_connected_match_cost_counter(...)` accept target IDs without an
owner/member check inside their bodies. Their outer guard rejects anonymous
Auth users but would admit new permanent Core users. The current owner-rights
store view and broader grants/advisors also require review.

Consequently **do not enable permanent Core signup on the shared project yet**.
Either separately review and approve a membership boundary covering *every*
legacy callable function/table/view (including verified-but-not-onboarded new
identities), with regression tests proving no effects on other apps, or approve
a dedicated Core backend with its own Auth boundary if a no-cost free project
slot is available. Availability/cost has not been established; no project was
created. A frontend flag or Core RLS alone cannot fix shared-project grants.

Security advisor results were read only and saved in
`core-security-advisors-2026-10-25.json`. They are not a clean security bill.
Relevant official explanations: [definer views](https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view),
[anonymous policy warnings](https://supabase.com/docs/guides/database/database-advisors?queryGroups=lint&lint=0012_auth_allow_anonymous_sign_ins).

## Signup, recovery, privacy and abuse

Default sign-in asks for username and password. Signup also collects email and
five-digit US ZIP. ZIP remains text (`00501` round-trips), never a secret. Names
trim/lowercase to 3–24 ASCII letters, numbers or underscores; a unique constraint
arbitrates collisions atomically. No username directory or email lookup is
exposed. Login failures do not distinguish nonexistent user, wrong password,
unverified email or service error.

Signup fields are initially validated in memory; after verification the user
confirms username/ZIP and policies again to commit the private profile. ZIP is
not persisted in JWT user_metadata or guest storage. This intentionally leaves
an unfinished account without a username until verified onboarding succeeds.
If that session is lost, the email recovery link establishes a verified recovery
session; after password update, an unfinished account resumes onboarding without
adding an email/password sign-in option. Existing complete accounts sign out
globally after recovery, then use normal username/password sign-in.

Recovery uses native resetPasswordForEmail and updateUser. Callback is fixed to
`https://deck-sage.com/?accountCallback=1`; only exact staging origins should be
allowlisted in test configuration, with no production wildcard. PKCE needs the
requesting browser/origin's verifier; opening a link elsewhere may require a
fresh request in that browser. Expired/reused-link UX and actual mailbox
delivery still require approved live verification. Password minimum is 12 in
the UI; the project Auth policy must be reviewed to match and remains unchanged.

New Auth sessions use `deck-sage-core-auth-v2`. Signed-out collection state is
empty, not the previous guest/shared cache. Epoch checks discard late loads and
saves, account changes clear modals and scan buffers, and failed logout retains
a cross-tab lock. Refresh of the same user's token preserves unsynced edits.
Supabase access JWTs can remain valid until expiry after sign-out; removing a
browser session is not instant revocation of stolen bearer tokens. Do not claim
instant server revocation. Select an appropriate JWT expiry at reviewed rollout.

The staged signup disclosure and legal/help updates explain recovery email,
private ZIP, future geographic ads (inactive), no street address, no public
email/ZIP directory or advertiser disclosure, and retained isolated beta data.
Website deletion is a verified Support request, not a newly implemented admin
deletion endpoint. User-data exports contain private information.

The Turnstile component passes a token to native Auth signup/login/recovery.
Forms fail closed without a token/site key. The Edge rate limiter counts every
attempt, before lookup, with a 300/minute global and 10/minute normalized-name
limit; hashes only, with expired counters pruned. Auth's own rate limits remain
required for direct signup/reset/email enumeration and public Auth calls.
Proxy Auth requests may share an egress IP; verify effective limits and load
before general rollout. No client-IP header is blindly trusted for authority.
No CAPTCHA key or secret was created or configured.

## SMTP audit and exact unresolved access

**Current SMTP host, sender and enabled state are UNKNOWN.** The connected
Supabase tools have no Auth-configuration reader. Opening this project's Auth
URL configuration in the available Edge session redirected to an empty
organization list under `tim-deck-sage`. This is an account/session-access
blocker, not evidence that the project or SMTP configuration is absent. No
secrets were inspected and no configuration was saved. Use the verified correct
dashboard session or an authorized read-only Management API connection to read
only smtp_host, smtp_sender_name, smtp_admin_email, confirmation/signup flags,
site_url, redirect allowlist, CAPTCHA provider/enabled and rate limits; do not
return smtp_pass, SMTP username, Auth tokens or API secrets.

Official default mail service is team-address-only, two messages/hour,
best-effort, and unsuitable for public recovery. Custom SMTP is supported.
Do not assume the project uses that default merely because its configuration
could not be read.

The parent task owns Resend setup and discovered an existing free account;
latest report says deck-sage.com belongs to another Resend team. No transfer,
DNS, key or SMTP change was made. Domain/team ownership must be resolved without
revoking another team's access. This candidate does not depend on buying a plan.
No public recovery-email readiness is claimed.

## Exact staged security changes requiring action-time approval

1. Re-audit project/ref, four shared wrappers and their private implementations,
   grants, new-object absence and broader legacy isolation against current live
   definitions. Resolve the shared permanent-identity blocker before signup.
2. Independently review and approve local migration
   `supabase/migrations/20261025095034_core_secure_accounts.sql`, SHA256
   `415C8767296E805C0E506281ECE281F0A9BCC7E72A1D19ED731C238B48981CC6`.
   It adds two Core owner-readable public tables, one private schema with
   receipts/rate counters, ownership/onboarding/save RPCs, service-only login
   helpers, and revokes eight username-only function grants. It does not delete
   legacy data or change any other app's tables, functions, roles or Auth settings.
3. Approve deployment of only `website-core-login`, with `verify_jwt=false`
   because login is unauthenticated, and its own CAPTCHA/rate/Auth checks.
   Set exact `CORE_SITE_ORIGIN` and existing public `CORE_PUBLISHABLE_KEY`.
   Supabase supplies its server-side service-role key; never expose it in builds.
4. After reading existing settings, separately approve any project-wide Auth
   confirmation, signup, password policy, JWT expiry, CAPTCHA, rate, exact
   redirect and SMTP/sender changes. Preserve other apps' settings and callbacks.
   SMTP/domain/API-key work is coordinated by the parent; no new paid service.
5. Explicitly approve live test accounts/emails and two-user hosted owner,
   cross-user, anonymous, expired token, recovery and rate-limit tests. Current
   authorization does not permit creating those fixtures or sending messages.
6. Approve the final public UI/legal deployment and enabling
   `DECK_SAGE_SECURE_ACCOUNTS_READY=true` with a verified Turnstile site key only
   after the preceding gates pass. The old usernameOnlyReady flag cannot enable
   this backend. Current generated config has secureAccountsReady=false.

## Validation and remaining limits

- `core-security.cjs`: 9 local PGlite SQL proof groups on the actual candidate
  migration plus historical schema: anon table/RPC rejection, unconfirmed
  rejection, policy/ZIP checks, case collisions, empty matching legacy account,
  cross-user select/save/reassignment denial, owner save, receipts/conflicts,
  service-only email lookup/limiting, and retained rows with retired entry points.
- `core-controller.cjs`: 10 proof groups including route policy, old-flag deny,
  token refresh, account switching, late load/save, logout, failed logout lock,
  session expiry, unfinished-account recovery, and native reset API argument
  wiring. Auth is a local fixture; no actual email/password mutation.
- `core-login.cjs`: injected local Edge handler checks for Auth delegation,
  generic errors, no email disclosure, no-store, origin/CAPTCHA and rate denial.
- `core-ui.cjs`: actual bundled UI in headless Edge, eight public routes and
  twelve private deep links, signup fields/unchecked agreements, desktop/mobile
  layout, preserved homepage, zero browser exceptions. All external requests are
  intercepted/blocked. Screenshots/report: `preview/evidence/core-security/`.
- Next static build `next build --webpack` passed compilation, TypeScript and
  seven static pages. Account bundle rebuilt successfully. `git diff --check`
  passed (routine LF/CRLF notices only).

Run `npm run test:accounts:core` after bundling. These are meaningful local
security proofs, not hosted PostgREST/Auth/CAPTCHA/mail end-to-end evidence.
No real concurrent multiconnection signup collision, actual mailbox reset,
expired recovery link, or permanent-user shared-project isolation test was run.
The policy pages compile but were not separately rendered as exported pages.

## Rollout and rollback

Take a reviewed backup and retain current sanitized configuration before any
live application. Disable old APIs first at coordinated cutover; cached old JS
must lose access too. Apply reviewed migration, deploy reviewed login function,
configure verified delivery/abuse controls, run approved two-user smoke tests,
then publish the disabled-by-default frontend with the readiness flag enabled.
Check advisors and native errors after application; stop on unexpected drift.

Rollback should disable secureAccountsReady and retain the current gated public
browsing build, disable the login function if necessary, and keep new and beta
tables intact. Restore only explicitly reviewed project settings when needed.
**Do not restore username-only execute grants** or reopen beta collections just
to roll back UI. Do not drop schemas, delete accounts, truncate rows, or restore
a whole shared database over other apps. Export affected Core data for a later
repair; revision checks and receipts preserve traceability.

## Official references checked before implementation

- [Supabase changelog](https://supabase.com/changelog): Markdown endpoint failed
  in web reader and shell DNS; HTML index was inspected instead, with relevant
  breaking entries opened: [explicit Data API grants](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically)
  and [free-tier email-template restrictions](https://supabase.com/changelog/46599-changes-to-email-template-customisation-on-free-tier).
- [Password Auth and recovery](https://supabase.com/docs/guides/auth/passwords),
  [custom SMTP/default limitations](https://supabase.com/docs/guides/auth/auth-smtp),
  [rate limits](https://supabase.com/docs/guides/auth/rate-limits),
  [redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls),
  [PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow),
  [CAPTCHA](https://supabase.com/docs/guides/auth/auth-captcha).
- Available Supabase and Postgres skills read; no tracked repository AGENTS.md
  or repository skill file was found. CLI help was read and migration filename
  generated by `supabase migration new core_secure_accounts`, not invented.
