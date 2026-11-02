# Account entry routing — staged, not published

## Evidence and limits

Read-only production tests on 2026-11-02, after release `20e64c249cf46dc1669be50c32123e545e242609`, followed the homepage avatar at desktop and 390px mobile width. Both navigated to `#/settings` and rendered `CoreAccountPanel`: current username/email and password inputs, current account styling and no username-only legacy text. No real credentials or signup were submitted.

The old `AccountPanel.jsx` username-only component remains in repository history/source but is not imported by the current application. The reported old development screen was not reproduced on a fresh production load. Cached scripts are a plausible explanation, supported by the preceding release verification finding an already-open tab retained the older script until a cache-bypassing reload. This is not proof of what Tim saw; if it persists after refresh, the exact URL and screenshot are needed to identify the screen.

The demonstrated routing inconsistency is that profile, avatar and sign-in entry controls all targeted `settings` even for signed-out visitors, while the explicit authentication route is `account`. A separate demonstrated return-path defect forced every unfinished profile onto `account`, losing a requested deck/tool destination.

## Focused candidate

- Shared `accountRoutes.js` maps signed-out avatar/account links to `#/account/settings`; signed-in links remain `#/settings`.
- Editorial avatar, desktop/mobile account menus, homepage account links, sidebar and generic top-bar entry controls use that shared route policy.
- Old `#/settings` bookmarks remain supported and replace into the canonical signed-out account route without adding a redirect/back-button loop.
- Successful sign-in from the canonical profile entry returns to private profile settings. Explicit account return destinations are restricted to safe local hash paths; external, malformed and recursive authentication destinations are rejected.
- Profile completion preserves a gated deck/tool route rather than overwriting it. Recovery retains its existing precedence and protected reset flow.
- Static homepage account links are regenerated consistently. Existing signup release, credentials, Auth settings, ownership checks, data schema, affiliate and Analytics configuration are unchanged. This does not reactivate or modify the legacy username-only component.

## Validation

- `tests/accounts/core-entry-routes.cjs` passes: guest/loading/locked/onboarding/member entries, settings alias, private deck return, recovery precedence and unsafe/recursive target rejection.
- `tests/accounts/core-confirmation-flow.cjs` passes all 18 proof groups using the real SDK and intercepted synthetic Auth/Data/CAPTCHA HTTP. Added 390px/1440px homepage and card-header avatar coverage, shared repaired signup confirmation field, legacy-screen absence, direct settings/reload, profile return, signed-in avatar and back navigation, and private deck return. Existing signup, validation, timeout, marked/unmarked confirmation, recovery, owner mismatch and session tests remain passing.
- `tests/accounts/core-ui.cjs` passes public/private gates, account setup/session/recovery and mobile layout.
- Analytics consent/sanitization browser tests, public SEO tests and affiliate suite pass.
- Production Next webpack build and static assembly pass with patched installed Node 24.22.2 and one CPU worker; original Next config restored. No installs or hosted mutations performed.

Local screenshots are under `preview/evidence/account-entry/`. Real phone screenshots and real mailbox/login outcomes remain user acceptance checks, not claimed proof from synthetic tests.

## Proposed publication scope

Publish only the reviewed routing source, generated homepage/bundle, tests and this review file through `tim-deck-sage/deck-sage-website` and its existing Pages workflow. Base is the just-published signup repair; recheck main before upload and preserve unrelated changes. No publication has occurred for this candidate. No account creation, email, Auth configuration or database changes are included.
