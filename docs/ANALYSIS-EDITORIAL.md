# Analysis reading rooms

Based on main `06ade4e149a0d12ac6cb72deea3292a49500f74d`; branch `ui/analysis-editorial`. The user authorized UI-only redesign and publication of all five analysis views.

## Surfaces and scope

Deck Balance, Sage Rating, Strategy, Upgrades and Gameplay Coach are existing in-page tabs on `#/decks/<id>`, not independent routes. They retain the shared homepage/deck top navigation and mobile dialog menu. The commander header becomes compact while an analysis tab is open, and the existing tab strip stays below the sticky main menu. Cards and other routes retain their layouts.

The five views use larger Georgia headings and 16–18px reading text on one continuous commander-colored canvas. Balance has an open metric rail and readable curve; Rating separates the score from its evidence and dimensions; Strategy follows a vertical early/mid/late path; Upgrades has open recommendation rows with visible mobile card images, caveats and zoom; Coach has open disclosure, input, result and history sections. Detailed combo JSON remains available in a keyboard-accessible disclosure. Existing art is reused; no assets, fonts, models, APIs or effects were added.

## Calculation boundary

`AnalysisEditorial.jsx` contains presentation-only headings and wizard counsel. Existing numeric values, engine narratives, classifications, reason strings, uncertainty, critical warnings and controls remain. Strategy identity moved from an oversized heading to a readable lead paragraph without changing its text. Two static rating caveats gained wizard introductions while preserving their meaning. Coach gained one display-only introduction; activation, cancellation, interpretation, retrieval and model instructions are unchanged.

Invariance checks pin the complete analysis/score/bracket/balance/canonical strategy/display-strategy output for three realistic decks to SHA-256 `4d75f1628b387ac00f9564a0900deb51195da4b3465c6a8c07f74f5639740a90`. All 68 engine, recommendation and model source files match approved main. AST checks compare the analysis memo, recommendation request/dependencies and Coach handlers directly with main. The existing voice test also pins full card-comparison outputs across four candidates and two decks.

An independent browser run served unchanged-main app.js and recorded all recommendation projections. After the UI change, identities, ordering, playstyle variants, reason samples and safety outcomes matched exactly: SHA-256 `d12412b04c61e69e93bf64e4e92a0a1342c173e02bd78ac75c470e3aa45aa85b`.

## Validation

Production webpack export and TypeScript passed. Existing full Upgrades, Gameplay Coach intent/policy, Sage voice/comparison, War Table, homepage and homepage interaction suites passed. The new 15-check UI suite covers all five desktop/mobile views with real decoded art, sticky geometry, mobile menu focus/Escape, card zoom, combo-record disclosure, incomplete decks at 320px, Upgrades loading/error/retry/abstention/interruption and Coach loading/error/retry/navigation reset. Coach tests use fake workers, never a real model download or AI endpoint. Signed-in fixtures include the app-required commander display string; account RPC responses are mocked and real writes are rejected.

Reproduce the affected checks with `DECK_SAGE_PREVIEW_URL` set to a local assembled preview and `npm run test:analysis:editorial`. Evidence is under `preview/evidence/analysis-editorial/`; screenshots are saved in Library for review. Production release verification checks the normal Linux build, exact live assets and the same mocked-account flows.
