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

Run `node preview/tools/refresh-precon-catalog.cjs` to refresh and `node tests/regression/precon-catalog-refresh.cjs` to test. The build allowlist includes only the catalog, license and validated-name deck JSON files. No model download or account/scanner changes are part of this pipeline.
