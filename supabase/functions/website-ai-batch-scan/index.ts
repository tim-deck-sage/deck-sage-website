// @ts-nocheck -- Supabase Edge Functions run on Deno, outside the Next.js type environment.
import {handleRetiredScan} from './policy.mjs';

// Keep a tombstone at the old URL so cached website clients cannot invoke a model.
Deno.serve(handleRetiredScan);
