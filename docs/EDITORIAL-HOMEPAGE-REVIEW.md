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

## Transition revision after visual feedback

Reinspected the rendered reference across Clear Path, Jungle and Choose Lane. Related features occupy one continuous field; scenery fades into it and headings distinguish features without plates. The revised Deck Sage draft groups collection features on a continuous ivory canvas, five strategy features on one emerald canvas, and stories/community on an extended ivory canvas. Per-feature backgrounds, offset frame borders, serial numbers and the intro divider are removed. Art scale and alignment vary by feature; static masks soften its edges into the shared background. Only two broad canvas transitions remain, with soft static joins. Typography, feature order, all handlers, routes and counters remain unchanged.

Revised actual screenshots show adjacent sections together: desktop-flow.png includes Decks → Bulk → Card Library; desktop-tools.png includes Vault → Combos → Commander Swap; mobile-flow.png includes consecutive collection features. All 13 homepage checks passed again, including 320–1440px layouts, menu focus, route actions, loaded art, empty/loading gates and zero account writes. Typecheck passed. Source changes are presentation markup and scoped CSS; the existing bundle was rebuilt. No remote publication was retried.

## Button and interaction refinement

The approved continuous layout, typography, scenes and feature order are unchanged. Primary links now use slimmer chamfered silhouettes with a fine gold edge; ivory areas use emerald fill and dark areas use readable warm-gold fill. Card Library, Value, Lore, Songs, News and community actions use restrained text-arrow secondary links. Native anchors and destinations are unchanged.

User-triggered effects only: a two-pixel hover lift, a one-pixel depressed press with slight scale/shadow change, a small arrow nudge, artwork scale of 1.02, and a fine top-menu underline. Hover transforms are limited to fine pointers. Press response remains available to touch. Controls keep at least 48px height, visible keyboard focus, and constant layout dimensions. Both prefers-reduced-motion and Deck Sage's existing motion preference disable the new transitions and hover/pressed transforms. No ambient animation, video, particles, parallax, extra content or handlers were added.

Fresh validation: all 13 homepage navigation/layout/account-gate checks and typecheck passed. Five interaction checks passed for actual primary/secondary default-hover-pressed captures without layout shifts or route changes, 1.02 image scale with stable dimensions, reduced-motion overrides, keyboard focus/navigation, and mobile containment/hit targets. Command: node tests/regression/homepage-interactions.cjs. Actual captures are preview/evidence/editorial-interactions/button-states.png, buttons-in-context.png and mobile-button.png, with report.json alongside them. These three captures were saved and verified in Library for reviewing these specific changes. No push, PR, merge or deployment was attempted.

## Final Sage copy and release approval

The user approved the revised layout and buttons, then authorized a final homepage copy pass and publication. Every feature description now speaks as a warm, knowledgeable wizard while plainly explaining the actual MTG tool. Scanner copy specifies on-device name recognition and review before additions; price and power results remain estimates; contact and store-draft copy makes clear that those tools do not send messages or publish announcements. Navigation/action labels, feature order, styling, routes and handlers are unchanged by this copy pass. The wording is presentation data and is not consumed by application logic.

Current remote main remains f2d9bfc46a01c67a1aef1797aa9f566fbad4be39. The previous push was never executed; the subsequent explicit publication instruction permits one renewed attempt. The normal unchanged main-branch Linux build and Pages workflow will provide release evidence. No backend, auth, schema or recommendation changes are part of this release.

Final-copy validation completed: all 13 homepage checks, 5 interaction checks, 17 existing source/account regression scripts and all 9 preserved feature browser suites passed against the stable assembled release. Commander upgrades was rerun against the correct preview port and passed its source, desktop, mobile and no-write checks. Typecheck and local webpack production export passed. Actual desktop/mobile final-copy captures were visually inspected. Release CI and exact live-asset verification follow the authorized merge.
