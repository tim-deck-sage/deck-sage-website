# Affiliate activation candidate — 31 October 2026

Tim supplied the full Impact tracking URL and explicitly authorized publishing this affiliate candidate after testing. The earlier request for an additional permission screenshot is superseded: the selected asset honored distinct encoded destinations for the known card and Mass Entry, and then the homepage. Tim also generated the original card-specific link in Impact. No contrary restriction was identified in the available program evidence.

[Impact's technical documentation](https://impact-enterprise-group.readme.io/impact-publisher/docs/mobile-app-tracking-integrtion) states that assets which disallow deep linking route to their default instead of the supplied `u` value. [Its permitted-domain guide](https://help.impact.com/brand/what-would-you-like-to-learn-about/account-administration/program-settings/tracking-settings/set-up-permitted-domains-for-deep-linking) says unpermitted domains route to a generic Impact page. The three successful same-asset overrides therefore support enabling these TCGplayer destination families without requiring a hypothetical separate permission document. This is practical technical evidence, not a guarantee of conversion credit or a legal conclusion about unreviewed terms.

## Configuration and receipts

- Tracking URL: `https://partner.tcgplayer.com/c/7995826/1780961/21018`.
- HTTPS tracking host: `partner.tcgplayer.com` only.
- Merchant allowlist: `https://www.tcgplayer.com/product/` prefix, exact `https://www.tcgplayer.com/massentry`, exact `https://www.tcgplayer.com/`. Homepage is not a blanket prefix allowance. Cart, arbitrary search query URLs, other hosts/protocols and undocumented Mass Entry prefill parameters are rejected.
- 12:11:59–12:12:00 UTC: product 498341 and Mass Entry each returned tracking 301 to the requested destination, then merchant 200; identity `irpid=7995826` preserved.
- 12:16:39 UTC: homepage returned tracking 301 to the requested homepage, then merchant 200 with the same identity.
- Evidence: `preview/evidence/full-impact-verification.json` and `full-impact-home-verification.json`; click identifiers redacted. Three new test clicks may appear in Impact. The earlier two short-link checks were separate, for five total known test clicks in this investigation.
- No cookies, purchases, cart writes, external messages, account changes or new tracking assets were used.

## Candidate behavior

All verified card renderers expose purchase controls regardless of ownership. The sole card-display exception is My Decks commander cover/hero art. Unknown/custom records cannot fabricate product URLs; illustrative art is distinguished from the real card reference. Recommendations remain independent of commission. Nearby affiliate disclosure and new-tab labels remain present.

Decks and selected recommendation groups copy accurate quantities for TCGplayer Mass Entry and open the tracked Mass Entry page; users paste and review matches themselves. Sealed precons have a separate copy-name/product-search fallback through the tracked homepage. No one-click cart import or eligible commission has been claimed.

## Reconciliation, publication and rollback

The candidate incorporates the existing main release `220a416d525cc30a1223724a430eca14ba849fa8` account callback/theme fixes without changing their behavior or hosted account configuration. Remote-only binary documentation remains in the GitHub base tree. Core services/models/schedules are untouched.

Publication uses the existing GitHub Pages workflow via a fast-forward commit on main, with an expected-head check to avoid overwriting intervening work. Preserve `220a416d525cc30a1223724a430eca14ba849fa8` as the pre-affiliate rollback baseline. An affiliate-only rollback sets `enabled:false` in `preview/public/affiliate-config.js` and rebuilds/deploys through the same workflow; no account rollback is needed. Final build, policy/UI and live release evidence are recorded separately in the local evidence directory and completion report.

Tim owns inviting beta testers. Testing is purchase-free unless an independently eligible customer chooses to shop; funded proxy/family purchases are not assumed commission-eligible. Real attribution can be assessed only through eligible order reporting. Competing-shop advertising remains parked.
