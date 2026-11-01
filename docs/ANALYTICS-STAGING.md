# GA4 beta analytics - activation candidate

## Verified account state

On 31 October 2026, Tim approved creating free GA4 under the existing signed-in Deck Sage Google profile, tim@deck-sage.com, and accepting the disclosed US Analytics Terms and Google Ads Data Processing Terms. Both agreements were accepted through the official creation dialog. Account details confirms Data Processing Terms accepted October 31, 2026. No additional agreements, credentials, users, API secrets or product links were created.

Created account **414246535**, property **561786897**, web stream **16245150509**, measurement ID **G-ZKDPBMQ22E**, website https://deck-sage.com. Verified Deck Sage account/property name, United States, New York reporting time, USD, Games industry, traffic/engagement objectives. All four optional account sharing settings are saved off. Google Signals and user-provided data collection are off; advertising personalization is allowed in 0 of 307 regions. Granular location/device collection is off. Enhanced Measurement is off in the stream. Optional marketing emails were declined.

Official agreements: https://marketingplatform.google.com/about/analytics/terms/us/ and https://business.safety.google/adsprocessorterms/ . The dialog's older privacy.google.com/businesses/processorterms link refers to the disclosed processing terms. No Google Signals, user-provided-data or advertising-feature agreement was accepted.

Verified owner dashboard: https://analytics.google.com/analytics/web/?authuser=1#/a414246535p561786897/reports/intelligenthome . Publication and real event verification are recorded separately in the activation receipt; account creation alone is not proof of collection.

## Offline implementation

- The activation candidate uses the verified public measurement ID and review flags. Google is still loaded only after consent, and private/account routes remain excluded.
- Basic consent: no Google tag/pings before opt-in. Decline preserves the free tools; preferences can be reopened. Withdrawal disables collection, clears only GA cookies and reloads without the tag. GPC/DNT keep collection off; account/session storage remains intact.
- Manual page views use fixed titles and normalized hash-route categories. Private deck IDs, arbitrary query parameters, document titles/referrers and account/recovery/settings screens are not sent. Repeated page notifications/runtime initialization are deduplicated.
- Events: tool_run for bulk discovery start/completion; deck_analysis for completed/failed deck recommendation requests; affiliate_click for card, deck-list, recommendation-group and sealed-search links. Parameters accept only enumerated categories. No emails, usernames, ZIPs, user IDs, deck names/lists, prompts, searches, image contents, raw link URLs or card names are supplied.
- Google Signals and ad personalization stay disabled; Ads consent stays denied. Automatic Enhanced Measurement must be verified off in the actual stream before activation to prevent duplicate history views and automatic form/search/outbound-link data.
- The SPA, Next legal pages and static precons guide share the runtime. A consent/privacy notice is drafted, distinguishing technical/pseudonymous GA processing and cookies from private account data. Root CSP allows the necessary Google tag/analytics hosts.
- Existing affiliate identity/configuration, SEO pages and private account boundaries remain intact. No Core services are touched.

The Google tag is third-party code once visitors consent. The tests below use a local stub and do not establish real Google delivery. Activation cannot be called complete without actual property/settings and DebugView/Realtime evidence.

## Runtime and verification

Used existing task-local official Node **24.22.2** at C:/Users/timmo/Documents/Codex/2026-10-31/task/.audit-runtime/node-v24.22.2-win-x64/node.exe . The existing ZIP SHA-256 matched ca1bff5d8ead13c9f2ea404a176db46bd430704d5b5113734049fa365e7799e2. PATH was prefixed for child tools. The affected primary Windows Node 24.19.0 was not used for untrusted fetching/processing. No downloads, installs or shared runtime edits.

The workflow preserves security release 0c979681abbd3c3a61b4c5b0364785f8506153dd's exact Node 24.22.2 pin/runtime check. Production webpack build, TypeScript, scanner packaging, app bundle and assembly passed; original Next config restored.

Passed: analytics-policy.cjs; analytics-ui.cjs (consent, persistence, sanitized payloads, duplicate init, GPC, sensitive queries and withdrawal/account-cookie preservation); analytics-app-ui.cjs (actual SPA/Next/static-page wiring with Google/merchant interception); existing SEO JS-on/off desktop/mobile tests; affiliate UI checks; all 11 mocked native account-confirmation flows.

