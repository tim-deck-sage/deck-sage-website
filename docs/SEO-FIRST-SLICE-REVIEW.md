# Public SEO pilot — offline review candidate

This implements the first slice requested after affiliate release `40715b3301da066e89a58c8f8f33a063d29b4dc7`. This is the pre-publication review record; deployment is recorded separately after release. A final read-only GitHub check still found that release on main. Search Console, DNS, accounts, permissions and Core services are unchanged.

## Result

- The served homepage now contains meaningful static HTML before JavaScript. It is built from the same `EditorialHome` React component used by the app, with a fresh empty guest state, rather than a separate hidden crawler page. The existing `createRoot` bootstrap replaces that root; it does not hydrate or leave a second copy of the content. No browser storage or private account data is read by the generator.
- Visible positioning is **“Free tools. AI help. More Magic.”** Metadata calls Deck Sage a free AI-powered MTG deck/collection toolkit. The copy distinguishes optional on-device AI from ordinary search, collection management and rules-based analysis, and free website tools from optional paid card purchases.
- **Find decks in your bulk** has a prominent section immediately after the hero with a direct `/#/bulk` CTA. It describes Commander possibilities, learned card relationships, owned coverage and missing cards; incomplete proposals are not labelled ready/playable. The private collection gate remains in force.
- New `/precons/` is a static public discovery guide with 12 released, complete paper Commander examples selected from the existing validated catalog. Names, commanders, colors, release dates and stock counts come from that catalog. Digital/unreleased/incomplete records are excluded. It has ordinary homepage links, a unique title/description/self-canonical, visible breadcrumbs and matching breadcrumb markup, source attribution and links into existing interactive deck views.
- The precon guide’s optional Mass Entry CTA uses the existing shared affiliate builder and current tracking configuration, with nearby disclosure and an explicit copy/paste/review workflow. No undocumented cart import or new tracking asset is introduced.
- Added a public-only sitemap and robots file, homepage canonical and truthful homepage `WebSite` markup. Existing Terms and Support receive accurate metadata/self-canonicals to match their sitemap entries; legal/support body content is unchanged. The callback test route retains its existing noindex setting and is excluded, as are accounts, user decks, profiles, filters and hash routes.
- The static assembler generates/preserves the pages. The existing workflow adds a post-build HTML/affiliate policy check before artifact upload. No dependency, workflow permission or scheduling change.

## Files and structure

| Area | Files |
|---|---|
| Shared copy and visible home | `preview/content/public-copy.json`, `preview/src/EditorialHome.jsx` |
| Static generation | `preview/tools/build-seo.cjs`, `preview/tools/assemble.cjs` |
| Generated entry files | `preview/public/index.html`, `preview/public/precons/index.html`, `preview/public/robots.txt`, `preview/public/sitemap.xml` |
| Styles and preview MIME types | `preview/public/seo-public.css`, `preview/tools/serve.cjs` |
| Existing-page metadata | `app/support/page.tsx`, `app/terms-of-use/page.tsx` |
| Checks | `tests/regression/seo-public.cjs`, `seo-public-ui.cjs`, `package.json`, `.github/workflows/nextjs.yml` |
| Generated app bundle | `preview/public/app.js` |

The root keeps its existing CSP, referrer policy, account/affiliate scripts and Impact verification tag. All existing hash routes remain intact. Direct unknown pathname URLs still return a real 404. The sitemap lists only `/`, `/precons/`, `/privacy-policy/`, `/terms-of-use/` and `/support/`, each with its own canonical in exported HTML.

## Verification completed

