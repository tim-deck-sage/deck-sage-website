# Independent-review fixes — awaiting recheck

Historical fix record. The parent subsequently approved exact commit `5d565d8`
after independent recheck, and the test-only migration has been applied.
See `HOSTED-CONNECTION.md` for current hosted results; real signup/recovery and
authenticated transport tests remain unrun, with no real/admin account created.

The independent review of `8fabc5b8e53fb45eea7e9147cd80f23433add962` found three
release blockers. That candidate must not be applied/deployed. These local fixes
are pending the parent's independent security recheck. No hosted migration,
settings change, account creation or administrator grant has occurred.

## P1: deferred token acquisition could write one account's data to another

Epoch guards protected responses but did not bind the SDK's eventual request
identity. Save, import and onboarding now capture the initiating verified UUID
in the controller and pass `p_expected_user` through the browser adapter and RPC.
`ds_private.require_user(p_expected_user uuid)` derives owner from `auth.uid()`
and raises `ACCOUNT_CHANGED` if they differ, before any row read/write. The
expected UUID is an assertion, never an authority/ownership override. Every
mutation wrapper/private signature and explicit EXECUTE grant is updated.
There are no old unbound RPC overloads in the proposed initial migration.

Read queries also filter `user_id` by the initiating UUID in addition to RLS.
Identity mismatch immediately clears private UI data and locks account loading.
Operation retry UUIDs remain paired with their original initiating user.

Password updates freeze a session access token in memory, verify its user using
the pinned Auth SDK's explicit `getUser(token)` contract, and PUT `/auth/v1/user`
with that exact bearer. A switch before capture rejects; a switch after capture
cannot redirect the password update to another account. No token is logged or
persisted by this update adapter. Signup and recovery requests remain explicit
user-entered Auth operations; no credentials were entered by the agent.

Proposed public signatures:

```
ds_finish_onboarding(p_expected_user uuid, p_username text, p_version text,
                     p_terms boolean, p_privacy boolean)
ds_save_workspace(p_expected_user uuid, p_state jsonb, p_revision bigint,
                  p_operation uuid)
ds_import_guest(p_expected_user uuid, p_state jsonb, p_revision bigint)
```

## P1: failed logout could reopen account view on automatic refresh

Logout latches the locked state before making its Auth request. Automatic
TOKEN_REFRESHED, SIGNED_IN, INITIAL_SESSION and PASSWORD_RECOVERY callbacks cannot
unlock it. Retry account loading cannot bypass it. A localStorage marker plus
sessionStorage fallback preserves it across reload, including localStorage quota
failure. Cross-tab lock events clear cache and keep automatic callbacks blocked.
Only a successful logout or explicit successful credential sign-in clears the
latch. The UI offers a separate “Sign in instead” action; merely receiving a
SIGNED_IN callback does not count as that action.

## P2: recovery during unfinished onboarding lacked password fields

Recovery now takes precedence over onboarding when rendering password/confirmation
fields. Controls wait for the verified session to load. After successful password
update, unfinished onboarding resumes with its required policy boxes unchecked.
Existing same-tab recovery-intent persistence remains in place.

## Evidence and limits

`tests/accounts/adversarial.cjs` runs real Supabase PostgREST SDK deferred token
acquisition in a real browser and executes the revised SQL in embedded PostgreSQL.
Auth sessions and HTTP responses are explicit fixtures; no hosted access tokens,
users, passwords, SMTP or persistent credentials are created. It proves the actual
request has B's bearer and A's expected UUID, and actual SQL rejects save/import/
onboarding before B changes. It also covers failed logout callbacks/reload/storage,
explicit unlock, password-token races, and recovery-before-consent rendering.

Verification matrix:

- 16 embedded PostgreSQL ownership/consent/retry checks.
- 12 mocked controller/SDK contract checks.
- 8 browser account workflows with real SDK/intercepted Auth HTTP.
- 11 adversarial browser/SDK/SQL checks.
- 23 preserved guest workflows and 9 fantasy/accessibility checks.
- 1 local rehearsal of `hosted-rollback.sql`, asserting zero fixture auth users
  and website workspaces remain after ROLLBACK.
- Full static build and diff whitespace checks pass.

These 80 local checks are not hosted Auth, real email, or hosted JWT/RLS transport
results. Hosted application/testing remains held for review. The rollback script
has been updated for the new UUID-bound signatures and creates no persistent
credentials when run as a complete single-connection transaction.

Exact migration diff can be inspected with:
`git diff 8fabc5b -- supabase/migrations/20261009153100_free_accounts.sql`.
The migration file was never applied, so this edits the reviewed pending initial
migration rather than adding a patch to a hosted history entry.

`TEST-CONNECTION.md` records the verified public Auth flags, enabled publishable
key metadata, connector Auth-settings gap, and exact pending callback entries.
The frontend still builds with accounts disabled until the reviewed test
connection is enabled. Main/publication and all legacy app schemas are untouched.
