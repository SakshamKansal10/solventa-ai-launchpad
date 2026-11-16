# Solventia redesign v2 — report

## Job E (emails) — status and owner steps, 2026-11-16

**Waiting on you: the `email-kit/` folder is not in the project** (nor anywhere under your user
folder), so the shared layout, the logo PNG (public/brand/email-logo.png), the Supabase templates,
the real test sends and the screenshots are not done — they must follow the approved kit, not a
redesign. Add the folder to the project root and they are next. Done without it: the deep links
(below), one address everywhere, and these checks:

- **How sign-in works:** codes only. `signInWithOtp` (no link) then `verifyOtp` with the typed
  code. New users get Supabase's **Confirm signup** template and returning users **Magic Link**,
  so both must show `{{ .Token }}` (and need no `{{ .ConfirmationURL }}` button). Reset password
  and Change email are not used by the app today.
- **Code expiry:** not in the repo (no supabase/config.toml setting); Supabase's default is
  3600 s = 1 hour. Check Supabase → Authentication → Providers → Email → "Email OTP Expiration"
  and tell me if it is not 3600, so the templates say the right time.
- **Auth emails from "Solventia <sol@solventia.in>"** (if Supabase → Authentication → Emails →
  SMTP Settings shows custom SMTP off): turn it on with host `smtp.resend.com`, port `465`,
  username `resend`, password = a Resend API key with sending access to solventia.in, sender
  email `sol@solventia.in`, sender name `Solventia`. (Without custom SMTP Supabase's own
  sender is rate-limited to a few emails per hour.)
- **Deliverability (DNS today, checked against 8.8.8.8):** DKIM `resend._domainkey` ✓; Resend's
  bounce domain `send.solventia.in` has its MX (feedback-smtp.ap-northeast-1.amazonses.com) and
  SPF (`v=spf1 include:amazonses.com ~all`) ✓; DMARC `p=quarantine` ✓ (aligned through
  send.solventia.in, relaxed). Nothing to add for sending. **For forwarding to sol@solventia.in**
  add, in GoDaddy, the forwarding service's MX records on `@` and ONE SPF TXT on `@`, e.g.
  `v=spf1 include:<forwarder's include> ~all`. Resend's SPF lives on send.solventia.in, so it is
  not merged into it; if you later add another sender on the root domain, put all includes in
  that one record: `v=spf1 include:<forwarder> include:<other> ~all` (never two SPF records).

## Email links open the right page (Job E, 2026-11-16)

Every email button is a plain deep link to the exact page — no login token, no magic link:

| Email | Button / link | Opens |
|---|---|---|
| Ideas ready | Explore My Directions | https://solventia.in/dashboard/opportunities?consultation=<id> — the three directions of that consultation |
| Roadmap ready | Start Week 01 | https://solventia.in/dashboard/roadmap |
| Weekly reminder | Open the mission / मिशन खोलें | https://solventia.in/dashboard/roadmap/mission/<mission id> |
| Weekly reminder | Change reminders / रिमाइंडर बदलें | https://solventia.in/dashboard/settings#reminders |
| Welcome | Continue My Consultation | https://solventia.in/consultation |
| Every footer | Open Solventia · Privacy · Terms · sol@solventia.in | /dashboard · /privacy · /terms · mailto |

