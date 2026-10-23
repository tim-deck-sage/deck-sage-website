# Batch Upload UI review

Draft branch: `ui/batch-upload-fantasy`, based on live `a73f023aba994c23879ec538e036e2785afd969c`. Not pushed or published.

## Scope

Homepage-style sticky navigation, original sorting-table hero, responsive flowing guidance, an exact 4-column/5-row SVG card layout, and larger review text/controls. Recognition, worker lifecycle, review matching, quantities, destination selection, persistence and crop cleanup are unchanged. The scanner handler source before the render branches was compared against baseline and is identical except for the presentation-component import.

## Cross-device contract

The existing username backend loads and saves the shared workspace's decks and bulk. Mocked separate controllers verify reopening the same normalized username retrieves the confirmed saved collection. An already-open desktop can use **Refresh shared collection** in Settings; pending changes/conflicts still require the existing resolution workflow. Browser-only storage does not sync. This is the existing shared-username system, not a new authentication service.

Photos, crop URLs and unsaved review state are tab-local. Refreshing/closing/switching usernames clears temporary photos. Only a confirmed collection save clears a completed batch; failed saves preserve review/crops and retry without duplicate additions. The UI never promises photo transfer or automatic desktop refresh.

## Art and diagram

Built-in imagegen, original illustration. Prompt:

> Original high-resolution wide fantasy painting for Deck Sage card scanner website hero. An enchanted oak sorting table in an emerald wizard library, a friendly robed wizard on the right gently arranging illustrated trading cards in tidy rows with subtle golden magic. Luxurious painterly fantasy realism, rich emerald and antique gold, warmly inviting. Central-right focal point works cropped for phone, left third dark uncluttered for heading. Beautiful tangible cards, no readable lettering, no logos, no watermark, no interface. Landscape composition.

Native source: 1672×941, 2,383,659 bytes, retained privately in ignored evidence. No upscaling. Public derivatives:

- `scanner/sorting-1280.webp`: 1280×720, 173,402 bytes.
- `scanner/sorting-1672.webp`: 1672×941, 252,760 bytes.
- `scanner/sorting-mobile.webp`: 780×917, 166,778 bytes (right-side focal crop).

The inline SVG guide contains exactly 20 upright, separated cards and explicit title zones. It is instructional geometry, not generated card text. It recommends fewer cards when titles are too small and distinguishes 20 photos per batch from an illustrative 20-card photo. The current scanner downsizes source images to at most 3072 pixels and uses title OCR; greater camera resolution is not a guarantee of recognition.

## Verification

Passed Windows/Edge desktop and mobile emulation with fixture-only writes:

- `node tests/regression/scanner-editorial-ui.cjs`: real images, 20-card geometry including disabled motion, shared/local disclosure, sticky menu, Escape/focus restoration, repeated navigation, safe workbench anchor, no horizontal overflow or external writes.
- `node tests/regression/batch-upload.cjs`: staging/replacement/remove, unsupported format and size validation, context routing, local thumbnails, refresh cleanup. Its existing SVG fixture was rasterized locally to the missing ignored PNG before running; no personal image was used.
- `node tests/regression/ai-scan.cjs`: recognition stub only; real catalog matching, corrections, destinations, retries, cancellation/navigation, crop/source dialogs, confirmed save cleanup, failed-save preservation/idempotence, empty-deck and unsupported-browser states.
- `image-memory-guard.cjs`, `local-scan-worker-lifecycle.cjs`, `local-scan-matcher.cjs` (600 comparisons).
- `tests/accounts/shared-controller.cjs` (13 checks) and `bulk-atomic-persistence.cjs` (6 checks), all mocks.
- Next production webpack build/typecheck, preview bundle/allowlist assembly, and `git diff --check`.

No OCR accuracy claim was requalified on a new real 20-card phone photo. Physical iOS/Safari and Android camera pickers were not tested; camera availability remains browser-dependent and no forced `capture` attribute was added. No real account/deck/bulk read or write was needed. No new model, inference API, paid service or dependency.

Preview images and reports are ignored under `preview/evidence/scanner-editorial/`. Review and publication approval remain outstanding.
