# Sticky shopping disclosure — staged candidate

Tim requested a frozen statement line that cards scroll beneath, preserving the site's appearance and avoiding a “Paid link” label. This candidate is local only; publication requires review and approval.

The wording is: **Deck Sage earns a commission when you buy through these TCGplayer links.** The non-dismissible teal/gold strip belongs to its shopping section, uses 14px text, and sticks below existing navigation. It does not appear across unrelated homepage/account screens. The footer notice remains supplementary.

## Bounded coverage

- Actual card-library results, including owned-card results: one shared strip above the grid.
- Collection/deck inventory tables: one strip outside the horizontally scrolling table.
- Deck upgrades/cut recommendations: one shared strip for the recommendation section; nested grouped-shopping controls reuse it.
- Standalone selected-recommendations shopping groups: their own strip, without nesting duplicates.
- Other card renderers, standalone deck/product panels, scanners, artwork references and precon grids retain nearby local disclosure unless enclosed by a covered shopping section. This change does not silently remove their protection.
- Card dialogs rendered outside the section retain local disclosure. Precon image dialogs explicitly retain it even when their React context comes from a covered section.

Full repeated statements disappear only while the shared strip is visibly within the viewport below navigation and sticky styling is available. Otherwise local disclosure remains as a fallback. Printing/condition/artwork warnings are separate and remain per card. Their existing pale text and purchase-link colors are made readable against the library's cream cards. Affiliate destinations, identifiers, commission-independent ranking and the sole My Decks commander-cover exception are unchanged.

The component observes header/strip size, coalesces scroll work per frame, reserves scroll margins for focus, reveals a focused control if it would sit beneath the strip, and removes listeners on route unmount. Dialog focus does not scroll the background.

## Verification

`npm run test:affiliate:disclosure` covers synthetic 390px/1440px long and short sections, stacked 64px+40px headers, nested scopes, first/middle/last rows, focus, loss of sticky positioning, local modal disclosure, exact encoded targets, printing warnings, actual-library navigation/modal/route transitions, and existing selected-only grouped shopping behavior. Test fixtures block external traffic and do not create accounts or purchases. Existing affiliate policy/render/coverage checks also run separately.

Screenshots and machine-readable reports are in `preview/evidence/affiliate-disclosure/`. Local test images may use placeholder card art because external requests are blocked. Full production-build status and final candidate are recorded in the accompanying receipt.

## Requirements basis and limits

The [FTC's affiliate-marketing guidance](https://www.ftc.gov/business-guidance/resources/ftcs-endorsement-guides-what-people-are-asking) assesses whether users can see and understand the disclosure with the relevant links; a distant footer alone is insufficient for this design. [TCGplayer's Partner Guidelines](https://help.tcgplayer.com/hc/en-us/articles/31411199594391-TCGplayer-Partner-Guidelines) require prominent, clear and unavoidable disclosure. The strip is intentionally visible and cannot be dismissed while shopping. This UI verification is not a legal guarantee.

The repository's `IMPACT-TERMS-SCREENSHOT-REVIEW.md` is a historical summary of the parent's review, not the complete private agreement. Its old disabled-activation notes are superseded by the subsequent published affiliate integration. No new account settings, agreement acceptance, tracking changes or publication are included here.
