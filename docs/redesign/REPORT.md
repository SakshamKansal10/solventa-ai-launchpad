# Solventia redesign v2 — report

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
