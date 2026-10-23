# My Bulk learned relationships release

## Behavior and boundaries

The approved editorial My Bulk surface uses the shared sticky desktop/mobile menu, original gathered-army artwork and responsive WebP variants. Inventory import/add/export, quantity, remove, transfer and scanner entry points retain their existing handlers. Discovery uses a same-origin module worker and static card vectors; no inference service, language-model download or account data upload is introduced.

The current legal commander catalog controls candidate eligibility; the existing command-zone validator controls pairing. Current canonical card data supplies color identity and legal status. Nonland, owned cards are ranked by cosine similarity to each owned commander (mean of both commander similarities for legal pairs). Lands are excluded from relationship discovery. A physical double-faced card uses its front face for this stage; it never supplies two slots. Top 40 associations form a possible core, with conditional role hints used to add owned support for the separate proposal allocator. Generic caution rules exclude opposing-haste risk for planeswalker plans and casting locks for each-turn casting plans. They are not a complete anti-synergy detector.

The unchanged proposal allocator accounts for singleton exceptions, legal colors, quantities, original printings, commander slots, owned basics and explicitly unowned missing cards. A completed 100-slot plan is not a claim of playability. The 50-owned-slot gate is ownership only. Unsupported manual commanders retain an explicitly color-compatible fallback, not a false no-deck verdict. Alternatives can reuse the same copies until one is confirmed.

No collection changes occur during scans or review. Confirmation uses the existing atomic shared-workspace revision with exact-source revalidation. An immediate click lock and stable operation/deck IDs protect repeated clicks and uncertain-response retries. No auth, database or backend changes.

## Provenance and footprint

Model: `nishtahir/mtg-glove-embedding-commander`, revision `4590e999561a098f8955489b6663bc3d35e3fac9`. Uploader declares MIT in its model card; the listing has no separate LICENSE file. Attribution, source and MIT grant are retained in `preview/public/bulk-model/NOTICE.txt` and the site notices. Training deck identities are not disclosed, so test decks cannot be claimed independent of the pretrained corpus.

The safetensors source hash is `8dd78daee302302e8267408fe3ec3064b641072262fe476d7ccba0f253816849`. Safe data-only parsing read center/context tensors; no model repository Python, pickle, custom code or training scripts ran. Export averages center/context, normalizes each vector and stores float16. The worker renormalizes after decoding and verifies downloaded SHA-256 hashes and sizes.

- 25,932 rows × 128 dimensions (25,931 vocabulary cards plus unknown row; unknown is never scored).
- 25,801 mapped current legal Oracle IDs, including one unique front-face alias.
- Vectors: **6,638,592 bytes**, SHA-256 `abbfbaf0afd96fa0283a68843631f8c7db13395fdb3fe3ab7c6b69a990fc27dc`.
- Oracle index: **1,150,004 bytes**, SHA-256 `209278450bb91df3f213b4534f64e375912c2ab63db222252c3f733352ea70c5`.
- Manifest: **814 bytes**. Core learned-data payload: **7,789,410 bytes**, before HTTP encoding, plus the small worker and notice. No transformer/runtime weights ship with this feature.
- Artwork: original 5504×3072 source; four responsive WebPs total **810,388 bytes** (desktop1920 162,604; desktop3840 384,352; mobile780 99,678; mobile1170 163,754). The browser selects one responsive variant.

## Qualification and honest limits

Preserved research evidence is in the separate local `deck-sage-home` worktree, not in the browser bundle. Failed Qwen experiments remain research-only. A metric reader initially misread string Oracle IDs as objects; the corrected evaluator reused unchanged rankings and retained the incorrect initial report. No claim of success uses that faulty metric.

Six exposed development source-commander ranks were 4,2,3,1,1,1. Lathril's three higher alternatives were valid owned Elf leaders, but source rank is still reported as 4. Commander-only cosine was simpler and no worse consistently than whole-pool neighborhood scoring; generic whole-bulk averaging is not used.

Four initially fresh pipeline fixtures each contained 200 physical bulk copies: 75 of a verified real 100-card deck and 125 distractors, including same-color staples and alternative commanders. Answers remained outside browser inputs. Source commanders ranked first in all four: Clavileño 38/45 available known nonlands in the top40; Anikthea40/46; Commodore Guff36/42; Kadena35/41. These are card-recovery diagnostics, not four proven coherent playable decks. Manual review found opposing-haste and casting-lock risks; those fixtures became exposed development evidence before generic caution rules were added. There is no claim that the revised cautions passed another untouched holdout, or that pretraining excluded those decks.

F32 and F16 core identities agreed in all ten compared pools. Sampled cosine quantization max error0.0001047. Desktop local scoring was milliseconds per pool; that does not establish phone performance or internet transfer time. Vocabulary presence demonstrates an association vector, not rules understanding. Newer, rare or otherwise unmapped cards can be missed; familiar staples can outrank a better causal engine. The UI shows recognized/unsupported coverage, retains current abilities for inspection and asks the player to review mana, interactions and gaps. It does not label a discovered core ready/playable or a verified combo.

## Release validation

`test:bulk-discovery` covers asset integrity, legality/quantity/DFC/pair boundaries, proposal/allocation regressions, actual-image desktop/mobile editorial checks, empty/delayed/cancel/error/retry/warm-cache flows, browser-only confirmation blocking and mocked signed-in double confirmation. Account/controller/atomic, batch-upload, scanner lifecycle and memory regressions are also run. Hosted account tests that create real fixtures are deliberately not used. Windows production build/typecheck is followed by the normal Linux Pages workflow. Live verification uses intercepted account responses and zero real collection writes.

Rollback base: `c5f0b203ef273251e6621c382bf7f8187fe98c1c` (previous main). This release preserves the catalog refresh and publication guards.
