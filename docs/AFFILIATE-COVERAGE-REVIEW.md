# Every-card purchase coverage — 31 October 2026

This inventory follows Tim's clarified rule: show a card-specific Buy now control for every actual Magic card view, including cards the player already owns. **The sole display-policy exception is commander artwork used as the My Decks cover/hero.** The actual commander card in library/search/recommendations/editors/other contexts remains eligible. Whole-deck controls remain separate from the cover illustration.

The shared visible label is `Buy now on TCGplayer`. A disabled, explicitly unavailable affordance appears when tracking is unconfigured, identity/product data cannot be verified, or the record represents a custom/generated card. No nonexistent product, guessed ID, or untracked fallback URL is invented. This eligibility guard is not an additional display exception; it prevents a false purchase destination. The actual full Impact URL and permitted destinations are still missing, so configuration remains disabled.

## Exact cover/hero exception

| Renderer | Exception scope | Controls retained elsewhere |
|---|---|---|
| `SanctumCommanderArt`, used by `FeaturedDeck` / `LibraryDeck` | My Decks list/featured deck-cover artwork only; tagged `data-purchase-exempt="my-decks-commander-cover"` | Separate whole-deck copy/open controls; no individual commander purchase link attached to that cover |
| `WarTableCommander` | Commander artwork in the My Decks detail hero only; same explicit tag | Actual deck inventory cards, editor selections and card details retain individual controls |

No global commander-card exclusion exists. `CommanderDisplayCard` is an image primitive also used in eligible contexts; the exemption is applied only by the two My Decks cover/hero wrappers.

## Eligible actual-card surfaces

| Surface / renderer | Coverage and verification |
|---|---|
| Library, favorites/owned filters (`CardTile`) | Per-card control, identical destination for owned and unowned fixtures; public desktop/mobile browser tests |
| Shared card picker/search results | Per-result control outside its selection button; source audit and client compilation |
| My Bulk / saved deck inventories (`InventoryTable`) | Per-row control regardless of quantity or ownership; rendering/browser fixtures |
| Card detail / physical double-faced card preview | Original purchase printing retained; both faces belong to the same physical product; rendering/browser fixtures |
| Create/edit deck commander selection (`DeckFormV2`), add-card and transfer previews | Actual selected cards have controls; these are not exempt cover artwork; rendering/browser fixtures |
| Upgrade recommendations, suggested cuts, strong-cut reviews | Per-card controls remain; grouped buying is independent of ranking and does not apply edits; source audit/shared rendering |
| Gameplay Coach recommendations | Per-suggestion controls and selected group flow; source audit/compiled client; no model inference used for testing |
| Precon catalog/detail/stock/add-cut art (`ArtButton`) and image preview (`ArtZoom`) | Shared control per actual card; rendering fixtures plus public desktop/mobile tests |
| Commander Swap art and zoom | Reuses eligible `ArtButton` / `ArtZoom`, including retained/owned commander suggestions; source delegation audit |
| Combo catalog/ingredients (`Art`) and zoom (`Zoom`) | Per-card purchase control, shared physical product for front/back faces; rendering fixtures plus public desktop/mobile checks |
| Deck-combo evidence | Control for every referenced physical card; source audit and compiled integration |
| Workshop selected card and opponent-profile commanders | Per-card controls; selected-card rendering fixture and source audit |
| Value browser, crown jewel, top cards, per-deck best card and standalone result | Per-card controls; full cached value page/browser fixtures and pricing regressions |
| Scan review matched records | Per-card control only for the verified matched record; rendering/browser fixtures |
| Scan candidate cards | Each known catalog candidate gets its own control; does not claim that the uncertain scan has been identified |
| Scan crops, source-photo dialog (`ScanSourceImage` / `ScanSourceDialog`) | Control tied to the reviewed matched card; unmatched source images explicitly unavailable, not guessed; rendering/browser fixtures |
| Uploaded photos before identification | Visible unavailable control and identity-verification explanation; no live product inferred from pixels or filename; rendering/browser fixture |
| Bulk discovery candidates, manual command zone, allocation and missing-card lists | Per-card controls, including owned cards; source audit/compiled integration; private account walkthrough remains in beta |
| Grouped recommendation choices | Individual controls preserved beside explicit selection/quantities; policy and desktop/mobile tests |

## Illustrative artwork and non-product imagery

Story-detail artwork, named theme-song artwork and publisher artwork previews now include `ArtworkCardReference`: a separate actual-card reference with a clear statement that the displayed illustration is not the product being sold. A verified matching Magic card can receive a purchase link; unknown names remain unavailable. Publisher previews without a named card do not invent one. Explicit custom/generated-card records cannot produce a product URL or trigger a catalog fallback, even if they contain a numeric product ID or the name of a real card.

Avatars, banners, framing, navigation illustrations, article category images without verified card identity and generic wizard/scanner scenes are not actual card-product renderers. They are classified as such in the source inventory; no fictional product link is attached. No dedicated custom-card generator is present in the audited client. Core image generation was not touched.

Plain narrative mentions and text inside native select options are not turned into nested interactive links. The corresponding displayed/selected card has a purchase control. Unrouted legacy views are explicitly classified rather than counted as active coverage.

## Regression evidence

- `tests/regression/affiliate-renderer-audit.cjs` classifies every JSX image owner and checks purchase controls on eligible parents. An unclassified new image renderer fails the audit. Output: `preview/evidence/card-renderer-inventory.json`.
- `tests/regression/affiliate-every-card.cjs` renders 29 eligible/media states plus the 3 exact cover/hero fixtures. It checks the owned/unowned destination, custom/unknown unavailable states and the precise exception. No scanner, model, account or external request executes.
- `tests/regression/affiliate-every-card-ui.cjs` checks the 32 fixtures at 1440 and 390 pixels: card-specific targets, unavailable states, cover exclusion, valid interactive nesting and keyboard/touch access. Fixtures and assets are fulfilled locally with GPU disabled. Dialog fixtures are opened as static fixture markup for preview inspection; this is not a real account session test.
- Existing public-route, grouped-purchase, policy/catalog, hardening, pricing and theme-player regressions remain relevant. Full account/private-workflow and physical-device walkthroughs remain part of the short beta; isolated fixtures do not claim those have occurred.

No activation, push or publication is included. The real tracking URL/permissions and Tim's beta/publication decision remain pending. The separate local-shop advertising question is documented in `IMPACT-LOCAL-SHOP-ADS-REVIEW.md`; available local evidence does not establish an exclusivity/competing-advertising answer.
