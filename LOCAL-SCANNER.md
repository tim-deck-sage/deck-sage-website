# Browser-local card scanner

Batch Upload reads printed card names on the user's device. No photo, crop, OCR text, or recognition request is sent to Deck Sage, OpenAI, or another inference service. Only public scanner assets are fetched. After review, existing collection persistence stores selected catalog cards and quantities, not image data.

## Runtime and download

- A dedicated module Worker is created lazily after Scan is pressed.
- PaddleOCR.js 0.4.2, official PP-OCRv6 tiny detector/recognizer, CPU-only ONNX Runtime Web 1.30.0, one WASM thread. No WebGPU, SharedArrayBuffer or cross-origin isolation requirement.
- Four automatic photo orientations (0, 90, 180, 270 degrees), original-color perspective-rectified crops. Extra 180-degree crop retries were not shipped: exploratory replay increased false-positive rules-text matches.
- A names-only catalog is generated from the site's current public Scryfall search index. Canonical multi-face aliases, conservative full-line/mana-suffix matching, ambiguity margins, memoization and polygon-overlap deduplication preserve separate physical copies.
- About 10.9 MB of scanner assets, plus an approximately 11 KB loader and small manifest, on a fresh device. An included 208 KB WASM Brotli decoder avoids dependence on host compression or native Brotli DecompressionStream support, including browsers without that API.
- Content-hashed assets are checked against SHA-256 before use. CacheStorage is best-effort; unchanged model/runtime assets survive catalog updates. No photos or OCR results enter this cache. Browser storage eviction can require another download.
- `preview/tools/build-local-scanner.cjs` generates the manifest and runtime, models and catalog. Only compressed public vendor model inputs are committed. The production assembler's allowlist excludes private benchmark photos and evidence.

## Review and temporary images

All proposals require review and explicit destination/confirmation. View scan shows actual local crops and source-photo context. Names, quantities, removals and destination edits survive retries of unfinished photos. Cancellation and navigation terminate inference, stop queued photos and suppress stale results. Completed photos remain for review; Discard clears the batch.

A confirmed save releases temporary crop URLs and staged File references. Failed saves retain review/images for an idempotent retry. Refresh, tab close or username change releases temporary state. Original device files are never modified or deleted.

## Compatibility and memory safeguards

Browsers without required Worker, OffscreenCanvas, ImageBitmap or WebAssembly support show an explanation, never a server fallback. Download, decode and memory errors remain recoverable. Input files are limited to 12 MiB each and 80 MiB per batch. Working OCR images are capped at 3072 pixels on the longest side.

Before either thumbnail or OCR decoding, `imageMemoryGuard.mjs` reads at most 1 MiB of metadata. Original rasters must be at most 32,000,000 pixels, with neither side over 16,384 pixels. JPEG (including progressive), PNG and static WebP have supported checks. Malformed/unverifiable headers, animated WebP, HEIC, AVIF, SVG and other unsupported formats are rejected before staging with a request for a JPEG/PNG/static WebP copy. Originals remain unchanged. Thumbnail decoding/disposal is serialized, and obsolete queued jobs release their file references. These safeguards reduce memory risk but cannot guarantee every constrained device has enough memory. Smaller photos and one-photo batches are recommended on constrained devices.

## Evidence and limits

Actual Chromium desktop execution of the integrated single-threaded worker on the same three exploratory user-provided photos recovered 60 of 61 readable physical cards (98.36% recall), with 62 proposals (96.77% precision), no wrong-title substitutions, two extra rules-text mentions and one omission. This is a small known set, not an unseen-photo accuracy guarantee. Processing took about 35 seconds on the cloud CPU. Warm repeat predictions matched without model/runtime asset requests; the small loader and manifest were still checked.

Desktop browser and mobile-viewport regressions cover crop previews, corrections, quantities, destination selection, retries, cancellation, duplicate clicks, local persistence and temporary-image cleanup. Physical iPhone, Android and Safari/WebKit devices have not been tested. Glare, tiny text, overlap and unusual layouts may require corrections. Detection finds generic text, not exclusively title bars: review every proposal.

## Tests and deployment

- `npm run test:ai-scan` runs endpoint retirement, metadata/memory, worker-lifecycle, matcher and UI regressions (Playwright and preview server required for UI).
- `npm run build` includes scanner generation and production allowlist assembly; TypeScript also passes with `npx tsc --noEmit`.
- Optional private-photo tests: set `DECK_SAGE_PRIVATE_PHOTOS` to a private test directory, then run `tests/regression/local-scan-browser.cjs` for actual worker/cold-cache evidence and `tests/regression/local-scan-flow.cjs` for the actual inference/review/isolated-save flow. Never commit photos or evidence.
- Established deployment: `.github/workflows/nextjs.yml`, main builds and deploys to GitHub Pages at https://deck-sage.com. Daily catalog refreshes regenerate the scanner catalog automatically.
- Separately deploy the retired `website-ai-batch-scan` function to its existing authorized Supabase project. It returns HTTP 410 while preserving CORS, without reading image bodies, secrets or quotas and without network calls. This blocks costs from old cached clients. See AI-SCAN-GATEWAY.md. Shared OpenAI secrets and the unrelated daily-news function remain untouched.
