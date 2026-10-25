# Live rollout checkpoint — 2026-10-25

Candidate HEAD: `4c289b9cdded53820af85eae14d7eaf61197a21d`.
Frontend remains unpublished and accounts disabled.

## Applied under the bounded rollout approval

- Exact approved Core migration SHA256
  `415C8767296E805C0E506281ECE281F0A9BCC7E72A1D19ED731C238B48981CC6`.
  Hosted migration history: `20261025125624 core_secure_accounts`.
- Exact approved isolation migration SHA256
  `B72D2244FDE893C8313218AAE93FA327AB6BDC66A2EFECB63620B92372FBA3D5`.
  Hosted history: `20261025130116 core_legacy_membership_boundary`.
  Initial call returned expired request state; read-back established no boundary
  or history before one successful retry. No guard was bypassed.
- Core table RLS enabled, owner SELECT policies installed. All five identified
  unchecked internal helpers have authenticated EXECUTE revoked. Email resolver
  EXECUTE denied to anon and authenticated. Legacy membership table empty.
- Permanent Auth users remained zero, anonymous users five, before migrations.
- Auth Site URL changed from localhost to `https://deck-sage.com`, verified after
  reload. Existing callback entries retained.
- Password minimum visibly six before save, twelve after full reload. Other
  email provider controls retained.
- `website-core-login` deployed ACTIVE version 1, `verify_jwt=false`.
  Deployment bundle digest:
  `ea059389c1ca70a5417f481432397241ca444cd5bd0e1f068117c78ffda16e29`.
- Added only `CORE_SITE_ORIGIN` and `CORE_PUBLISHABLE_KEY`, verified present
  after reload. Existing default server credentials used without retrieval.

SMTP, DNS, mail templates, other functions/providers and schedules unchanged.
No test accounts, verification emails or recovery emails created/sent.

## Actual hosted HTTP evidence

Requests used the existing public project key. No user rows were fetched.

| Check | Result |
|---|---|
| Anonymous Core profiles | 401 / 42501 |
| Anonymous Core workspaces | 401 / 42501 |
| Old username-only shared load | 401 / 42501 |
| Anonymous private email resolver | 401 / 42501 |
| Forged bearer on Core workspace | 401 / PGRST301 |
| Public news projection, zero-row request | 200 |
| Public store projection, zero-row request | 200 |
| Login production-origin OPTIONS | 200, exact production CORS origin |
| Login without CAPTCHA | 400, generic Unable to sign in |
| Login unapproved origin | 403, generic Request unavailable |

One store query initially used nonexistent `store_id`; corrected to zero-row
projection and passed. An unchecked-helper HTTP probe had a parameter mismatch
and returned PGRST202, so it is not counted as enforcement proof; exact live
privilege metadata confirms all five revocations.

## Sequencing dependency before publication

The real Turnstile widget authorizes deck-sage.com; the candidate is local and
the public production frontend is still the earlier release. Real CAPTCHA,
signup, PKCE callback, verification-mail delivery, recovery/password update,
owner/cross-user access, logout/account-switch and expiry tests therefore remain.
Do not claim a generic recovery response as delivery proof.

Approval requires those tests before frontend publication. A bounded temporary
candidate path on the production hostname (with existing public site retained)
would expose a frontend before those tests; this sequencing change must be
resolved explicitly, rather than silently deploying or bypassing CAPTCHA.
User must enter and submit new/reset passwords through secure browser handoff.
Approved recipients: tim@deck-sage.com and tim.moore17@aol.com.

Retain the isolation boundary if blocked. Do not reopen username-only grants.
