# App-to-web daily news checklist

- [x] Seven-source fetch inventory matches the original app.
- [x] 21-day freshness window, authority/freshness ranking, deduplication, and per-source diversity.
- [x] One server-side OpenAI summary batch per successful UTC day; page views never generate summaries.
- [x] Existing `OPENAI_API_KEY` remains server-side and the scanner function/quotas are untouched.
- [x] Ten cached candidates, seven served stories, top-story-first presentation.
- [x] Category badges, accent colors, summary, “Why it matters,” tags, publisher, date, and source link.
- [x] Refresh only reloads the active cache and ignores repeated clicks while busy.
- [x] Article detail, Back, Home, loading, empty, delayed-update, and archive-fallback states.
- [x] Failed source/summarization runs leave the previous active digest untouched.
- [x] Desktop and mobile responsive checks use Microsoft Edge through Core’s Playwright runtime.
