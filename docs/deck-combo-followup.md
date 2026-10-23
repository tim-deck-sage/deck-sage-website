# Deck combo evidence and land recommendation follow-up

Unpublished repair against `ce76ad8b0c67fb23dc49117fc6b6484ab82555af`.

## Reproduced cause

The previous analysis path used a small local package detector rather than Commander Spellbook and explicitly set `comboCount` to zero while suppressing unsupported infinite claims. It missed Marwyn/Staff despite the cards being present. The shared Combos validator also treated Spellbook's `C` colorless label as a required commander color, hiding colorless lines in other identities.

The reported Desert was **Scavenger Grounds**, recommended for graveyard counterplay. Its empty color identity is legal in mono-green. No actual off-identity recommendation was demonstrated in the inspected deck. Its utility advice lacked explicit explanation that it produces colorless mana, exiles the player's graveyard too, and needs two generic mana, tapping and a Desert sacrifice. Without another Desert, it sacrifices itself.

Independent defensive defects were found: only compact search records received the color check; enriched full records were not checked again; missing identity passed a vacuous empty-set check; saved-card cache keys omitted identity and legality. These are now guarded, with a final shared response validator before learned ranking, fallback and rendering.

## Implementation

- The same normalized Spellbook bulk source now supplies a complete ingredient index and lazy detail shards. It covers the commander **and every library card**, including combos entirely in the 99. No deck is sent to Spellbook or another inference service.
- Quantity and Oracle identity, command-zone requirements, format status, templates and color identity distinguish complete named card sets from partial packages. Bulk ownership does not imply deck inclusion. Fetch failure remains unavailable, never zero combos.
- All five analysis tabs share one conditional source reading. Documented complete lines protect their pieces during cut review; cut review waits for archive availability. No saved-list match asserts an active board, a guaranteed win or a calibrated power bonus.
- Marwyn/Staff source: https://commanderspellbook.com/combo/2436-2645/ . Both cards must be on the battlefield; Marwyn must be able to tap and have power at least five. The loop spends four mana to untap Marwyn and Staff, netting at least one green per cycle. At power four it only breaks even. Required setup, states, steps and source link remain visible.
- Correct `C` handling also applies to the existing Commander Combos page. Full enriched recommendation records must agree with the compact identity, possess known metadata/legality and retain the requested Oracle ID. Final response validation guards stale worker/fallback output and linked suggested additions.

## Evidence and size

Source snapshot: `2026-10-23T19:13:16.578650+00:00`, 115,954 documented variants. Compressed deck index: **5,162,533 bytes**; all lazy detail shards combined: **34,347,598 bytes**. The full detail set is not downloaded for each deck. No new model weights are added. This data is larger than a commander-only archive because it also supports arbitrary combos in the 99.

Tests cover the actual Spellbook Marwyn/Staff record, removing a piece, alternate printings, quantities, templates, wrong command zones, source unavailable, library-only colorless combos, green versus red Deserts, unknown identities, mismatched basic types, full enrichment mismatches, final response guards and cache invalidation. The previous shared semantic, add/cut and Commander Swap regressions remain part of verification.

An explicitly authorized account inspection was read-only. The resulting real-deck fixture and screenshots are private local files under ignored `preview/evidence/combo-followup`; no personal account/deck data is committed. Browser replay uses intercepted account responses and blocks all collection writes. Physical mobile/Safari devices are not qualified by Chromium viewport tests.

Additional React-hook regression: simulated rate limit and retry, edit during a pending read, then repeated same-name/same-ID card changes prove stale complete lines do not survive. Actual cut assessors preserve documented combo ingredients by default; this does not disable deliberate manual deck editing.

Partial packages now have an explicit loaded/total status and a keyboard-operable show-more control. Additional reads preserve already loaded evidence and the disclosure state, report partial-page failures separately and reset to the correct inventory when the deck changes. The source refresh is wired through the existing scheduled `.github/workflows/nextjs.yml` call to `refresh-commander-combos.cjs`; that refresh regenerates both archives from its validated bulk payload.

## Source-backed upgrade completion

Upgrades now has a bounded additional group for a single missing named card in a documented line, even when basic role counts are adequate. The same local source index supplies candidates. Code rechecks current quantities, command-zone requirements, templates, source legality and identity before the normal full-card validation and final response gate. Required supporting pieces remain protected in a hypothetical swap. Source conditions and steps are readable; no active-board or automatic-win claim is made.

Candidate selection and final completion scoring share the same bounded evidence priorities: direct commander participation, small named packages and up to four verified examples. Broad generic type bonuses are not counted a second time as source interaction evidence. The existing learned association adjustment remains bounded. A partial-list name filter makes missing-piece packages accessible without traversing hundreds of unrelated rows; it does not change recommendation ranking.

Qualification records preserve first failures and subsequent exposed regressions separately. Legal 100-card Goblin, Zombie/aristocrat, Wizard/control, Naya counter and Golgari life-gain fixtures were used with frozen private target manifests. No target labels or answer lists enter application inputs, and none are committed. These are small practical checks, not a general accuracy benchmark. Valid desired cards can still fall outside the displayed three; source knowledge and ranking are bounded, and alternative source-backed options are not proof that every best upgrade is found.
