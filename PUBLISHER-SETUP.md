# Deck Sage publisher handoff

The website candidate contains a disabled publishing desk at `https://deck-sage.com/#/publish`.
It must stay disabled until both the exact TEST-project migration/function scope is approved and Tim completes the secret entry below.

## Tim's one private setup step

1. Open the [Deck Sage TEST Edge Function secrets screen](https://supabase.com/dashboard/project/mihmykgxbneuhlcxolzm/functions/secrets) while signed in to Supabase.
2. Add `DECK_SAGE_PUBLISHER_PIN` with the four digits Tim wants to use. Enter the value only in Supabase; do not put it in chat, GitHub, a local `.env`, or a username.
3. Add `PUBLISHER_ENABLED` with the value `true`, then save.
4. Report only that the two secret names were saved. Never report the PIN value.

The function returns only whether configuration exists. Neither secret is sent to the static website, stored in the repository, or written to application logs.

## Exact approval scope still required

Target project: `mihmykgxbneuhlcxolzm` only.

- Apply `supabase/migrations/20261018220506_publisher_content.sql`.
- Create public bucket `deck-sage-published-media` with a 6 MB object limit and the listed image/audio MIME types.
- Create three RLS-enabled, client-denied tables: paired publications, 15-minute publisher sessions, and rate-limit counters.
- Create one `SECURITY DEFINER` rate-limit function with `PUBLIC`, `anon`, and `authenticated` execution revoked; only `service_role` may call it.
- Deploy `website-publisher` with JWT verification disabled because the function performs its own PIN/session checks.
- Enable the public client configuration only after hosted role, upload rollback, idempotency, rate-limit, public-feed, and secret-presence checks pass.

No existing app tables, shared-username data, Auth configuration, legacy projects, or mobile assets are in scope.

## Publishing behavior

- PIN failures: five attempts in 15 minutes, then a 30-minute server block per request source.
- Session: random server-stored token, fixed 15-minute expiry, browser `sessionStorage` only.
- Lore: title, optional commander, 20-20,000 characters of text, and JPEG/PNG/WebP artwork up to 4 MB.
- Song: title, optional commander, at least one display collection, JPEG/PNG/WebP artwork up to 4 MB, and MP3/M4A/OGG/WAV audio up to 6 MB.
- A publication row is inserted only after every required asset validates and uploads. Any failed partial upload is removed.
- Retries reuse a UUID operation receipt. The same receipt and content returns the original entry; changed content with the same receipt is rejected.
- Public visitors can read published entries and public media. Browser roles receive no insert, update, delete, session, or rate-limit table permission.

## Rollback before activation

The disabled website build can be rolled back by reverting its website commit. No hosted rollback is required until the approved migration and function deployment occur. After activation, rollback must first disable `PUBLISHER_ENABLED`, then disable the client configuration. Preserve publication rows and media unless Tim separately authorizes deletion.
