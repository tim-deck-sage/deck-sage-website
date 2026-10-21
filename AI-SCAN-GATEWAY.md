# Retired website scan gateway

The old server-side scanner is replaced by an on-device scanner. Its Supabase URL is retained as a tombstone so cached website clients cannot use it to call a paid model.

- Project: `mihmykgxbneuhlcxolzm` (`Deck Sage DB Integration Test`)
- Function: `website-ai-batch-scan`
- Retired URL: `https://mihmykgxbneuhlcxolzm.supabase.co/functions/v1/website-ai-batch-scan`
- Retirement deployed: version 9 on 2026-10-21 at 16:00 UTC
- Deployment SHA-256: `852b7e985b10aad09391bca3e57d35757b7a7bf7a79f80845ef3c0f28e70ff75`
- Previous live version: 8, inspected on 2026-10-21
- JWT verification: unchanged (`false`); the tombstone has no protected service behavior

## Retirement behavior

The function accepts only the existing `https://deck-sage.com` origin. Valid `OPTIONS` preflights receive 204 with the existing POST/content-type CORS contract. Valid-origin POST requests receive 410 with `code: SCANNER_RETIRED`, a request to refresh the site, and `Cache-Control: no-store`. Other origins receive 403 without an allow-origin header; unsupported valid-origin methods receive 405.

The function never reads uploaded bodies, accesses secrets or feature flags, logs image data, consumes quota, queries the database, or makes outbound requests. It therefore cannot incur OpenAI inference charges, even for old clients or when old project secrets still exist. Supabase's normal request/platform metering still applies.

The new website must not contain the retired URL in its active scan configuration. Image recognition runs on the user's device instead. The ordinary card-name/catalog lookup path is separate from image processing.

## Verification

Run `node tests/regression/ai-scan-gateway.cjs`. It checks the deployed entrypoint, tests allowed and rejected origins, verifies preflight and method behavior, and proves POST bodies are not accessed. It also forbids model/network/secret/quota code in the function.

Live source and behavior were verified after deployment on 2026-10-21 at 16:01 UTC. Recheck after any future deployment:

1. POST with `Origin: https://deck-sage.com` returns 410 and `SCANNER_RETIRED`.
2. OPTIONS from the same origin returns 204 with the expected CORS headers.
3. A POST from another origin returns 403 without an allow-origin header.
4. Unrelated Edge Functions are unchanged.

Do not upload real user images to perform these checks. The handler ignores its body, so an empty POST is sufficient.

## Preserved resources and rollback

Unrelated functions were checked after deployment: `website-daily-news` remains version 5 (`c33e8f5c036c4f3055311d93a4277eb5411dc041cdfab1ac686ebaa75e4b4ece`), and `website-publisher` remains version 1 (`24bcc18495bd91f9426d803f6d1a7dc2a300488fbc8a553a0ca3f9373164a06a`). Their deployment timestamps are unchanged.

No shared project secrets are removed or changed. In particular, `OPENAI_API_KEY` may still be used by the separate daily-news function; this scanner retirement does not authorize disabling unrelated news behavior. The scanner quota tables and migrations remain untouched and unused.

The previous implementation is preserved in Git at commit `fa937b3` under `supabase/functions/website-ai-batch-scan/`. A deliberate redeploy can restore it, but doing so would reintroduce the paid model connection and requires new authorization. Rolling the website back must not automatically roll this tombstone back. Changing old enable flags alone cannot reactivate scanning.
