# Homepage art and advertising refinement

Based on current main 713f42ed60e4156a83605b411c92467860f33f3c, isolated branch ui/home-art-refinement. The user approved publication after artwork/layout checks. No advertising backend or account/collection/recommendation changes.

## Artwork provenance and size

The primary generator produced an undersized 1672x941 draft and then failed with an unknown-parameter service error. That draft was discarded. The connected generation service supplied new original generation outputs, downloaded and inspected before export:

| Source | Dimensions | Bytes |
| --- | --- | --- |
| Commander battle | 5504x3072 | 20,143,762 |
| Angel commander | 4800x3584 | 22,246,144 |
| Whole dragon | 4800x3584 | 19,886,252 |

No local upscaling was performed. Source PNG masters remain in the task workspace's art-refinement-masters folder. The website ships only responsive WebP reductions/crops:

| File | Dimensions | Bytes |
| --- | --- | --- |
| hero-war-1920.webp | 1920x1080 | 206,630 |
| hero-war-3840.webp | 3840x2160 | 450,200 |
| hero-war-mobile-780.webp | 780x936 | 120,656 |
| hero-war-mobile-1170.webp | 1170x1404 | 202,244 |
| decks-angel-800.webp | 800x597 | 70,742 |
| decks-angel-1600.webp | 1600x1195 | 203,062 |
| decks-angel-2400.webp | 2400x1792 | 336,642 |
| songs-dragon-800.webp | 800x597 | 68,030 |
| songs-dragon-1600.webp | 1600x1195 | 175,702 |
| songs-dragon-2400.webp | 2400x1792 | 264,222 |

The old soft angel and wing-only crop are removed from the homepage art directory. Unchanged scenes remain. The complete set of all responsive variants and unchanged scenes totals 4,053,332 bytes; the browser selects one source per image and feature scenes remain lazy-loaded. Mobile hero uses a dedicated portrait crop to keep commanders prominent, while desktop/high-DPI screens choose between 1920 and 3840-wide exports. The angel and dragon use 800/1600/2400 srcsets with subject-safe edge fading.

## Presentation and routes

The hero is slightly shorter, preserving content height and typography while showing the next section below. The explicit scroll-to-explore hint is hidden. Existing continuous backgrounds, approved controls and restrained motion remain.

The homepage and its Explore/mobile navigation now label the former store area Advertise on Deck Sage. It opens #/advertise, a plain coming-soon placeholder with no forms, payments, tracking or publishing actions. The old #/stores draft tool remains available by its existing route so existing data and functionality are preserved. No advertising infrastructure was added.

## Generation briefs

Battle: full-scale original commander war at a ruined citadel, angel general, knights, blue archmage, elven warleader, necromancer and spectral infantry, crimson dragon, clashing armies; strong action on the right, lower-contrast left for the headline, golden dawn and emerald storm clouds. Angel: original dark-haired angel in detailed silver/gold armor, lowered sword, luminous wings, face and body centered with generous margins. Dragon: bronze/emerald dragon on an amphitheater above a fantasy valley, complete head, neck, chest and body inside the central crop-safe area, wings framing the body. Premium detailed painterly fantasy; no exact named characters, text, logos, cards, UI or watermarks.

Validation before release: local production webpack export and typecheck passed. All 13 homepage regression checks and 5 interaction checks passed. The new 10-check art suite passed at 1440x900 1x, 1440x900 2x and 390x844 3x: correct srcset selection, next-section visibility, angel/dragon real-image rendering, placeholder navigation, preserved legacy store route and no browser exceptions or real account writes. Actual section/viewport screenshots were visually inspected for readable text, complete subjects and continuous layout. Reproduce with npm run test:homepage:art against the local preview URL. Existing feature browser suites and the normal Linux release build are also checked as part of publication.
All nine existing feature browser suites passed after the refinement: batch upload, Commander Swap, Combos, Precon Vault, Card Library, My Decks, deck details, songs and daily news. No collection/backend changes were required.
