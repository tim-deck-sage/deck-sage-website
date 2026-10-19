# AI Gameplay Coach

The Gameplay Coach is an opt-in, browser-only assistant inside Deck Details. It uses `onnx-community/Qwen3-0.6B-ONNX` through Transformers.js with WebGPU and q4f16 weights. The model interprets a player's observation into a small, validated category set; Deck Sage's existing deterministic engine remains authoritative for card legality, color identity, candidates, and cut safety. Model-proposed card names are never accepted.

The first activation may download about 580 MB. On the Core test machine (NVIDIA RTX 5070 Ti, Edge 155), a cold model load took 19.9 seconds, cached reload 2.25 seconds, classification 0.69 seconds, and explanation 0.86 seconds. The browser cache measured 578,923,520 bytes and the cached reload made no model network requests. These are measurements, not promises.

History is limited to five compact observations per normalized username-and-deck scope and fifty scopes total in localStorage. It is not synced, is deleted with browser site data, and is visible to anyone using that browser profile. The username is a partition key, not authentication. Only confirmed saved-deck snapshot differences are called changes; recommendations are never recorded as implemented.

V1 requires WebGPU. Unsupported browsers/devices get a bounded explanation and the rest of Deck Sage continues to work. CPU fallback and physical mobile hardware have not been validated. The feature can be disabled through `coach-config.js` without affecting other tools.