- Next production build with supported webpack: compiled, TypeScript passed, all seven static pages generated. Build-only CPU/heap limits were temporary; `next.config.ts` was restored. Scanner asset packaging, app bundling and final static assembly passed. No model inference or new software ran.
- `node tests/regression/seo-public.cjs`: generation idempotence, shared readable homepage and bulk copy, source-backed catalog selection, excluded records, escaping/malformed URLs, metadata/sitemap/robots, preservation of public account/affiliate config and assembled output/canonical agreement passed.
- `node tests/regression/seo-public-ui.cjs`: 1440px and 390px, JavaScript enabled and disabled; one h1/home/main, direct navigation/refresh, keyboard CTA, no horizontal overflow, public guide to real app/deck transitions, tracked Mass Entry target, private My Bulk gate, XML parsing/MIME/canonical targets and real 404s passed. Zero page errors, external writes or tracking clicks.
- Affiliate policy/catalog/group tests, renderer inventory and all 32 static renderer states passed. Dedicated desktop/mobile affiliate and grouped-shopping browser suites passed, including the disabled rollback state and commander-cover exception.
- Existing mocked native account-confirmation regression passed all 11 flows, including marked/unmarked confirmation, session refresh, recovery, wrong-owner rejection and invalid bearer handling. No hosted account was created or modified.
- Author visual review inspected desktop/mobile home previews and desktop precon layout. Physical-device testing and Search Console indexing/field metrics remain separate; these are not claimed as completed. Independent reviewer sign-off is recorded below.

Evidence: `preview/evidence/seo-production-build.log`, `seo-pilot/browser-report.json`, `seo-pilot/home-1440-js.png`, `seo-pilot/home-390-no-js.png`, `seo-pilot/precons-1440-no-js.png`, `seo-pilot/precons-390-no-js.png`, plus the affiliate browser reports. Build the candidate before running the output consistency check. Run the existing local preview with `node preview/tools/serve.cjs --port 4196` and visit `/` and `/precons/`; stop that owned preview process afterward.

## Exact publication proposal — scoped approval received

1. Completed: independent reviewer approved the bounded diff, public/private isolation, homepage behavior, catalog provenance, affiliate preservation and My Bulk wording.
2. Completed: Tim explicitly approved this SEO pilot at 13:16 UTC on 31 October ("Yes publish"), conditional on independent review and final checks. The earlier affiliate-only approval is not reused.
3. Reconcile the scoped diff with current GitHub main (last observed `40715b3`), preserve any intervening work, and create a normal child commit with an expected-head check. This local repository has snapshot history; do not force-push its branch over production. Keep the pre-SEO main SHA as rollback baseline.
4. Publish through the existing GitHub Pages workflow. Its catalog refresh can update the 12 examples from validated public data; the new post-build checks must pass before upload. No user data is a build input.
5. Verify live root HTML without JavaScript, `/precons/` direct navigation/refresh, titles/canonicals/sitemap/robots/404s, the old hash routes/private gates and representative affiliate controls. Check deployed assets against the approved candidate and record the Pages release. Do not create/verify Search Console ownership or submit anything unless separately scoped.

Rollback is a normal revert of this SEO commit followed by the existing build/deployment workflow, preserving affiliate release behavior. No source-router rewrite, mass card-page generation, private-deck publication, paid tools, analytics, outreach or ranking promise is included. A dedicated public bulk-discovery feature page is the next content candidate after this pilot is reviewed.

## Independent review and rollback fix

The independent reviewer approved base candidate 5cf51fa plus the four-file rollback fix, with no remaining material findings. The reviewed fix patch SHA-256 is fd490d24323b5cb1260b700430ebc7d7f51751c3e26c2f67b129be70e25da150. Review identified a P2 CI blocker: production checks assumed tracking must be enabled, which would block the documented affiliate-only rollback. The tests are now configuration-aware and exercise disabled/deep-link-disabled rendering. An actual local enabled:false → assemble → both CI commands passed; the original enabled affiliate and account bytes were restored and enabled checks passed again. Evidence: preview/evidence/seo-rollback-ci.json and .log. The optional test-runtime portability finding was also fixed by honoring DECK_SAGE_TEST_NODE_MODULES. No independent reviewer edits, hosted account changes or Core work occurred.
