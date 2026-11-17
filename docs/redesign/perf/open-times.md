# Dashboard page opens: before and after (Job I, 2026-11-17)

Measured on https://solventia.in, signed in as the review account (18 directions, one chosen,
roadmap active), Chrome on the owner's Windows PC network, 1440×900. "Content" = the page's
own heading (a direction: its title and saved detail) on screen, from the click or from the
start of a full page load. Tools: `.e2e-tmp/prod-perf/` (open-times, cold-today, cold-click,
dir-click); not committed.

**Root cause:** every server function ran in Vercel's default region iad1 (Washington, USA)
while Supabase is in Mumbai: each database round trip crossed the world (~300 ms), so every
page's server call waited 0.7–2.3 s for its first byte, and pages fire them in waves.

| Page | Before (iad1) | After (bom1, Mumbai) |
|---|---|---|
| Today, full load | 3.1–5.2 s (two loads 23.9 s / 24.2 s, see below) | 0.6–2.0 s |
| Directions (tab) | 0.15 s | 0.16–0.22 s |
| A direction (click from Directions) | 1.4–2.0 s; 10.1 s when the dashboard refetched at the same moment | 0.10–0.11 s |
| A direction, full load | 2.0 s | 0.53–0.85 s |
| Direction › Fit | 0.09 s | 0.07–0.08 s |
| Direction › Market | 0.07 s | 0.07 s |
| Roadmap (tab) | 0.06–0.10 s | 0.08–0.11 s |
| Proof (tab) | 0.07–0.12 s | 0.09–0.11 s |
| History | 2.3 s | 0.48–0.63 s (one 13.2 s, see below) |
| Settings (full load) | 1.5 s | 0.46–0.59 s |
| Hindi: a direction after a cold Today load | 1.95 s; translations 6–9 s (first-time Gemini) | 0.42 s; translations 0.1–0.3 s (cached) |
| A server call, first byte | 0.5–2.3 s | 0.07–0.28 s |

The mission page was not measured on production: the review account's roadmap showed no mission
link in this run. Locally its data now preloads on hover like a direction's.

**Not the cause:** no AI call runs when a page opens (every production direction has its saved
detail; the one old fallback that called Gemini on open is gone); no 30–40 s timeout or retry
exists in the client; Supabase itself answers in 0.1–0.3 s.

**Intermittent browser-side stall (not fixed by the app):** 4 times in about 50 page loads, every
request of one wave was held 12–19 s inside Chrome *before being sent* (the server then answered
in 0.1–2 s). It hit before and after the region change, on full page loads, and looks like Chrome
waiting on a dead network connection before opening a new one. Two in a row would explain a
~40 s open. It could not be captured in Chrome's net log in 20 further tries. If the owner still
sees a long open after this release, note the time and page: the Vercel request log will show
whether the request reached the server late (network) or ran long (app).

**Changes (14b6be5):** Vercel function region bom1; the direction page shows its saved summary at
once and the full detail when it arrives; hover/touch on a direction, its fit/market pages or a
mission starts that page's data; getOpportunityDetail never calls AI and no longer loads an
unread proof summary; `e2e/open-speed.spec.ts` fails if a direction with saved data takes > 2 s.
