# My Decks — Commander Sanctum verification

Rollback: `c0dec78a991984e2c9ef3f49ad077fd5f56081d9`.

## Source review

- Read the complete 31,385-byte Library specification before implementation.
- Inspected the approved render and every supplied artwork file as pixels.
- Read `E:\dev\deck-sage-app\app\app\screens\MyDecksScreen.tsx` without modifying the mobile app.
- Confirmed the app's ordering, commander fallback, archive, count, navigation, multi-commander creation, empty/cancel, and three deletion paths.

## App-to-web checklist

| Capability | Result |
| --- | --- |
| Real stored decks only | Preserved; no sample records |
| Featured decks | Up to two real active decks, then archived fallback; deterministic time/name order |
| Commander references | Existing full/extended-art resolver, complete-card `contain`, lazy compact images, fallback |
| Multiple commanders | Preserved in creation, labels, and combined color identity |
| Counts and navigation | Named copies plus basics; commander image/frame is the primary semantic deck link |
| Create/cancel/repeated submit | Preserved and regression tested |
| Edit/delete | Removed from gallery tiles; retained in deck detail/edit modal |
| Deletion choices | Move cards to bulk, delete cards, or retain a hidden synchronized deck record |
| Archive | Badge and filter shown only when archived decks exist |
| Library controls | Deck/commander search, recent/A–Z, W/U/B/R/G/multicolor/colorless, status |
| Responsive and reduced motion | Featured 3/2/1; library 4/3/2/1; desktop/390px Core QA; motion disabled on preference |
| Shared usernames | Existing normalized shared collection model unchanged |
| Scanner | Frontend remains `enabled:false`; scanner, Edge function, keys, and database unchanged |

## Production artwork

The seven supplied files are shipped as alpha-preserving WebP derivatives in `preview/public/my-decks/`: `background`, `table`, `banner-left`, `banner-right`, `commander-frame`, `new-deck`, and `divider`. Combined production size is 1,779,444 bytes, about 83% smaller than the supplied PNGs.

The source folder did not contain the separate wide neutral frame described in the specification. Compact library cards therefore use the supplied visual language with CSS borders and the same real commander-card imagery.

## Evidence

- `tests/regression/my-decks-desktop.png`
- `tests/regression/my-decks-mobile.png`
- `tests/regression/my-decks-report.json`

Screenshots use isolated generated fixtures and never read, edit, or delete the owner's real collection.
