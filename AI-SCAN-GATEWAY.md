# Website AI Scan gateway

The website AI Scan uses an isolated Supabase Edge Function in the authorized TEST project only:

- Project: `mihmykgxbneuhlcxolzm` (`Deck Sage DB Integration Test`)
- Function: `website-ai-batch-scan`
- URL: `https://mihmykgxbneuhlcxolzm.supabase.co/functions/v1/website-ai-batch-scan`
- Deployed version: 4
- JWT verification: disabled intentionally because the website uses shared usernames rather than login accounts

The gateway accepts requests only from `https://deck-sage.com`, validates one JPEG of at most 6 MB, applies HMAC-hashed-IP and global quotas, and calls OpenAI from the server. It does not log images or extracted names. The browser never receives the OpenAI key. Server processing also requires `AI_SCAN_ENABLED` to equal exactly `true`; a missing, false, or differently cased value keeps the gateway disabled even when `OPENAI_API_KEY` exists.

## Current published state

`preview/public/ai-scan-config.js` contains the deployed endpoint but keeps `enabled: false`. The UI therefore shows an honest disabled state and cannot upload photos. The independent server-side switch is also default-off. No mock extraction is presented as live behavior.

## One-time secret setup

Tim should add the secret directly in the Supabase dashboard; never paste it into the website, repository, issue, or chat:

1. Open <https://supabase.com/dashboard/project/mihmykgxbneuhlcxolzm/functions/secrets>.
2. Add a secret named `OPENAI_API_KEY`.
3. Paste the key value and save it. Do not add or enable `AI_SCAN_ENABLED` yet.

Supabase makes saved Edge Function secrets available without a function redeploy. Adding `OPENAI_API_KEY` alone does not activate requests because the server gate remains default-off.

## Activation

When ready to test and activate:

1. Confirm `OPENAI_API_KEY` is saved without reading or exposing its value.
2. Add `AI_SCAN_ENABLED` with the exact value `true`. This immediately admits origin-valid gateway requests; there is no private bypass mode.
3. Run one isolated real fixture scan while the public client remains `enabled: false`.
4. If the fixture succeeds, change `enabled: false` to `enabled: true` in `preview/public/ai-scan-config.js`.
5. Rebuild, run the complete regression set, publish through the GitHub Pages `main` workflow, and verify the exact deployed commit.
6. To stop server processing at any time, change `AI_SCAN_ENABLED` to any value other than exact lowercase `true`, or remove it.

## Database objects

The following TEST-project migrations provide the quota ledger and service-role-only quota function:

- `supabase/migrations/20261013120000_ai_scan_rate_limits.sql`
- `supabase/migrations/20261013123000_ai_scan_quota_ordering.sql`
- `supabase/migrations/20261013214500_ai_scan_quota_headroom.sql`

The quota table lives in the private schema with RLS enabled and no anonymous or authenticated privileges. Only the Edge Function service role can execute `public.consume_ai_scan_quota(text)`.

One uploaded image is one quota admission. The active limits are 24 admissions per IP per 10 minutes, 30 per IP per UTC day, and 250 globally per UTC day. A 20-photo batch therefore has four same-window retry admissions. These quotas are abuse guardrails, not a guaranteed spending cap. Configure OpenAI project budgets and usage alerts separately before public activation.
