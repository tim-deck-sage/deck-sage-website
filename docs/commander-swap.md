# Commander Swap

Route: `#/commander-swap`. The home link is inside the existing “Local data / Yours to keep” bar. Existing Precon Vault, Commander Combos, bulk and library links remain intact.

This page receives only the current workspace's state. Selecting a saved Commander deck (including explicitly labeled plans) reads current card metadata by Oracle identity through the existing local static-card worker. This is a browser computation; deck contents are not posted to a recommendation server. Account gating and epoch remounting remain in the existing application. No mutation callback, account save RPC, bulk transfer, purchase or apply action is exposed.

## Comparison

`preview/src/commanderSwap.js` excludes the old command zone before analyzing the shell. It reuses `analyzeDeck`, `analyzeDeckBalance`, the existing candidate-card feature classifier, commander profiles and exact known-combo detector. It reports shell curve, ramp, draw, plan signals and recognized finishers. At least 20 named nonland cards are needed.

Engine relationships require expressed commander abilities and multiple concrete shell cards. Relations cover spell, Aura, blink, token, sacrifice/death, graveyard, counter, mana/activation, enchantment/artifact and landfall engines. Mana amplification explicitly checks nonland mana producers. Evidence lists the relevant commander, recognized relationship and actual supporting card names. Creature type, color overlap, price, popularity and Spellbook combo count award no points.

Each option compares the same shell against the current command zone. Losing recognized engines, exact known commander-dependent combo ingredients or explicitly named commander support incurs a penalty. Greater deployment mana, color-invalid copies, expanded colors and required count edits also reduce the comparison. Scores are transparent heuristic fit points, not deck power ratings or observed win-rate gains. A sufficient improvement with no detected edit requirement and recognized current-commander engine support is labeled a plausible upgrade estimate; other results remain experiments. The page says “No clear drop-in upgrade” when warranted.

Limits: recognition is intentionally bounded. If a current commander has no recognized supported engine, the page abstains from an upgrade claim and labels alternatives as shell fits with an uncertain baseline comparison. Activated costs, timing, once-per-turn limits, mana availability, synergy strength, old commander abilities outside the recognized families and opponent interaction are not fully modeled. Exact known combos still require checking their conditions. Unknown metadata and designated companion restrictions prevent drop-in certification. Added colors require mana-base review. No recommendation claims verified increased win rate.

## Legality and card accounting

Candidate eligibility and released/Commander-legal status come from the existing checksum-verified daily commander catalog. Command-zone checks reuse `validateCommandZone`, now testing each pairing ability a card offers, rejecting duplicate identities and preserving the existing rules for eligible commanders. Doctor's companions saved with the older `companion` role remain command-zone cards in this page when their rules identify the Doctor ability.

Official rules reviewed 2026-10-22: [Comprehensive Rules effective September 25, 2026](https://media.wizards.com/2026/downloads/MagicCompRules%2020260925.txt), rules 702.124 and 903. Supported pair families: ordinary Partner; matching Partner—Character select / Father & son / Friends forever / Survivors; reciprocal Partner with; Choose a Background plus legendary Background; Doctor's companion plus legendary Time Lord Doctor with exactly those creature types. Distinct families cannot mix. A multi-ability card may use one applicable family. Three commanders cannot be designated.

The legality review lists color-invalid named cards and basic lands, known banned/not-legal cards, unknown metadata, singleton conflicts and duplicate old command-zone rows. A candidate already in the shell is promoted in the projection rather than added again. Displaced commanders are set aside in the default projection. Returning one to the library is a separate user decision requiring color and count review. The projected total and exact additions/cuts needed to reach 100 are shown before color cuts. Two commanders require a 98-card library. Nothing is saved.

## Art and performance

The page loads only the existing commander catalog manifest and checksum-verified compressed catalog, with no combo shards. It shares Precon Vault's complete-card art buttons and native-dialog zoom, including Escape and focus restoration. The catalog already chooses actual full-art/borderless/extended-art cards where available, otherwise normal full-card printings. Both commanders remain visible in pair results, including mobile. Artwork is lazy and bounded to 12 options. Filters expose drop-in choices and legal pairs. Catalog mana costs now travel through the existing daily generator; the checked-in baseline was enriched from the already checked-in public card metadata.

## Verification

- `node tests/regression/commander-swap.cjs`: real Quantum Quandrix, Prismari Performance and adapted Reap the Tides fixtures; contrasting shell rankings; mana evidence; commander dependence; no-upgrade; incomplete-list abstention; color legality; all pairing families including multi-ability cards and retained partners; promotion/count changes; duplicate limits; immutability; full-catalog performance.
- `node tests/regression/commander-swap-ui.cjs`: mocked shared accounts; home link; owned-deck selection; bounded/lazy archive access; both partner cards; desktop/390px layout; keyboard zoom/Escape/focus; count review; contrasting decks; second-account isolation; external writes blocked. `DECK_SAGE_REAL_ART=true` permits card-image GETs only for visual QA.
- All non-hosted package regression scripts, including the shared validator's bulk-discovery, Precon Vault and Commander Combos consumers. Real account/database tests are intentionally not run.
- Production webpack export (`node node_modules/next/dist/bin/next build --webpack`), static assembly and TypeScript check pass. The standard Turbopack build was attempted with and without an explicit bundled Node path; both hit a Windows child-process startup panic in unchanged global CSS. This remains a local build-tool limitation, not a verified default-build success. The existing Linux release workflow is unchanged.

Local evidence is under ignored `preview/evidence/commander-swap/`, including screenshots and full regression output. The existing batch-upload test's ignored image fixture was generated locally as a synthetic 488×680 PNG; no real photos were used.

Publication is held for final parent/user authorization. The existing release path remains a main-branch push through `.github/workflows/nextjs.yml`; no deployment, security, credentials or database changes are part of this branch.
