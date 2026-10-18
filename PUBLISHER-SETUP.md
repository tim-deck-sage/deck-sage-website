# Deck Sage publisher operations

The publishing desk is enabled at `https://deck-sage.com/#/publish`. It uses the Deck Sage TEST Supabase project `mihmykgxbneuhlcxolzm`; the app and other Supabase projects are not involved.

## Private secret setup

1. Open the [Deck Sage TEST Edge Function secrets screen](https://supabase.com/dashboard/project/mihmykgxbneuhlcxolzm/functions/secrets) while signed in to Supabase.
2. Add `DECK_SAGE_PUBLISHER_PIN` with the four digits Tim wants to use. Enter the value only in Supabase; do not put it in chat, GitHub, a local `.env`, or a username.
3. Add `PUBLISHER_ENABLED` with the value `true`, then save.
4. Confirm only that the two secret names were saved. Never report the PIN value.

The function returns only whether configuration exists. Neither secret is sent to the static website, stored in the repository, or written to application logs.

## Deployed backend scope

Target project: `mihmykgxbneuhlcxolzm` only.

- Migration `supabase/migrations/20261018224320_publisher_content.sql` creates the publisher schema and media bucket.
- Public bucket `deck-sage-published-media` has a 6 MB object limit and the listed image/audio MIME types.
- Three RLS-enabled, client-denied tables store paired publications, 15-minute publisher sessions, and rate-limit counters.
- One `SECURITY DEFINER` rate-limit function has `PUBLIC`, `anon`, and `authenticated` execution revoked; only `service_role` may call it.
- Edge Function `website-publisher` has platform JWT verification disabled because it performs its own PIN/session checks.
- The public client is enabled only after hosted role, denial, public-feed, and secret-presence checks pass. Write-path idempotency and rollback are covered by isolated fixture tests so production is not seeded with fake content.

No existing app tables, shared-username data, Auth configuration, legacy projects, or mobile assets are in scope.

## Publishing behavior

- PIN failures: five attempts in 15 minutes, then a 30-minute server block per request source.
- Session: random server-stored token, fixed 15-minute expiry, browser `sessionStorage` only.
- Lore: title, optional commander, 20-20,000 characters of text, and JPEG/PNG/WebP artwork up to 4 MB.
- Song: title, optional commander, at least one display collection, JPEG/PNG/WebP artwork up to 4 MB, and MP3/M4A/OGG/WAV audio up to 6 MB.
- A publication row is inserted only after every required asset validates and uploads. Any failed partial upload is removed.
- Retries reuse a UUID operation receipt. The same receipt and content returns the original entry; changed content with the same receipt is rejected.
- Public visitors can read published entries and public media. Browser roles receive no insert, update, delete, session, or rate-limit table permission.

## Rollback

First set `PUBLISHER_ENABLED` to `false`, then disable the client configuration and publish that website change. Preserve publication rows and media unless Tim separately authorizes deletion.
