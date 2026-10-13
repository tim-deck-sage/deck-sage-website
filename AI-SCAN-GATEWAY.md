# Website AI Scan gateway

The website AI Scan uses an isolated Supabase Edge Function in the authorized TEST project only:

- Project: `mihmykgxbneuhlcxolzm` (`Deck Sage DB Integration Test`)
- Function: `website-ai-batch-scan`
- URL: `https://mihmykgxbneuhlcxolzm.supabase.co/functions/v1/website-ai-batch-scan`
- Deployed version: 3
- JWT verification: disabled intentionally because the website uses shared usernames rather than login accounts

The gateway accepts requests only from `https://deck-sage.com`, validates one JPEG of at most 6 MB, applies HMAC-hashed-IP and global quotas, and calls OpenAI from the server. It does not log images or extracted names. The browser never receives the OpenAI key.

## Current published state

`preview/public/ai-scan-config.js` contains the deployed endpoint but keeps `enabled: false`. The UI therefore shows an honest disabled state and cannot upload photos while the OpenAI secret is absent. No mock extraction is presented as live behavior.

## One-time secret setup

Tim should add the secret directly in the Supabase dashboard; never paste it into the website, repository, issue, or chat:

1. Open <https://supabase.com/dashboard/project/mihmykgxbneuhlcxolzm/functions/secrets>.
2. Add a secret named `OPENAI_API_KEY`.
3. Paste the key value and save it.

Supabase makes saved Edge Function secrets available without a function redeploy. After the secret is present, verify one isolated fixture scan before enabling the public client.

## Activation

After a successful isolated fixture scan:

1. Change `enabled: false` to `enabled: true` in `preview/public/ai-scan-config.js`.
2. Rebuild the assembled static site.
3. Run the AI Scan, Batch Upload, account, My Decks, homepage, and legal-route regressions.
4. Publish normally through the GitHub Pages `main` workflow and verify the exact deployed commit.

## Database objects

The following TEST-project migrations provide the quota ledger and service-role-only quota function:

- `supabase/migrations/20261013120000_ai_scan_rate_limits.sql`
- `supabase/migrations/20261013123000_ai_scan_quota_ordering.sql`

The quota table lives in the private schema with RLS enabled and no anonymous or authenticated privileges. Only the Edge Function service role can execute `public.consume_ai_scan_quota(text)`.

These request quotas are abuse guardrails, not a guaranteed spending cap. Configure OpenAI project budgets and usage alerts separately before public activation.
