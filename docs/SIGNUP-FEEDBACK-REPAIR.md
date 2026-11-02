# Signup feedback repair — local candidate, not published

## Observations

Production main was verified as `919ffba3c135e21b6fdcf0b53e9a7409094c95d0` on 2026-11-02. Read-only production inspection confirmed the signup form, its missing confirmation-password field and absence of persistent verification status. No live signup was submitted.

The previous successful signup handler only set a status paragraph above the form. It neither changed to sign-in nor displayed a confirmation dialog. Native validation had no application field errors, CAPTCHA failure left submission disabled without an explanation, and a pending request had no time limit. These are demonstrated code defects. They do not establish whether Tim's particular request reached Auth, or prove the cause of Tyler's earlier invalid-credentials response. The scoped 08:45–09:25 UTC Auth-log aggregate returned no signup entries; absence in that result is not proof of an account outcome.

## Repair

- On an accepted signup response, show a focused, accessible “Check your email” dialog over the sign-in screen; prefill email for subsequent sign-in and clear both password fields.
- Use identical conditional wording for new and existing-account responses. Supabase intentionally obscures existing-account information, so the UI cannot truthfully promise “account created” or email delivery for every successful response.
- Validate required username, email, ZIP, password length, password confirmation, agreements and verification with red styling, inline reasons, `aria-invalid`, descriptions and focus/scroll to the first error. Keep ordinary native constraints on other forms.
- Map documented Auth codes to fixed safe password/email/verification or service messages. Never reflect arbitrary server text or disclose registered emails.
- Show verification loading/ready/unavailable/expired status and an explicit retry. Allow signup submission to explain a missing verification instead of leaving an unexplained disabled button.
- Lock inputs/mode changes during signup and guard duplicate submissions synchronously. Protect the SDK PKCE verifier with one in-flight signup in the backend adapter even across screen remounts.
- After 30 seconds, end the waiting UI with an unknown-outcome warning, not a success announcement. Do not automatically retry or accept a late response as UI success. Another signup in that screen requires refresh; backend duplicate protection remains while the original request is pending.
- Reject an empty Auth result instead of treating it as accepted. Preserve the existing fail-closed handling of an unexpected immediate session.

Existing unpublished login guidance `95e070a` is retained as the parent of this branch. Publishing this candidate would include that guidance as well as this signup repair. Affiliate configuration, Analytics configuration/consent, auth policy, keys, callback proof requirements and database schema are unchanged.

## Validation

All hosted Auth, Data and CAPTCHA requests in browser tests are intercepted. Only synthetic credentials, users, tokens and codes are used; no emails, real accounts, purchases or user-data writes occur.

- `tests/accounts/core-confirmation-flow.cjs`: desktop 1440px and mobile 390px; required/malformed fields, password mismatch, leading-zero ZIP, agreements, field descriptions/focus, reduced 420px viewport simulating keyboard space, modal/sign-in transition, unknown/existing/obfuscated responses, weak password, invalid email, CAPTCHA, rate/service/network errors, empty results, 30-second timeout, duplicate and late responses. Also marked/unmarked PKCE, onboarding, owner gating, username/email login, refresh, new tab, logout, recovery, expired/missing proof and mismatched owner.
- `core-auth-native.cjs`: 12 native SDK/HTTP proof groups, including in-flight signup protection across remounts.
- `core-controller.cjs`, `core-login.cjs`, `core-browser-session.cjs`, `core-callback-relay.cjs`: pass.
- `core-ui.cjs`: public/private direct navigation, onboarding, sessions, recovery and mobile layout pass.
- Analytics consent/sanitization browser regression, affiliate regression suite and public SEO suite pass.
- Production Next webpack build/static assembly passes with installed Node 24.22.2 and one CPU worker. No dependency downloads.
- Broader `npm run test:accounts:core` cannot start its SQL tests because `@electric-sql/pglite` is not installed in this checkout or the trusted bundled modules. No install attempted. Relevant remaining tests were run separately. No SQL/policy changes are part of this patch.

Screenshots: `preview/evidence/signup-feedback/validation-390.png`, `validation-1440.png`, `notice-390.png`, `notice-1440.png` (local ignored evidence). Desktop Chromium/Edge emulation does not prove physical iOS/Android keyboard behavior or real mailbox delivery. Tim's own phone/mailbox retry remains the acceptance check after approved publication.

## Publication proposal — approval required

Upload only the reviewed signup/login candidate's changed website source, generated public bundle/style and regression/review files to `tim-deck-sage/deck-sage-website`, based on rechecked main, then let its existing `.github/workflows/nextjs.yml` publish to GitHub Pages. Preserve current public configuration and all unrelated main changes. No Auth configuration, security permissions, secrets, accounts or email operations are included. Verify live asset revision, empty/invalid form feedback and mobile/desktop layout without submitting a valid live signup. An actual email-delivery test requires separate permission for the specific mailbox/account action.

## Official references

- https://supabase.com/docs/reference/javascript/auth-signup — existing-account obfuscation and PKCE signup behavior.
- https://supabase.com/docs/guides/auth/debugging/error-codes — structured error-code handling.
- https://supabase.com/changelog.md — checked relevant changes; the October 12 TLS cipher notice takes effect November 10 at the earliest and does not explain this November 2 UI defect.
