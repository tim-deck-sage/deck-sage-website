# Proposed draft PR: Give every homepage feature an illustrated editorial chapter

The homepage currently compresses its primary features into seven illustrated buttons and places newer Commander tools in the stats strip. This UI-only redesign gives every feature a named, illustrated area with a short description and its existing action.

The opening sanctum scene leads into alternating dark and ivory chapters, occasional wide artwork sections, and a contained Friends/Store module. A top menu provides direct routes and an accessible mobile dialog. Existing deck/bulk/unread counts, account gating, collection persistence, scanner, recommendation logic and all subpage implementations remain unchanged. Four original fantasy illustrations fill missing tool scenes; the remaining artwork reuses existing Deck Sage assets. System serif typography avoids proprietary Riot fonts.

Validation: 13 homepage checks cover all 14 feature actions, repeated navigation, actual fixture counters, empty/loading states, 320–1440px geometry, fully loaded artwork, keyboard focus, mobile menu behavior and no account saves. All 26 relevant existing regression scripts/browser suites passed. Typecheck and the supported webpack production export passed; installed Turbopack failed while starting its PostCSS worker. Each artwork is under 350KB, the full lazy-loaded set is 2.36MB, and the initial hero is 287KB.

Actual desktop hero, two multi-section flows, and mobile renders are saved in the user's Library for visual approval. Do not merge or deploy until the user approves those renders.
