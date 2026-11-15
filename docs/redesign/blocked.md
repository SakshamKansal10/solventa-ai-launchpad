# Blocked

Items that need the owner, a key or a tool not available in this session.

## Cinematic: "missing graphics" on the owner's laptop (not reproduced)
The 21-scene comparison of the live site and HEAD (lite) at 1440×900 on an integrated Radeon
Vega 3 shows no element missing (part2-perf.md, Part 2c; images in docs/redesign/perf/scenes/).
**Owner:** please send, from the preview on the laptop: (1) a screenshot of a scene where
something is missing, (2) `document.querySelector('[data-testid=cinematic-home]').dataset` from
the console (mode and tier), (3) the screen size. Likely causes: the still version below 768px or
on < 4 cores / < 4 GB (by design); 1px filaments shimmering without MSAA at a low pixel ratio.

## Cinematic: one ~267 ms frame per scroll pass (lite, Vega 3)
Seen in both 2c runs, with and without a notch step, unthrottled and at 4×; not a long task
over 50 ms on the main thread (so GPU-side or compositor). Not yet traced; next step would be a
GPU trace around the pass reversal.

## Part 4: verify the week-detail schema against the real Gemini API
The mission schema gained 11 optional workspace fields (decisions 19). The fake Gemini accepts
anything; the real API rejected an over-complex schema once (Stage 7). **Owner / next session:**
generate one roadmap on the preview with a real key and confirm week 1 builds; if it returns
400 INVALID_ARGUMENT, drop `quizOptions`/`quizAnswers` first (the largest), then `lesson`.

## Make it official: owner review before the content shows (part 4, feature 7)
- **What:** the four steps and the under-18 note were drafted from the official sites
  (mca.gov.in, udyamregistration.gov.in, rbi.org.in, gst.gov.in, indiacode.nic.in) without a live
  re-check from this environment. Every rule, fee and threshold is marked `NEEDS OWNER REVIEW` in
  `src/content/make-official.ts` with the page to check it against.
- **Owner action:** have each step checked (ideally by a CA), correct the text if needed, then set
  `reviewed: true` and `lastChecked: "<YYYY-MM-DD>"` on it (and on `MINOR_NOTE`). Until then the
  page shows "Being reviewed" for that step. Hindi text needs the same check.

## Weekly reminder: env vars before any email is sent (part 4, feature 8)
- **Owner action:** in Vercel (Production), set `CRON_SECRET` (any random string of 16+
  characters; Vercel sends it to the cron) and `SUPABASE_SERVICE_ROLE_KEY` (Supabase → Project
  Settings → API → service_role). Apply migration 0017 first. `RESEND_API_KEY` must already be set.
- **WhatsApp (not built, as asked):** it would need a WhatsApp Business Platform account (Meta
  Cloud API or a BSP such as Gupshup/Twilio), a verified business number, a pre-approved message
  template (one line + one button with the mission link) in English and Hindi, a stored phone
  number with explicit opt-in per founder, and the same cron calling the template-send API.

## Missing graphics / S-mark — resolved (owner step 4, 2026-11-15)
The S-mark (Intelligence Core, "Core awakening") appears and plays after data-ready on lite and
full (docs/redesign/perf/scenes/smark-*.png). No commit lost it. The miss came from scrolling
past it before the world was ready; the opening now holds at the lockup until ready. If the
owner still sees it missing on the preview, the useful report is: the URL, screen width, and
whether "Preparing the experience" showed under the lockup.
