# Editorial homepage review

UI-only candidate based on main f2d9bfc46a01c67a1aef1797aa9f566fbad4be39. Isolated clone and branch ui/editorial-homepage. Existing checkouts and Continuum are untouched. Do not merge or publish until the user approves the actual rendered preview.

## Inventory and layout

The previous homepage contained My Decks, My Bulk, Sage Tools, Commander Lore, Theme Songs, Collection Value, and Latest News as seven image links. Its stats strip showed the existing deck count and bulk quantity; links opened Card Library, Precon Vault, Commander Combos, Commander Swap, profile/settings, and notifications. The global sidebar also exposed store, friends, help, settings/backup and sign-in; footer included contact/support, privacy, terms and account deletion.

The candidate gives all fourteen feature routes an illustrated named area: decks, bulk, cards, batch-upload/bulk, sage, precons, combos, commander-swap, value, lore, songs, news, friends, stores. Profile, account, help, notifications and support are compact accessible controls. No feature implementation or handler was changed. Existing live counts come directly from state. Existing account gating remains outside Home and takes precedence unchanged.

A large static sanctum scene opens the page. A dark top menu gives direct access to Decks, Bulk, Library and Sage Tools plus an Explore menu for every other route. Mobile uses a native modal dialog with Escape handling, focus restoration and browser-provided focus containment. Alternating ivory and dark split chapters are punctuated by wide scene chapters; Friends and Store use a contained two-card module. Content determines section height. All CSS is scoped to the new homepage. No video, animation, particles, scroll listener, parallax, or scroll hijacking.

## Assets and fonts

Inventoried before implementation. Five existing panoramic sanctum backgrounds and seven usable source paintings were available; many source PNGs are non-renderable placeholders. Existing portraits and original arcane-library artwork are reused as scene crops. Four missing tool illustrations were created using the built-in imagegen tool, then converted to WebP at 1200x900: scanner, vault, combos and swap. Hero is 1920x1080 WebP. All feature images use lazy loading and explicit dimensions; the hero has high fetch priority. Each image is below 350KB; the full art set is below 3MB. All art ships locally and requires no third-party image fetch on Home.

Georgia Bold / Georgia Bold Italic supplies the dramatic editorial serif with system font fallbacks. No Riot font or logo is distributed.

## Generated-art prompt set

Common prefix: Use case: stylized-concept. Asset type: landscape website section artwork, 3:2 composition.

1. A silver-haired human archivist in green robes examining an unmarked spell card through a brass lens at a wooden desk in a candlelit fantasy library. Brass instruments, a stack of plain-backed cards. Rich green and antique gold.
2. A monumental ancient stone vault in a mountainside, a robed elven keeper carrying a book through enormous open doors. Shelves of spell tomes and ornate treasure chests, blue dusk and warm gold light.
3. Two original fantasy mages, one in teal robes, one in burgundy, working together over a stone table to interweave two clear luminous rune patterns. Measured strategic spellcraft, teal and amber light, ancient academy.
4. An armored female commander at dawn looking toward two different heraldic banners beside an ancient battlefield planning table. Thoughtful strategic choice, silver armor, windswept cloak, blue hills and warm dawn.

Common suffix: Painterly premium collectible fantasy card illustration, convincing anatomy and architectural detail, cinematic lighting, restrained atmospheric depth, clean legible focal point. Original MTG-inspired fantasy without existing named characters. No letters, words, logos, text, borders, UI, card frames, particles or watermark.

## Verification

All browser validation uses isolated browser profiles, in-memory shared-account fixtures, and blocks other external traffic. It does not sign into or mutate a real account. The updated homepage regression validates route entry points, real fixture counters, empty and loading gates, full artwork loading, no browser exceptions or collection saves, desktop and mobile layout widths, mobile menu keyboard behavior, and asset budgets. Rendered review captures live in preview/evidence/editorial-home/.

Production export: Next's default Turbopack failed in the installed runtime while creating its PostCSS worker (also outside sandbox). The supported `next build --webpack` path compiled and exported all seven static routes successfully. `tsc --noEmit` passed. Preview account bundle and scanner build completed and the static allowlist includes all new artwork and scoped CSS. No deployment ran.

Final local verification: 13 homepage checks passed; 17 existing account/collection/scanner/recommendation/content regression scripts passed, plus all 9 browser suites (batch upload, Commander Swap, Combos, Precon Vault, Card Library, My Decks, deck details, songs and daily news). The initial batch-upload run lacked its ignored PNG fixture; restoring the existing fixture from the untouched prior checkout made the browser suite pass. No application fix was required. Typecheck, webpack production export, scanner build, account bundle and asset budget checks passed.

Remote status: pushing ui/editorial-homepage was rejected by automatic approval review before execution. It interpreted the instruction not to publish as including a remote review branch. No remote branch or PR was created; no merge or deployment occurred. The tested candidate remains committed locally and ready for explicit approval to push a review branch.
