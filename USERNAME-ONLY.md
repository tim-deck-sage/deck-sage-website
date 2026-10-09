# Username-only browser accounts: review candidate

This candidate is isolated on `feature/username-only`, based on `d0cd3c4f29a6c860c3710ac8664362d99adb4d39`. Prior email/password candidate and local preview remain separate.

## Ownership and claims

The native Supabase `signInAnonymously()` session owns each collection by `auth.uid()`. The browser retains that private session. A username is permanent display identity, never a login or recovery credential. Other browsers, sign-out and cleared storage cannot recover a collection by typing the username. The UI states this and offers exports. There is no default logout control.

Terms and privacy remain unchecked; local policy validation runs before Auth creation. Server policy checks, profile claim and new workspace creation occur in one transaction. The server trims and lowercases names, validates 3–24 ASCII letters/numbers/underscores, and lets the existing global unique index arbitrate collisions. A rejected claim leaves no partial profile/workspace; retry reuses the same anonymous session.

Existing RPC expected-user UUID checks, owner RLS, revision compare-and-swap, operation receipts and repeat-safe explicit guest imports remain. No automatic guest import, username directory, password/email call, admin-by-name or client role assignment is introduced. Separate Auth storage and disabled URL callback discovery avoid adopting prior email flows.

## Held migration and test setting

`supabase/migrations/20261009225229_username_browser_accounts.sql` is NOT applied remotely. It allows anonymous users through the private account guard, updates atomic onboarding, and creates a private deny-client-access reservation table for `tmoore`. Existing public RPC signatures and execute grants remain.

Tim explicitly authorized anonymous Auth in **Deck Sage DB Integration Test**, project `mihmykgxbneuhlcxolzm`. Only that switch was changed, saved and verified after reload. Signups remain enabled, manual linking disabled and email confirmation enabled. No Dev/Prod changes, publication, push, SMTP changes or admin grants occurred.

The build requires `DECK_SAGE_USERNAME_ONLY_READY=true` as well as the test URL and modern publishable key to enable registration. Default build emits null configuration and disables the claim button pending independent exact-change review/migration approval. Existing server still requires confirmed nonanonymous users, so do not enable the candidate configuration before reviewed migration application.

## Reserved Tim username

`tmoore` is reserved with a null claimant; everyone is denied until an operator assigns a verified Tim browser Auth UUID. Proposed later procedure: establish Tim's own anonymous browser session, verify that live session's owner via Supabase `getUser()` in Tim's authorized browser (never infer it from a username or arbitrary user-supplied UUID), independently approve a narrow privileged assignment of `reserved_usernames.claimant_user_id`, then retry the claim in that same session. This only reserves the name; no admin role follows. No assignment or admin change has been made. Exact provisioning should be reviewed before execution.

## Verification

- 14 embedded PGlite SQL checks: actual old and new migrations, normalized uniqueness, policies, anonymous ownership, private reservation, expected UUID, import idempotency, no admin, rollback and serialized concurrent-issued collision.
- 15 isolated browser checks: actual Supabase PostgREST SDK against embedded SQL with fixture Auth; username-only UI, readiness gate, policy-before-Auth, collision/retry, stored-session reload, explicit guest import, distinct browser identity, and bearer switch rejection for save/onboard/import. Every external request is intercepted; fixtures create no hosted data.
- Approved real native SDK browser Auth probe: anonymous user `eed28953-43d2-42d6-9311-c27e85b7b6f9`, no email, same browser reload success. Hosted read-only check confirmed zero ds_profiles, ds_workspaces and private role rows for that UUID. It remains in the test Auth table because no deletion was authorized. Isolated context was closed; no access/refresh tokens exported.
- Next static export passed using `next build --webpack`; default Turbopack cannot traverse this checkout's shared node_modules junction. No dependency versions changed. Reassembly verifies final preview sources.

Run `npm run test:accounts` for the 29 local username checks. Historical email-flow tests remain as earlier candidate evidence, not current username validation. `usernames-hosted-auth.cjs` is explicitly opt-in; each execution creates a persistent test Auth user and must be separately authorized. It refuses to run without `DECK_SAGE_ALLOW_TEST_ANONYMOUS_USER=true` and a test publishable key.

## Remaining gates

Independent code/migration review, then separately authorized hosted migration application and true multi-connection concurrent claims plus real owner write/read and cross-user denial tests. Embedded concurrency is serialized, not evidence of hosted parallel transactions. Before a public beta, review legacy authenticated grants/RLS and abuse controls/CAPTCHA: Supabase anonymous users use the authenticated role, so legacy permissions apply. These legacy grants were not changed in this candidate. No recovery, paid credits, ads, live scanner changes or subscriptions were added.
