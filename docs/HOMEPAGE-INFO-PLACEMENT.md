# Homepage information placement — staged, not published

Tim requested that the green search-friendly information section move out of the homepage opening so the hero leads directly into “The Collector's Companion.” Read-only live inspection confirmed that the information block and library-summary strip both interrupted that sequence.

The candidate moves the complete `.editorial-free-tools` block and adjacent `.editorial-stats` strip together, unchanged, after the homepage's main feature/story/community sections and profile/support section. They are the final content inside the homepage, before the global disclosure/footer. The hero now directly precedes the Collector section.

This is a DOM/source-order relocation, not CSS hiding, collapsing or removing content. All copy, links, styles, accessibility labels, public metadata, canonical URLs, sitemap and robots remain intact. The shared component generates both static readable HTML and the JavaScript homepage. No account, backend, affiliate, Analytics or consent code/configuration changes are included; current live auth repairs remain the baseline.

Validation:

- Exact comparison confirms the moved information/summary markup is unchanged.
- Production Next webpack build and static assembly pass using installed patched Node 24.22.2 and one CPU worker.
- `npm run test:seo` passes public content, metadata, sitemap/robots, idempotence, escaping and account/affiliate config preservation, including the new bottom-placement checks.
- `npm run test:seo:ui` passes all four 1440px/390px and JavaScript on/off combinations. It verifies hero-to-Collector adjacency, complete visible information/summary content at the end, no horizontal overflow, keyboard links, precon navigation, private bulk gate, footer/canonical consistency and real 404 behavior. All external writes are blocked.
- Account route unit checks and Analytics policy checks pass. Those product implementations are unchanged.

Preview images are under `preview/evidence/seo-pilot/home-{width}-{js|no-js}.png`, `home-bottom-*` and `home-end-*`. JavaScript preview sessions explicitly decline analytics only in isolated test storage so the consent prompt does not obscure the layout; no product consent behavior changed.

Publication proposal: upload only this six-file candidate (shared component, generated public homepage/bundle, two focused SEO regression files and this review) to `tim-deck-sage/deck-sage-website`, then use its existing Pages workflow. Recheck main at `66d2891887ced931623ddde170c19178ac5f892a` before writing and preserve unrelated changes. This new layout candidate is not covered by the earlier exact auth-fix approvals and has not been published.
