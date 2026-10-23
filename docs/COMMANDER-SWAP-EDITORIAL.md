# Commander Swap editorial UI

Based on main `907503169b326d94830124fc9e7680a3c8af507c`, branch `ui/commander-swap-editorial`. User authorized UI-only implementation and publication.

The existing `#/commander-swap` surface now reuses the homepage/deck `EditorialHeader`, including sticky positioning, Explore, profile/notifications and native modal mobile navigation. The previous sidebar/topbar shell is hidden only on this surface. Large Georgia headings, readable system sans-serif text, continuous emerald backgrounds, open shell summaries and alternating artwork/evidence layouts replace stacked boxes. All existing selectors, option order, evidence, warnings, legality/count disclosures and card zoom remain; no apply action exists. Hover/press is restrained, with reduced-motion and saved motion preferences respected.

## Hero artwork

An original changing-of-the-guard ceremony visibly transfers a golden command sigil from a knight to an elven archmage, with a potential partner nearby and the same company behind them. No battle, named characters, text or logos. Composition reserves a quiet left region for desktop copy; mobile crops put faces and the exchange above the headline. Hero height leaves the following deck selector visible.

Connected image generation produced a native 5504x3072 PNG, 19,825,728 bytes. No local upscaling. Master: task workspace `swap-art-masters/changing-guard.png`; source brief and generation metadata are retained outside the repository. The site serves these optimized crops/reductions:

| File | Dimensions | Bytes |
| --- | --- | --- |
| swap-guard-1920.webp | 1920x1080 | 124432 |
| swap-guard-3840.webp | 3840x2160 | 246188 |
| swap-guard-mobile-780.webp | 780x936 | 64528 |
| swap-guard-mobile-1170.webp | 1170x1404 | 103598 |

All editorial artwork variants together total 4,592,078 bytes; the browser selects one source per image. Provenance is recorded in THIRD-PARTY-NOTICES.txt.

## Invariance and validation

Before UI edits, complete recommendation objects were recorded for three realistic decks across all/drop-in/pair modes. Results, scores, order, evidence, tradeoffs, warnings, colors, legality, partnership plans and counts match SHA-256 `ce3540d94c830322a4ff74e3d4d4ef361b907282c62c4f53c2b8d24c1472cf10`. Engines, catalog reading, worker source and the component's preparation/catalog/memo hooks are unchanged, including the repaired null-deck guard. No deck, bulk, collection, auth, backend, model or API logic was changed.

Production webpack build and typecheck passed. Commander Swap engine/pairing/immutability, existing UI, homepage and interaction regressions passed. Added checks cover desktop/mobile decoded hero/results, genuine high-DPI srcsets, one sticky menu, keyboard zoom/focus, mobile menu/Escape, reduced motion, selection clearing, warm reload and delayed catalog resolution after early selection/clearing. Existing UI checks also cover empty accounts, catalog failures, checksum retry and contrasting deck recalculation. All accounts are mocked; real collection writes and unmocked external writes are rejected. No model is used.

Reproduce with `DECK_SAGE_PREVIEW_URL` set to the assembled preview and `npm run test:swap:editorial`. Screenshots/reports are in `preview/evidence/swap-editorial/`; Library screenshots are the review deliverables. Publication follows the normal PR, Linux build and Pages workflow, with live mock-account checks and exact asset hashes verified afterward.
