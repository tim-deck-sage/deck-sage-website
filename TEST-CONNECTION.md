# Authorized test connection — preparation

Historical preparation record. The approved migration and callbacks have now
been applied to the test project; see `HOSTED-CONNECTION.md` for current verified
state and the remaining secure email/Auth handoff. No real Auth tests have run.

Tim approved connecting the account feature to test Supabase. Target only:
`mihmykgxbneuhlcxolzm` (Deck Sage DB Integration Test).
Migration application is waiting for the independent security review through the
parent. No migration or Auth setting change has occurred during this preparation.

Read-only checks confirmed ACTIVE_HEALTHY, no existing `ds_private` schema or
`ds_profiles`, `ds_consents`, `ds_workspaces`, `ds_policy_versions` collisions.
The public Auth settings endpoint reports email enabled, signup enabled
(`disable_signup=false`), email confirmation required (`mailer_autoconfirm=false`),
and anonymous sign-in disabled. These flags already match the approved design.

An enabled modern publishable key is available: name `default`, id
`0f8c5f9c-254f-4d25-8c2c-3ca72e33c5c3`. This is a public frontend key, not a service
secret. Its value is not included in this document. No service-role key, password,
SMTP secret, personal-access token or other private credential was retrieved.

## Exact remaining settings inspection/change

The available Supabase connector has no Auth config read/update operation. Its
public `/auth/v1/settings` endpoint does not reveal Site URL, redirect allowlist,
SMTP readiness, templates or private rate-limit/password configuration. Do not
guess these settings or retrieve a management credential to bypass that gap.
Use an already-authorized dashboard or supported management interface; if fresh
sign-in/access or SMTP credentials are required, Tim supplies/approves them himself.

Preserve the existing app's Site URL and redirect entries until inspected. Add
only missing exact website/test callback URLs, without broad wildcards:

- `https://deck-sage.com/?accountCallback=1`
- `http://127.0.0.1:4182/?accountCallback=1`

Signup confirmation and password recovery both derive that callback from the
browser's origin. Do not test hosted email while the real callback allowlist and
email template delivery are unknown. A Site URL change to `https://deck-sage.com`
is a candidate only after inspecting its current use; never overwrite existing
mobile deep-link configuration blindly. Email signup and confirmation settings
need no change based on the public checks.

Verify custom SMTP readiness without revealing credentials. Supabase default
SMTP accepts only project-team addresses and is unsuitable for public beta email.
Do not create an SMTP account or persist credentials on Tim's behalf. Configure
only through a secure user-approved entry workflow if it is needed.

## Test execution after security review/application

`tests/accounts/hosted-rollback.sql` is a single-connection transaction test. It
creates two temporary, passwordless fixture auth rows and website records,
exercises authenticated/anon roles, owner isolation, denied owner reassignment,
current consent, stale revision rejection and relogin reads, then ROLLBACKs all
rows. It does not create persistent credentials, send mail, test JWT transport,
grant administrator rights, or assert that real Auth is working. On any SQL
error, explicitly ROLLBACK before reusing the connection.

`tests/accounts/hosted-script.cjs` rehearses this script locally in embedded
PostgreSQL and asserts zero auth users/workspaces remain after rollback. This
local rehearsal is not a hosted test result.

After the reviewed migration and hosted role checks pass, configure the isolated
browser candidate with its test URL and enabled publishable key only. Do not push
main or deploy. Real signup/confirmation, two-user Auth/REST isolation, recovery
and durable browser relogin need secure human-created test accounts. Tim's account,
password and exact-UUID administrator provisioning remain separate explicit steps.
