# Deck screens: homepage typography and navigation

Local review branch `ui/deck-editorial-consistency`, based on main `601b8c0dcf21fd5a3262c43a1dab389f072e2a2a`. Publication is held pending explicit approval. No remote branch push, PR, merge or deployment is part of this draft.

My Decks and Deck Details reuse the homepage header component, including the same feature links, profile/avatar, unread counter, Explore dropdown and native modal mobile menu. The shared header remains at the viewport top on these three screens. Explore supports Escape with focus restoration and outside-click dismissal; its list is bounded to viewport height. Existing application/sidebar headers remain hidden on the deck screens, so navigation is not duplicated.

The two deck screens use the homepage's bold Georgia headings, readable Segoe UI body/control text, restrained cream/gold palette and angled primary/secondary action treatment. Existing commander-color themes, supplied artwork, feature/library layouts, card grids, deck tools and data handlers remain intact. Rules are scoped to the editorial header or `.editorial-deck-page`; other tools retain their existing shell.

Validation: local production webpack export and TypeScript passed. Existing My Decks, War Table, homepage and homepage interaction regression suites passed, including creation/edit cancellation and save, import/export, quantity/lands/notes, six analysis tabs, persistence, identity colors and mobile layouts. The new focused UI suite (`npm run test:decks:editorial`) covers one sticky header, typography, dropdown position/Escape, native route links, mobile focus/route dismissal at 320/390/768px, long title wrapping, empty/missing deck and loading recovery. All account traffic in the focused suite is mocked; it asserts no real collection writes or browser exceptions. Actual commander images and existing background art are used for screenshot review.

An additional complete-precon fixture exposed a preexisting analysis exception (`Cannot read properties of undefined (reading 'toLowerCase')`) on Balance. The identical fixture was independently reproduced using unchanged `origin/main` app.js. This draft does not alter analysis logic; the existing representative six-tab regression suite passes. Track that complete-precon analysis case separately before treating it as a new UI regression.

Local screenshots and reports are under `preview/evidence/deck-editorial/`. Library copies are the review deliverables; originals and diagnostic scripts remain in this task workspace.
