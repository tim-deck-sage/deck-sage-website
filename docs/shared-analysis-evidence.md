# Shared analysis evidence repair — 2026-10-23

Release baseline: `3ee65e1b8739f16d3cb85b2e05ecebe776c520db` (also the rollback revision).

## Behavior

The five analysis views now retain canonical metadata and share factual card classification. Mana quality distinguishes unavailable evidence from known poor fixing and off-identity cards. Ratings are explicitly a structural rubric, not calibrated power or win probability. Missing metadata or known illegality withholds the score. Complete evidence can support a confident diagnosis of a bad mana base.

Self-sacrifice protection is not a reusable sacrifice outlet. Mass sacrifice is recognized separately from selective removal. Finite untaps do not establish infinite combos. Conditional token loops require the actual attached/readiness/resource conditions; saved lists never certify an active loop. Equipment that needs a creature host is not judged by Equipment density. Color-shortage recommendations must produce the requested color, including multitype dual lands.

Strategy comparison uses typed canonical plan facts rather than rendered prose. Coach intent handling distinguishes excess mana, missed land drops, flood and wrong colors; valid structured interpretation survives paraphrases while contradictions and ambiguity remain guarded. Same-name card/quantity edits invalidate analysis. In-flight Coach operations cannot write stale results after changing decks.

The existing GloVe assets are reused in one tab worker for bounded deck-context addition/cut ranking. Cuts exclude their own vector from context. This signal is association, not verified interaction, power or confidence. Rules, ownership, legality and review controls remain authoritative. Missing/corrupt learned assets fall back to rules-only advice with a retry. No new model or paid inference is introduced; the existing Coach language model is not newly qualified by these tests.

## Verification

- Oracle-grounded semantic controls cover All Is Dust/Soul Shatter, Selfless Spirit/Prospector/Relic Vial, finite Elixir versus conditional Thornbite packages, legal skewed versus illegal mana, missing metadata, cache edits and Coach paraphrases.
- Actual add/cut comparisons cover five complete precons, plus an Equipment-without-host negative; ownership/style/identity, repeated requests, shared fetch, leave-one-out scoring, cancel isolation and missing/corrupt asset retry are checked.
- Source/data boundary checks preserve twenty unrelated calculation, Swap, Bulk and Combo modules byte for byte and retain existing learned weight/index/manifest hashes.
- The historical UI-only output digests intentionally no longer apply to this approved logic repair. Their replacements check typed-fact invariance under voice/title changes, factual cut behavior and preserved unrelated engines/data.
- Browser fixtures use mocked accounts and no collection writes. Coach worker fixtures test lifecycle/contract behavior, not language-model semantic accuracy.
- Build/type checks and existing recommendation, Coach, Swap, Bulk, account, Precon, Combo, card-library and scanner safety regressions are part of release validation.

Detailed local results are in ignored `preview/evidence/shared-analysis` and `preview/evidence/analysis-editorial`; no ground-truth fixtures, experimental model weights or research execution code enter the browser bundle. Research evidence remains separately committed at `92132f32818c6895cbeb27b819486c922ec4093f`.

## Limits

Structural categories and narrow loop recognition remain heuristics, not a general MTG rules engine. Learned card coverage is incomplete and co-occurrence can favor familiar cards. Advice still requires player review. Browser QA is Chromium on Windows, including mobile viewports; physical Safari/iOS/Android devices are not qualified by this release. No real user account or collection was used.
