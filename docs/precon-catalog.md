# Commander preconstructed deck catalog

Source: MTGJSON DeckList plus individual deck files, downloaded from the documented compressed public endpoints. Data license and attribution are distributed at `/precon-data/LICENSE.txt`. Card names and game content remain Wizards of the Coast intellectual property.

## Scope and coverage

Only source categories `Commander Deck` (paper) and `MTGO Commander Deck` (digital) are included. The initial verified 2026-10-21 source contains 198 paper lists and 2 digital lists. Reissues and collector editions are distinct products. This is complete relative to that source index, **not an independently exhaustive claim about every product Wizards has ever sold**. Secret Lair complete Commander decks are included; ordinary Secret Lair card drops, land packs, redemption products, Jumpstart packs and other formats are excluded.

The catalog advertises its source date, generated timestamp, listed/included counts and incomplete lists. New lists without complete, resolvable 100-card contents are not offered as valid imports. Release dates are compared with the UTC date; upcoming and unknown dates are not claimed to be released. Historical stock lists can contain cards that are now banned: catalog completeness is not a present-day legality certification. The app performs legality checks separately.

## Schema version 1

`preview/public/precon-data/catalog.json` contains metadata and deck summaries. Each summary points to `decks/{id}.json`, with the same summary fields plus `cards`. A card row has `name`, `quantity`, `role` (`main`, `commander`, `sideboard`), `scryfallId` and `oracleId`. Quantities are physical cards. Main + commander totals 100; sideboard is separate. Source `commander` is authoritative; `displayCommander` is marketing/display only and is never added to the command zone. Multiple designated commanders are preserved. Non-front double-faced source rows and oversized display cards are excluded.

IDs are stable hashes of source set code and exact deck name plus a readable slug. They deliberately do not depend on the upstream filename, which has changed naming conventions. Each manifest includes the source version/date, official source link where supplied, and a checksum of its source JSON payload. A source product rename is treated as a removal/addition and blocks automatic replacement until reviewed.

## Daily refresh and safety

Existing GitHub Pages workflow runs daily at 07:23 UTC and on pushes/manual runs. It refreshes Scryfall, restores the latest validated precon cache, fetches the complete Commander index and all selected deck files, validates them, runs regression checks, and builds/deploys. No new credentials or permission grants are needed. GitHub scheduled runs may be delayed and suspended by GitHub for inactive repositories; an exact-minute guarantee is not implied.

The entire refresh is staged before a filesystem rename. HTTP/parse failures, identity changes, duplicate products, index collapse, removal of any previously published deck, schema mismatch or mixed source dates abort the refresh without replacing the previous snapshot. Failed workflow runs never deploy partially refreshed data; the currently live Pages site remains unchanged. Cached successful snapshots provide continuity beyond the older checked-in baseline (subject to normal GitHub cache retention). First-time incomplete source lists are explicitly reported in coverage rather than fabricated.

Run `node preview/tools/refresh-precon-catalog.cjs` to refresh and `node tests/regression/precon-catalog-refresh.cjs` to test. The precon build allowlist includes only the catalog, license, display-only commander artwork map and validated-name deck JSON files. No model download or account/scanner changes are part of this pipeline.

## Commander presentation artwork

`commander-art.json` is a separate, display-only map keyed by the exact catalog commander name. It never modifies a stock manifest, its checksum, Oracle identity, card quantities, or ownership. Each entry has a canonical complete-card `imageUrl`, separate `artCropUrl`, and optional `displayArt` with a verified printing ID, matching Oracle ID, complete-card image, crop, treatment, artist and Scryfall link. Consumers must not merge display printing IDs into saved cards.

`node preview/tools/refresh-commander-art.cjs` reads the existing local canonical card cache and streams one official Scryfall `default_cards` JSONL bulk archive. It does not search once per commander or per visitor. This runs after the daily precon refresh and before caching/building. Any failed download, incomplete canonical coverage, malformed source or missing fallback blocks publication; the live site stays on its previous deployment. To reuse an already downloaded archive for development, set `SCRYFALL_DEFAULT_BULK_FILE` and `SCRYFALL_BULK_METADATA_FILE` together to the verified matching local archive and metadata.

The selection requires the same Oracle identity, English, normal-size paper printing, Commander-legal status and a complete-card image. It excludes digital-only, oversized, textless, tokens, art-series, emblems, memorabilia, gold/silver/yellow borders, missing/placeholder images and non-game objects. Priority is Scryfall `full_art`, then `borderless`, then `extendedart`; high-resolution imagery and newer dates break ties. Multi-face images match the requested face. Partner commanders remain independent entries. No eligible special treatment means the canonical image remains the fallback, not that the resolver fabricates a new treatment. “Fallback” does not assert that no special printing exists in any language or eligibility category.

Initial verified source: `default_cards` updated 2026-10-21T21:06:00.423Z, 119,115 printing records; archive SHA-256 `6234f40e594d015312d997e443cd465ed518dee157e6211091b6a3d72bfa7c70`. Current coverage: 181 distinct commanders, 135 preferred treatments (8 full-art, 82 borderless, 45 extended-art), 46 canonical fallbacks, zero missing images. Exact provenance and live counts are recorded in the map, not hardcoded into the UI. Regression: `node tests/regression/precon-commander-art.cjs`.

Official references: https://scryfall.com/docs/api/bulk-data, https://github.com/scryfall/api-types/blob/main/src/objects/Card/CardFields.ts and https://scryfall.com/docs/faqs/i-m-having-trouble-accessing-the-scryfall-api-or-i-m-blocked-17 . Documentation checked 2026-10-21. All imagery remains Scryfall/Wizards content, not generated replacements.
