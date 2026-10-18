# Card Value app-to-web checklist

Reference reviewed: Deck Sage app release `f2bc0805199e7c9293de3c5507743b82fa0fbd7d`, especially `app/screens/CardValueScreen.tsx`, `app/utils/pricing/getCardPrice.ts`, and `app/utils/cardValue/*`.

| App behavior | Web result |
| --- | --- |
| Scryfall current USD pricing | Uses the same saved-printing `prices.usd` / `prices.usd_foil` semantics. Requests are batched through `/cards/collection` (75 identifiers maximum) and deliberately spaced. |
| Saved printing first, name fallback | Exact Scryfall printing IDs are authoritative. Name-only fallback is visibly labeled approximate. |
| Normal, Foil, and Full Art | Normal and Foil never substitute for one another. Full Art locates a premium-style nonfoil printing and remains unavailable when no matching USD value exists. |
| Quantity totals | Web stack quantities are multiplied by unit value. Active and archived owned decks plus bulk are included; planning drafts, deleted records, and basic lands without printing records are excluded. |
| Treasure Vault hero | Matched with the app's original `library.png`, collection total, Decks/Bulk/Priced/Missing metrics, dark panels, gold framing, green values, and red refresh action. |
| Crown Jewel | Highest known unit-price card, variant, location, copy count, and stack total are shown. |
| Deck/Bulk split | Separate known totals and priced/missing copy counts. |
| Search Card Value | Fuzzy named Scryfall lookup for any card with separate Normal and Foil results. Missing finish prices say `Unavailable`, never `$0.00`. |
| Browse Saved Cards | Bulk/deck and card selectors expose the saved variant, unit value, total value, and whether a fallback match was used. |
| Top Value Cards | Top 5/10/15 controls, intact card references, rank, location, copies, unit value, and stack value. |
| Deck Values | Per-deck known total, priced/missing copies, most valuable card, archived label, and deck navigation. Multi-partner command zones are counted once per saved card. |
| Refresh and cache | Matching inventory snapshots render immediately for 30 minutes. Manual refresh bypasses the view cache. A stale successful snapshot remains visibly dated if refresh fails. |
| Honest timing and errors | Exact browser fetch time is shown. The UI calls the values Scryfall daily market estimates, not real-time quotes or appraisals. No older bundled catalog price is presented as current. |
| Empty and partial states | Zero-card collections get one clear next action. Partial provider coverage shows the known total alongside the exact missing-copy count. |
| Appraisal disclaimer | Top and bottom notes explicitly cover condition, printing, language, finish/card type, grading, availability, fees, and local demand. |
| Navigation and responsive layout | Home/back, card details, deck links, desktop, 390px mobile, keyboard controls, and reduced motion were exercised in Core (Edge). |

Evidence captured by `tests/regression/card-value.cjs`:

- `tests/regression/card-value-desktop.png`
- `tests/regression/card-value-mobile.png`
- `tests/regression/card-value-report.json`

The screenshots and JSON report are generated QA evidence and are intentionally ignored by Git; the repeatable test and assertions are committed.
