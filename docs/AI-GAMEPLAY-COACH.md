# AI Gameplay Coach

The Gameplay Coach is an opt-in, browser-only assistant inside Deck Details. It uses `onnx-community/Qwen3-0.6B-ONNX` through Transformers.js with WebGPU and q4f16 weights. The model interprets a player's observation into a small, validated category set; Deck Sage's existing deterministic engine remains authoritative for card legality, color identity, candidates, and cut safety. Model-proposed card names are never accepted.

The first activation may download about 580 MB. On the Core test machine (NVIDIA RTX 5070 Ti, Edge 155), a cold model load took 19.9 seconds, cached reload 2.25 seconds, classification 0.69 seconds, and explanation 0.86 seconds. The browser cache measured 578,923,520 bytes and the cached reload made no model network requests. These are measurements, not promises.

History is limited to five compact observations per normalized username-and-deck scope and fifty scopes total in localStorage. It is not synced, is deleted with browser site data, and is visible to anyone using that browser profile. The username is a partition key, not authentication. Only confirmed saved-deck snapshot differences are called changes; recommendations are never recorded as implemented.

V1 requires WebGPU. Unsupported browsers/devices get a bounded explanation and the rest of Deck Sage continues to work. CPU fallback and physical mobile hardware have not been validated. The feature can be disabled through `coach-config.js` without affecting other tools.

## Intent reconciliation v2

The first classifier over-weighted keywords such as “mana” and forced every observation into one broad recommendation role. That confused mana surplus with mana shortage, late-game combat impact with card draw, and let earlier wrong history labels bias later model prompts.

Classification v2 keeps the original player text authoritative and distinguishes mana outlets, combat finishers, mana quantity, color fixing, mana timing, card quantity, card selection, specific-card access, protection, recovery, interaction availability, interaction timing, and rules questions. Explicit negation and corrections override generic keywords. Clear player-language evidence also overrides a conflicting or malformed model classification. Old history text remains intact, but old category labels are marked as earlier-classifier results and are not supplied to future prompts.

The 0.6B model remains useful as a local language signal, but it is not reliable enough to be the MTG authority. In the October 19 Edge regression it loaded from cache in 2.73 seconds and answered the three reported cases in 1.17–2.19 seconds. It produced malformed nested JSON for one mana-outlet case, an invalid `interaction` category for the negated-producer case, and irrelevant card-draw/timing secondaries for the late-game-finisher case. The deterministic player-intent layer produced the correct final intent in all three cases and discarded the noise.

Card suggestions come from the current local Oracle-text catalog and existing legality, identity, whole-deck, and relationship checks. Rules explanations use small retrieved notes tied to the official Magic Comprehensive Rules and Commander format pages. Unclear observations produce a focused clarification question instead of a guessed card list. Plain-text sanitation rejects headings, confidence/classification boilerplate, raw Markdown, and unverified proper-name claims; rejected prose falls back to a concise explanation assembled from verified intent, deck metrics, and rules evidence.
