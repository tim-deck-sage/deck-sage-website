# Original app avatars on the website

The original artwork and avatar ordering come from the mobile app release
`f2bc0805199e7c9293de3c5507743b82fa0fbd7d` (`baseline/current-application-20260717`),
not the older default `master` branch. Sources inspected:

- `app/utils/avatarAssets.ts`: nineteen IDs `avatar1` through `avatar19` and image mapping.
- `app/screens/SanctumAvatarSettingsScreen.tsx`: choose and save a profile avatar.
- `app/components/avatar/DeckSageAvatar.tsx`: circular, cover-fit image display.
- `assets/images/avatars/avatar1.png` through `avatar19.png`: original artwork.

`avatar-assets.json` records original Git blob/SHA-256 hashes and optimized output
hashes. Source bytes were checked against Git's blob hashes before conversion.
The 256px WebP derivatives retain transparency. The source repository contains no
separate artwork license identified in the inspected tree. This owner-requested
reuse does not grant additional rights or claim independent third-party clearance.
No external artwork, image generation or AI model was used.

The website already had a 19-item numeric selector and `state.profile.avatar`.
It rendered geometric placeholder seals rather than the original illustrations.
This change replaces that shared renderer and improves the existing chooser,
without introducing onboarding, a subscription gate or a new persistence path.
The numeric IDs 1–19 remain unchanged. Existing accounts without a selection keep
the website's default, avatar 1. Invalid IDs fall back to 1; profiles cannot inject
arbitrary image URLs. Failed images show the existing seal rather than a broken icon.

Selection automatically saves through the existing workspace controller and its
revision/conflict handling. Guest data stays in browser storage; shared username
profiles use their existing shared workspace JSON. Anyone who enters that shared
username retains the same pre-existing access. No new social publishing, app-profile
synchronization, permissions, schema, account credential or security changes occur.
Collections, scanner, recommendations and protected source engines are untouched.

Verification commands:

- `npm run test:avatars`: IDs, fallback, asset provenance/size, existing shared save,
  backup round trip, remembered-user restoration, account isolation and stale events.
- `npm run test:avatars:ui`: in-memory shared RPC fixture with all other external
  requests blocked; original image loading,
  keyboard choice, selected-state semantics, refresh, navigation/Back, mobile fit,
  44px touch targets, broken-image fallback and recovery. No real account writes.

The publisher runs the complete regression/build and reviews the final output
allowlist before release.
