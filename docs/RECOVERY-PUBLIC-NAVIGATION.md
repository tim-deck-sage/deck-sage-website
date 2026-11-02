# Recovery public navigation follow-up — not published

Review after uploading the exact approved account-entry candidate found a regression introduced by its route policy: `canonicalAccountRoute('home','recovery')` returned `reset-password`. Because canonicalization runs on hash changes, the reset form's “Return to the public homepage” link could not stay on Home while a recovery session remained active. The new unit assertion reproduced this failure. Ordinary signup/login and avatar entry are unaffected; no private-data bypass was found.

The staged correction restores the previous mode-entry behavior: entering recovery initially opens reset, while later public-page navigation is allowed. Private and account destinations still return to the protected reset form until recovery finishes. It changes only the route helper, App effects, generated bundle, unit/browser regressions and this note. It does not change Auth configuration, passwords, ownership checks, affiliate or Analytics settings.

Validation uses the existing native SDK with synthetic intercepted Auth/Data/CAPTCHA responses. The browser regression now follows the public-home link from an active recovery form, then follows My Decks and verifies it returns to password recovery without rendering private decks. The existing avatar/signup/confirmation proof groups remain required. No real recovery links, credentials, account changes or email were used.

This correction is separate from the exact eight-file publication approval for `cd32270` (remote `6919770`). It is staged for review and requires publication scope approval before upload. The published candidate and its live verification receipt remain unchanged.
