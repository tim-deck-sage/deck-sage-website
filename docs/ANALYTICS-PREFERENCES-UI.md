# Analytics preferences UI — staged, not published

## Verified cause

Read-only live inspection on 2026-11-02 found no open consent panel, including after reload. The always-visible “Analytics preferences” box was the reopen shortcut: `.ds-analytics-settings` had fixed positioning at the lower left. Normal stored consent was already remembered; the persistent shortcut was not evidence of repeated consent requests.

Tim subsequently selected this behavior: keep the initial consent prompt, remember acceptance and refusal, remove the always-visible box, and provide an unobtrusive way to reopen preferences. Default-on tracking is not part of this candidate.

## Candidate behavior

- Keep the initial prompt when no choice exists and browser storage can remember one. Both Allow and No thanks close it and persist the same existing `deck-sage-analytics-consent-v1` choice. The update does not clear or replace existing choices.
- Replace the floating boxed shortcut with an underlined, accessible button in normal flow at the footer. It has a 44px touch target and opens the named nonmodal preferences dialog only on request after a choice.
- Explicit reopening reports current status. Close/Escape preserves an existing choice and returns focus to the footer control. Escape on the initial unanswered prompt records refusal, never approval.
- Keep choices across route changes, reloads, later visits and new tabs in that browser. Synchronize changes with already-open same-origin tabs so withdrawal stops their collection too.
- If preference storage is blocked/read-only, leave analytics off and suppress repeated automatic prompts. The footer dialog explains the saving problem and disables Allow. A temporary capability probe is removed immediately; it contains no identity. No new cookies, credentials or cross-device identifiers are introduced.
- A failed attempt to save refusal disables analytics immediately and, if possible, removes only a stale prior grant. Existing saved refusal is not removed by this recovery path.
- Cleared site data, private browsing or another browser/device can legitimately need a new choice. This is browser persistence, not a global per-person identity system.

Google loads only after explicit consent, with existing screen/parameter sanitization and advertising restrictions. Withdrawal retains the documented Google disable flag, clears only GA cookies, and reloads without the tag when the refusal was saved. Account/session cookies, account settings, affiliate behavior, homepage layout and public Analytics configuration are unchanged. Google documents the disable flag at https://developers.google.com/tag-platform/security/guides/privacy?hl=en#turn_off_google_analytics .

## Verification

- `npm run test:analytics`: existing consent/transport/privacy regression plus new 390px/1440px preference tests. Acceptance AND refusal persist across reload/hash/static pages/new tabs; existing tabs synchronize; Close/Escape/focus, panel bounds, cleared storage and blocked/read-only storage pass. Real Google requests are blocked and the Google tag is stubbed.
- `tests/regression/analytics-policy.cjs`: no tag before consent or after refusal; private-ID/query exclusion, fixed event schemas, one pageview/init, privacy signals and advertising-disabled checks pass.
- `tests/regression/analytics-app-ui.cjs`: actual local SPA, Next legal/client navigation and static precons share the behavior; remembered choice hides prompts; the normal-flow footer control stays below homepage content on desktop/mobile; no page errors. Auth cookie preservation remains covered by the existing withdrawal test.
- Full production Next build passes with installed patched Node 24.22.2 and one worker. Final static runtime/CSS assembly and the final browser regressions pass. No installs or publication performed.

Preview files: `preview/evidence/analytics/footer-home-390.png`, `footer-home-1440.png`, `footer-end-1440.png`, `footer-precons-390.png`. Test consent choices exist only in isolated fixture contexts; no real visitor choice was changed.

## Publication scope

Seven files: public Analytics runtime/style, existing Analytics test command, policy test adapter, actual-site UI test, new preference browser tests and this review. Upload only the reviewed candidate to `tim-deck-sage/deck-sage-website` and use its existing Pages workflow after approval. Recheck live main `2c92abcfe9d7ce7521ee773f7dc8633d3fb9be75` first. No Google account/property setting changes, default-on tracking, account/database changes or unrelated redesign are included.