Evidence: preview/evidence/analytics-production-build.log, analytics/browser-report.json, analytics/app-browser-report.json, and existing SEO/affiliate reports. No real GA requests, merchant tracking requests, purchases or hosted account writes were made by these tests.

## Finish after the account/legal decision

1. Confirm profile/property and country/timezone. Prepare minimal free settings, stopping for actual terms approval before agreement acceptance.
2. Read the real web-stream Measurement ID; verify Enhanced Measurement and relevant privacy settings rather than guessing. No Ads links, Signals, extra users, API secrets or paid features.
3. Set verified public configuration, enable the reviewed consent-first integration and complete review/regressions, preserving the security CI pin.
4. Publish only when account/legal blockers are cleared. The setup request authorizes the scoped website integration but not undisclosed agreements/access/privacy choices.
5. Verify actual normalized page_view, bulk/deck-analysis and affiliate-click events in DebugView/Realtime using purchase-free owner tests. Provide the actual verified property dashboard URL, never a guessed property ID.
6. Simple reports: Reports → Realtime for current opt-in activity; Engagement → Pages and screens, using page title, for tool usage; Events for tool_run, deck_analysis and affiliate_click. Declined consent/ad blockers and reporting delays limit counts. Usage is not proof of purchases or commission credit. No Core dashboard is needed.

## Official references

- [Manual pageviews and duplicate history tracking](https://developers.google.com/analytics/devguides/collection/ga4/views)
- [SPA measurement and DebugView](https://developers.google.com/analytics/devguides/collection/ga4/single-page-applications)
- [Consent implementation](https://developers.google.com/tag-platform/security/guides/consent)
- [Avoiding PII](https://support.google.com/analytics/answer/6366371)
- [Google tag CSP requirements](https://developers.google.com/tag-platform/security/guides/csp)

No paid tier, outreach, purchase, additional access grant, persistent credential or Core change was performed. For website rollback, revert the analytics release through a normal child commit; the single public analytics configuration can also disable collection. Keep existing affiliate, SEO and authentication configuration intact.

## Final candidate verification, November 1

Production build completed successfully with Node24.22.2 (session87152, exit0); initial Windows EPERM output-folder errors resolved through the approved build execution. Local analytics, Next legal navigation, SEO, affiliate, and all11native confirmation/account flows passed. Independent reviewer approved both history-navigation tracking and Google command payload correction. gtag now uses Google's documented arguments object, covered by a regression assertion; the earlier Array conversion loaded the tag but produced no DebugView receipt.

Real DebugView for property561786897 received page_view1, first_visit1, session_start1, tool_run2, deck_analysis2 and affiliate_click2 during the bounded local fixture check. These are synthetic fixed-category transport tests, not real user tool results, purchases or commission attribution. Affiliate fixture prevented merchant navigation. Non_personalized_ads=1 was visible. The initial interrupted consent action had no saved choice on the restored same-origin test screen. Fresh explicit test consent loaded Google; withdrawal reloaded without the Google tag. Mocked regressions also verify GA-only cookie clearing, preserved authentication cookies, declined choice persistence, mobile UI, GPC and query/private-screen exclusion.

Simple owner access: sign into Google as tim@deck-sage.com, open https://analytics.google.com/analytics/web/?authuser=1#/a414246535p561786897/reports/intelligenthome . Select Deck Sage if prompted. Home > View realtime shows recent consenting visits; Reports shows aggregated usage. Events lists tool_run, deck_analysis and affiliate_click after processing. Standard reports can lag; declined consent, blockers and privacy signals reduce counts. Historical test events may appear. This reports site usage, not TCGplayer purchase eligibility or affiliate commission credit.

Publication and live checks belong in preview/evidence/analytics-activation-receipt.json after deployment. Prior production baseline is0c979681abbd3c3a61b4c5b0364785f8506153dd. Keep Node24.22.2 CI pin and all affiliate/SEO/account configuration. No Core or Continuum changes.