Signed in, the link opens that page directly. Signed out (expired session, new browser), it
opens the sign-in page (never the homepage) — Google first, with "Sign in to see your three
directions." for the ideas link — and after signing in by Google's button, One Tap, the Google
redirect, a code or a password, the founder lands on that exact page. A `next` pointing at
another site is ignored. Tests (e2e/email-links.spec.ts, 2026-11-16, local): signed in → the
directions in 1.66 s (limit 2 s) — pass; signed out → sign in → the exact page (password and
Google) — pass; unsafe `next` (https://, //, /) ignored — pass.

## Owner steps — Google sign-in shows "Solventia" (Job C, 2026-11-16)

Google's own button and One Tap (Google Identity Services) now sign founders in on solventia.in
itself, so Google's screen says **"to continue to Solventia"** instead of
"dcnurhuxgdzxruqsjglx.supabase.co". It uses the same Google OAuth client
(1010411082234-fi2m…apps.googleusercontent.com) and Supabase verifies the token with a hashed
nonce. If Google's script is blocked (ad blockers, privacy browsers), the old redirect button
appears instead and works as before.

- Google Cloud → Credentials → the web client → **Authorised JavaScript origins**:
  https://solventia.in, https://www.solventia.in, http://localhost:8083 — **done by you.**
- Google Cloud → OAuth consent screen → **Branding** (app name Solventia, logo icon-512.png,
  home page, privacy and terms links, authorised domain solventia.in) — **verified and
  published by you.**
- Nothing to change in Supabase: the token's audience is the Google provider's own client ID,
  which Supabase accepts by default. (Only if Supabase ever answers "Unacceptable audience":
  Supabase → Authentication → Providers → Google → add the same client ID to
  "Authorized Client IDs".)

**Test it yourself** (any Google account; a private window shows the full first-time flow):
1. Open https://solventia.in/consultation in a private window and answer every question.
2. On the last step ("Create your account"), the white pill **Continue with Google** button is
   Google's own: click it. Google's popup says **"to continue to Solventia"**; choose an account.
3. You land on "Finding your strongest directions" (/consultation?submit=1), then on your three
   directions on the dashboard — never an empty dashboard.
4. One Tap: on https://solventia.in/sign-in, if your browser is signed in to Google, Google's
   small "Sign in as …" prompt appears at the top right; it signs you in the same way.
5. Fallback: with an ad blocker that blocks accounts.google.com (or uBlock "block 3rd-party
   scripts"), the sign-in page shows our own Continue with Google button; it goes through the old
   redirect and still ends on the same pages.

## Live since 2026-11-16 — and how to roll back

`redesign-v2` was merged into `main` (merge d5d1511, `--no-ff`) and pushed: Vercel deploys
solventia.in from `main`. The previous production code is tagged `before-live-2026-11-16`.
From now on work happens directly on `main`.

To roll back, either:
1. **Fastest (no code):** Vercel → the production project → Deployments → the last deployment
   before d5d1511 → ⋯ → **Promote to Production**. Takes seconds; `main` stays as it is.
2. **In git:** `git revert -m 1 d5d1511` on `main` and push. This adds a commit that undoes
   the merge; nothing is rewritten. (To bring the redesign back later, revert that revert.)

The database migrations are additive: rolling the code back does not need them undone.

## Go live, 2026-11-16: what changed, the numbers, your steps

### What changed today (all on `main`, live on solventia.in)
1. **Opening:** "What brings you here?" (first visit), one line for your earlier choice (returning), "Welcome back, {name}." with Go to my dashboard (signed in), then the Solventia reveal on the film's real lockup. Six frames: `docs/redesign/perf/reveal-*.png`.
2. **Live:** `redesign-v2` merged into `main` (d5d1511). Restore tag `before-live-2026-11-16`.
3. **Roadmap:** week 1 is fast and reliable, the wait shows real progress, and Vercel `maxDuration` is set to 300 s.
4. **Idea generation:** cheaper and faster. A ₹ estimate is logged on every AI call, and there are daily limits per founder.
5. **Hindi and plain words:** one style rule per language for every AI call and the translator; a test enforces it; 38 UI strings were rewritten.
6. **Dashboard:** wider frame (up to 1520 px), no tab flash, 44 px tap targets, and `npm run scan` (90 pages, 0 findings).
7. **"How it works"** appears once per menu. The silver S on lite devices was skipped (decisions 47).

### The roadmap: cause and fix (decisions 43)
- **Not the cause:** the model call. The one allowed real run succeeded (skeleton 13.8 s + week 1 18.1 s = 32 s).
- **What failed:**
  - "Couldn't be prepared" is stored only when week 1's answer fails the strict format twice. Examples: a fifth step, 25 list rows, a quiz answer of 3.
  - Each miss doubles the wait, which is the "over a minute".
- **Fix:**
  - Low thinking on both calls.
  - The answer is repaired before checking: bounded fields are clamped and trimmed, never invented.
  - The retry quotes the error back. If that also fails, a much simpler prompt runs.
  - "Try again" redoes only that week.
- **The real error text** is in `roadmap_weeks.generation_error`. If it happens again, run `select generation_error from roadmap_weeks where generation_status = 'failed' order by updated_at desc limit 5;`.
- **Week 1 in ≤ 25 s** is an estimate from the measured token rate. It was not re-measured, to stay within the one allowed real run.

### Cost and time, before → after (real model, same founder profile)

| | Seconds | Input tokens | Output + thinking tokens |
|---|---|---|---|
| Consultation (v1, the default) | 35.5 → **20.4** | 4,950 → 4,950 | 7,450 → **3,649** |
| Consultation (v2, not the default) | 76.2 → 57.3 | 5,292 → 7,711 | 18,135 → 12,237 |
| Roadmap build, before (skeleton + week 1) | 31.9 | 5,335 | 6,432 |

- **Roadmap after:** estimated ≤ 25 s, with most of the 4.3k thinking tokens gone. Not re-measured.
- **₹ per call** = (input × `GEMINI_PRICE_IN` + (output + thinking) × `GEMINI_PRICE_OUT`) ÷ 1,000,000, with prices in ₹ per 1M tokens. Once you set the two prices in Vercel, every `GEMINI_CALL` log line shows `estCostInr`. No ₹ figure is given here because I don't want to guess this model's price.
- **v2 stays off.** It missed both bars (≤ 45 s, ≤ v1's 12.4k tokens), so `IDEA_ENGINE` stays `v1` (decisions 44).

### Daily limits per founder (reset at midnight India time)

| What | Default | Vercel variable |
|---|---|---|
| Consultations | 3 | `DAILY_LIMIT_CONSULTATIONS` |
| Roadmap builds and rebuilds | 5 | `DAILY_LIMIT_ROADMAPS` |
| Ask Sol messages | 30 | `DAILY_LIMIT_ASK_SOL` |

- `0` means no limit.
- At the limit, each screen says so in plain words ("…you can start a new one after midnight").
- A counting error never blocks anyone.

### Your steps, in this order
1. **Supabase → Authentication → URL Configuration → Redirect URLs.** Add `https://solventia.in/**` and `https://www.solventia.in/**`; keep the Site URL `https://solventia.in`. (Details in the next section.)
2. **Apply the migrations 0015 → 0020** in `supabase/migrations/`, in order, in the Supabase SQL editor. All are additive. The site works without them but hides the features that need them.
3. **Vercel → Settings → Environment Variables (Production), then redeploy:**
   - `GEMINI_PRICE_IN` and `GEMINI_PRICE_OUT`: your Gemini prices, in ₹ per 1M tokens.
   - `DAILY_LIMIT_CONSULTATIONS`, `DAILY_LIMIT_ROADMAPS`, `DAILY_LIMIT_ASK_SOL`: only to change the defaults above.
   - Optional: `GEMINI_LITE_MODEL`, a cheaper model for Ask Sol and translation.
4. **Google Cloud → Billing → Budgets & alerts:** a monthly budget on the Gemini project, with alerts at 50 / 90 / 100 %.
5. **CA review** of the "Make it official" guide (`/dashboard/roadmap/official`) before founders rely on it.
6. **Google Search Console:** add solventia.in, then submit `https://solventia.in/sitemap.xml`.

## Before anything else: sign-in configuration to check (Google bug, 2026-11-16)
The "Continue with Google → empty dashboard" bug had causes in code (fixed on this branch — see
"Sign-in fix" below) and very likely one in configuration. Please make these exact:
- **Supabase → Authentication → URL Configuration**
  - Site URL: `https://solventia.in`
  - Redirect URLs (add all): `https://solventia.in/**`, `https://www.solventia.in/**`,
    `https://*-solventia.vercel.app/**` (previews), `http://localhost:8083/**` (local dev)
- **Google Cloud → APIs & Services → Credentials → the OAuth 2.0 Web client used by Supabase**
  - Authorised JavaScript origins: `https://solventia.in`, `https://www.solventia.in`
  - Authorised redirect URI: the Supabase project callback,
    `https://<project-ref>.supabase.co/auth/v1/callback` (the host is the Project URL in
    Supabase → Settings → API). The app's own `/auth/callback` does not go here.

Branch `redesign-v2` (pushed; not merged to `main`). Restore point: tag `before-redesign-v2`
(production `49d3ead`). Day-by-day status: `PROGRESS.md`; every judgement call: `decisions.md`
(1–41); what needs the owner: `blocked.md`. Final checks: see "Final verification" below.

## What was done

| Part | What | Main commits |
|---|---|---|
| 0 Setup | branch, restore tag, standing rules in CLAUDE.md | — |
| 1 Brand, SEO, Google sign-in | brand lockup everywhere, og:image, titles/descriptions, Google auth checklist (`docs/google-auth-owner-checklist.md`) | plan-1.md |
| 2 Cinematic | mode decided once; three tiers (full / lite / still); adaptive quality; main-thread fixes; scene audit | 41da42b, bda4461, 4d1cd9e, c358578 |
| 3 Dashboard redesign | tokens, shell, Today (five states), Directions, Roadmap, mission page, Proof, Building / History / Settings, Hindi + 390 px | 24dcf02 … 91a105f (4641294 also carries the `$id` route file move) |
| 4 Working features | mission workspaces + done rules; proof that updates itself; Stuck? + failed check; interview scripts; ask what is missing; estimates and sources; Make it official (unreviewed content held back); weekly reminder; plain words; drop-off admin page | 5a28c90, 3c338b4, f6c2d68, 60839a6, a9156eb, 6fd2e75, 18e1e34, 59d875b, ea15552, 21578f4 |
| Opening | "What brings you here?" (first visit), "Welcome back." (returning, with "Go to my dashboard" when signed in), a live lockup while the world loads, Skip, 8 s still-version rule | 758ba9f, 7499fe6 |
| 3D ready faster | measured by stage, then: shader batches, environment off the critical path, geometry 3 groups/frame, bundle preloaded in `<head>`; lite skips the studio environment | 68fe040, 505715b |
| Film | dashboard scene = the new Today screen; S-mark confirmed | c2d9b90, 3a6e7e7 |
| 5 Idea engine | audit; better inputs (afford-to-lose, reach this week, days, help asked for, contradictions); staged pipeline v2 with code checks; week 1 free of money/registration/website; generation record; 10-profile comparison | 29466d1, 361dad0, b87504b, 639076c, c0361a4, fee1363, 686a833 |
| Brand | favicons from the original logo (only icons), manifest, Organization logo | 505dca1 |
| Search | /ideas, /for-founders, /faq; "<Page> — Solventia" titles, one H1, canonical, breadcrumbs; footer links on every page; home summary; JSON-LD; sitemap + robots | ad3df89 |

## The opening and the 3D world — numbers (local production build, lite, Vega 3 class)

Fresh browser per run (true first visit). `scripts/verify-intro.mjs`, `scripts/film-ready.mjs`;
detail in `part2-perf.md` 2d and 2e.

| | Before | After |
|---|---|---|
| Load → data-ready, broadband (with the opening) | 7.7 s | 4.5 s |
| Lockup hold after the opening, broadband | 2.6 s | none (95 ms in one run) |
| Load → data-ready, 4× CPU (with the opening) | 9.2 s | 7.1 s |
| Lockup hold, 4× CPU | 2.3 s | 0.9 s |
| Long tasks in the film after release (broadband / 4×) | 0 / 9 | 0 / 0 |
| p95 frame time (broadband / 4×) | — | 16.9 / 33.4 ms |
| Mode switch after release | — | never |
| Returning visit: load → film released / world ready | — | 4.2–5.2 s / 3.8–4.7 s |

Checks passing locally: reduced motion (question → still version, no collapse), 390 px (question →
still version, no sideways scroll), returning visit (welcome, no question), mid-page reload (no
opening, no hold, place kept), all 21 scenes with the S-mark and the new dashboard scene.

**Not yet run on the Vercel preview**: both preview URLs are behind Vercel's login. With the
owner's "Protection Bypass for Automation" token:
`VERCEL_BYPASS=… node scripts/verify-intro.mjs https://solventia10-git-redesign-v2-solventia.vercel.app preview`
and `VERCEL_BYPASS=… node scripts/film-scenes.mjs "https://…/cinematic?tier=lite&freeze=1" docs/redesign/perf/scenes/preview`.

Trade-off to decide: lite no longer builds the studio environment (that is what removed the
hold). On lite the S reads as dark graphite instead of silver; full is unchanged. One line
(`studioEnvironment: true` for lite in `performance/quality.ts`) restores it, at ~+1.4 s cold.

Open: in 2 of 4 local runs at 4× CPU the world was not ready 8 s after the lockup and the visit
got the still version (by design); a probe with the same tap was ready at 6.7 s.

## Idea engine — old vs new (`docs/redesign/engine-compare.md`, real model, 10 profiles)

| Share of directions passing | v1 (today) | v2 |
|---|---|---|
| specific to the place | 67% | 57% |
| startable within a week | 87% | 83% |
| numbers reach the income target within their hours (checked in code) | 10% | 100% |
| every fit reason quotes the profile | 33% | 43% |
| no unlabelled market facts | 100% | 100% |
| **all five** | **3%** | **23%** |
| time / tokens per consultation | 31 s / 11.5k | 77 s / 24.6k |

v2 scored higher on 8 of 10 profiles and equal on the other 2 (P04, P07); never lower.

**Recommendation: switch to v2 (`IDEA_ENGINE=v2`)** — it is the only one whose money is checked
against the founder's target and hours, it drops hard-limit breakers and fatally flawed ideas
before they are shown, and it scores 23% vs 3% on all five checks; the price is ~2.5× the time
(77 s, still inside the existing progress screen) and ~2× the tokens.

## Still not done
- The preview verification (needs the bypass token, above).
- Make it official content: drafted, held back as "Being reviewed" until a CA review.
- A consultation's generation still runs inside the request (no leave-and-come-back for the
  first analysis; roadmaps already build in the background).
- Per-consultation search grounding (Market research stays on demand).
- "Place" and "quoted" checks in v2 are still under 60%: the next prompt round should make the
  writer name the town in customer/offer and quote the founder's answers in "why this fits".
- The ~267 ms frame per pass and the 4× variance (blocked.md / part2-perf.md).
- Hindi for the film's own copy (the film is English; the openings and pages are bilingual).
- The economics tab strings still say "assumption" (the component is not rendered).

## Migrations (apply in order, in Supabase)
`0015_mission_workspaces` → `0016_proof_rules` → `0017_stuck_and_reminders` → `0018_number_kinds`
→ `0019_admin_flag` → `0020_generation_record`. All additive; every feature checks its schema and
keeps today's behaviour until its migration is applied.

## Owner-only steps, in order
1. **Supabase:** apply migrations 0015–0020 in order (above).
2. **Vercel env vars (Production):** `CRON_SECRET` (16+ random characters) and
   `SUPABASE_SERVICE_ROLE_KEY` for the weekly reminder (`RESEND_API_KEY` already set);
   `IDEA_ENGINE=v2` if you accept the recommendation above.
3. **CA review of `src/content/make-official.ts`:** check each step against the cited official
   page, then set `reviewed: true` and `lastChecked` per step (and on `MINOR_NOTE`).
4. **Google branding verification** for the sign-in consent screen
   (`docs/google-auth-owner-checklist.md`).
5. **Search Console:** submit `https://solventia.in/sitemap.xml`; request indexing for /, /how-it-works,
   /ideas, /for-founders, /about, /faq.
6. **Fill in LinkedIn and Instagram** in the Organization `sameAs` (`src/routes/index.tsx`, TODO).
7. **Delete the duplicate Vercel project:** this repo deploys to two projects in team `solventia` —
   `solventia10` and `solventa-ai-launchpad`. Keep the one that serves solventia.in (check
   Settings → Domains); delete the other.
8. **Merge `redesign-v2` into `main`** after review (and after step 1, so production has the
   schema the new code reads).

Optional: make a profile admin for the drop-off page —
`update public.profiles set is_admin = true where email = '<your email>';`

## Final verification (2026-11-16, local)
- Typecheck: pass. Unit tests: 58 files, 460 tests, all pass. Production build (Vercel preset): pass.
- E2E: 182 tests — 178 passed on the full run; the 4 failures were fixed and their 4 specs
  re-run (51/51 pass): two tests still described pre-redesign behaviour (Start mission opens the
  mission page; "No time this week" moves the week) and the consultation bar overflowed at 360 px
  (fixed: tighter bar, the stage indicator hidden below 380 px). Known flaky under load: the
  cinematic "live sound" test (decisions 40).
- Screenshots of every dashboard page at 390 and 1440: `docs/redesign/screens/{390,1440}/`.
