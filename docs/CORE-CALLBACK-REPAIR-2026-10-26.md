# Focused callback repair

Baseline: deployed PR18, `69ea4d282ba27265358f5d110435fe6f4658e1a8`.

## Evidence and limits

The real SDK/browser fixture initiates native signup and stores the SDK-generated
PKCE verifier through the production encrypted session adapter. A marked return
exchanges once, completes owner onboarding and reaches gated My Decks. The same
flow without `accountCallback=1` performs zero exchanges in the deployed code and
remains gated. This is reproduced locally, not inferred from email verification.

Live read-only checks found the existing approved account confirmed, with a
profile/workspace. Local Edge could open gated My Decks. Logs showed successful
refresh/user checks and separate invalid-credentials password attempts. Those
credential failures are not proven to be caused by callback handling.

Current signup/recovery code explicitly requests the marker in redirect_to; the
new fixture verifies that. A missing marker can represent a fallback/default root
return, but its actual hosted origin is unproven. The history lookup did not honor
its narrow filters and is not evidence of the cause; it will not be repeated.

## Repair

- A single nonempty code on the root page enables the SDK's native PKCE discovery
  without requiring UI metadata. Supabase still requires the stored verifier.
- Reuse native initialization, exchange once, then verify the exact token/user,
  confirmed nonanonymous identity, JWT subject/deadline and expected owner.
- Remove callback parameters after success/failure. Preserve safe recovery-request
  routing; do not render raw error descriptions. Surface a fixed guest notice.
- Reject and clean implicit token fragments. This is consistent with the existing
  flowType=pkce setting and the pinned SDK's own implicit-flow rejection.

No SQL, grants, RLS, credentials, CAPTCHA, email settings, storage adapter, route
policy, publishing service or news schedule changes.

## Checks

Eleven native SDK/browser flow groups passed: marked/unmarked signup, owner setup,
gated access, username/email login, reload/new tab, stored-session refresh,
closed-signup-tab continuation, missing/expired verifier/code, implicit rejection,
safe error handling, recovery, invalid bearer and mismatched owner. Synthetic
credentials/codes only; all Auth/Data/CAPTCHA HTTP intercepted. No hosted account
or email created. Existing SQL ownership/isolation, native Auth, controller,
storage and browser regression suites passed. Production webpack compilation,
TypeScript, seven pages and 4,698-file static assembly passed.

Fresh hosted signup/login and mailbox/recovery acceptance remain pending. PKCE
needs the initiating browser session's verifier; different browser/device or lost
session cookie cannot be repaired by trusting the URL. No gate bypass is added.

## Smallest user handoff

Use the published account page in one browser/profile. Check whether the approved
ecocrest.recycling@gmail.com test account already exists before signup. If absent,
the user privately enters/submits its password, ZIP, agreements and any bot check.
Open its confirmation email in the same browser/profile, complete username/ZIP
setup if prompted, then open My Decks and reload. Later sign out and sign in with
the chosen username or verified email and the same password. Do not send passwords,
verification URLs or reset tokens in chat. No test account deletion is authorized.

References: https://supabase.com/docs/guides/auth/sessions/pkce-flow and current
https://supabase.com/changelog.md (reviewed 2026-10-26).
