# Redesign v2 — progress

Resume from here. Branch: `redesign-v2`. Restore point: tag `before-redesign-v2` (= production `49d3ead`).
Briefs: `docs/redesign/briefs/`. Plans: `docs/redesign/plan-<n>.md`. Decisions: `decisions.md`.
Blockers: `blocked.md`. Final report: `REPORT.md`.

## Part 0 — setup
- [x] git status checked (only the untracked redesign kit; not committed)
- [x] tag `before-redesign-v2` on production `origin/main` 49d3ead
- [x] branch `redesign-v2` from that commit
- [x] `design-reference/solventia-dashboard-reference.html` placed
- [x] CLAUDE.md standing rules
- [x] commit + push branch and tag

## Part 1 — brand, SEO, Google sign-in (scope narrowed by the owner, see decisions 6)
- [x] plan-1.md + audit
- [x] dashboard shell uses BrandLockup (old PNG mark + hardcoded wordmark removed)
- [x] signature kept on every lockup: consultation, building screen, film product preview, phone bar
- [x] home WebSite JSON-LD alternateName ["Solventia.in"]; home title under 60 chars
- [x] canonical on /consultation (every other public page already had one)
- [x] 1200×630 og:image (public/og-image.png) site-wide; twitter summary_large_image
- [x] "Page | Solventia" titles + descriptions on every page
- [x] docs/google-auth-owner-checklist.md
- [—] not rebuilt (already correct per owner): brand system, favicons, manifest, sitemap, robots, 404
- [—] not in scope: GIS button, /find-my-business-idea redirect; Proof rename → part 3

## Part 2 — cinematic intro
- [x] diagnosis (plan-2.md)
- [x] mode decided once; no mid-scroll swap (41da42b)
- [x] performance fixes: one loop, dpr ≤ 1.5, sound off until asked (0da3503)
- [x] proof: docs/redesign/part2-perf.md; cinematic + public e2e 27/27

## Part 2b — cinematic performance (owner follow-up, 2026-11-15)
- [x] measurement tool scripts/film-perf.mjs + baseline (80bcdc6)
- [x] 1 three tiers full / lite / fallback (bda4461)
- [x] 2 adaptive quality notches; R3F delta fix (4d1cd9e)
- [x] 3 main thread: filament layout read (afa640f), veils/tone (2d085bc), frame-loop layout reads (dca0457), idle cue animation (4a2b569), geometry warm-up + notch DPR (2623dcd), dedicated instanced materials (f252612), hidden overlay content-visibility + allocations (c7913ae)
- [x] 4 audit, numbers and proposals: part2-perf.md "Part 2b" (targets met on the Vega 3: p95 16.8 ms, 0 long tasks unthrottled, 2–4 at 4×)
- [x] cinematic + public e2e on the new tiers (28/28)

## Part 2c — cinematic bounded pass (owner decisions, 2026-11-15)
- [x] A: adaptive sampling while the story moves; notch ≤ 2, never up, no visible hitch (c358578)
- [x] 2: lite gate parts 16 sweep segments (implemented as one bevel segment — decisions 18; cb04ee3)
- [x] missing graphics: 21 scenes live (49d3ead) vs HEAD lite, diff, fix, record (docs/redesign/perf/scenes/) — none missing at 1440 on the Vega 3; laptop report in blocked.md
- [x] re-measure (lite, notch not pinned) and record — p95 17.0/16.9 ms, 0 long tasks; 4×: 0 long tasks

## Part 3 — dashboard redesign
- [x] plan-3.md file map
- [x] 1 tokens and base components (24dcf02)
- [x] 2 app shell (top bar, phone bottom bar, avatar menu, Ask Sol trigger) (622a3a2)
- [x] 3 JourneyArc + fit bar (1ff6f82)
- [x] 4 Today (five states) (4641294)
- [x] 5 Directions + Direction detail + two sub-pages (e8aa6ab)
- [x] 6 Roadmap + mission page shell (b7f0cdd)
- [x] 7 Proof (b137110)
- [x] 8 Building, History, Settings (4fe908b)
- [x] 9 Hindi + 390px pass (91a105f)

## Part 4 — working features
- [x] plan-4.md data model
- [x] 1 mission workspaces + done rules (5a28c90)
- [x] 2 proof that updates itself (3c338b4)
- [x] 3 Stuck? + failed check (f6c2d68)
- [x] 4 scripts and message templates (60839a6)
- [x] 5 ask what is missing (a9156eb)
- [x] 6 estimates and sources (6fd2e75 — code landed under the tick message, see decisions 29)
- [x] 7 Make it official guide (18e1e34)
- [x] 8 weekly reminder (59d875b)
- [x] 9 plain words (ea15552)
- [x] 10 drop-off admin page (21578f4)

## Part 5 — idea engine
- [x] plan-5.md audit (29466d1)
- [x] 2 better inputs (361dad0)
- [x] 3 staged pipeline (b87504b)
- [x] 4 executable roadmaps (639076c)
- [x] 5 reliability (c0361a4)
- [x] 6 10-profile comparison + command (686a833)

## Owner follow-up (2026-11-15) — in this order
- [x] 0 finish the current feature (ea15552)
- [x] 1 opening: "What brings you here?" (758ba9f)
- [x] 2 3D ready faster (measure, then fix) (68fe040)
- [x] 3 film: the new Today screen as the dashboard scene (c2d9b90)
- [x] 4 S-mark scene check (3a6e7e7)
- [x] 5a part 4 feature 10 drop-off admin page (21578f4)
- [x] 5b part 5 idea engine (all steps, 10-profile comparison) (686a833)
- [~] 6 final verification — done locally; the preview needs the owner's VERCEL_BYPASS token (REPORT.md)
- [x] 7 REPORT.md

## Final
- [x] REPORT.md

## Owner message 2026-11-16 — status
- [x] 1 saved the uncommitted work (fee1363 engine fixes, 686a833 comparison, 7499fe6 returning opening, 5816ada verify script)
- [x] 2 engine decided from the results: v2 clearly better on "all five" (23% vs 3%); IDEA_ENGINE stays v1 by default
- [x] 3 no hang (505715b): broadband hold 2.6 s → none; preview run needs the owner's VERCEL_BYPASS token
- [x] 4 favicons from the owner's logo (505dca1)
- [x] 5 site name and sitelinks (ad3df89)
- [x] 6 final check: typecheck, 460 unit, build, e2e 178 + the 4 fixed (51/51 on re-run)
- [x] REPORT.md

## Go live — 2026-11-16 (owner: live on solventia.in today)
- [x] L1 opening (87b3f9a): the Solventia reveal on the real lockup, signed-in / returning variants
- [x] L2 live (f663c9c): tag before-live-2026-11-16, redesign-v2 merged into main
- [x] L3 roadmap (c6b3e1b): week 1 fast and reliable
- [x] L4 cost (9701b38) and speed of idea generation, daily limits
- [x] L5 Hindi (dfce5f6) for everything, simpler words
- [x] L6 dashboard (c3f0fc1): width, tab flash, npm run scan, mobile
- [x] L7 small (d4d5b1b) items: one "How it works", silver S on lite
- [x] L8 final (dbbab6c) check and REPORT.md
  - L8 next (exact): `npm run typecheck`; `npx vitest run`; `npm run build`; stop the review
    server (`touch .e2e-tmp/compare/stop`), full `npx playwright test` once; restart the review
    server and `npm run scan`; then REPORT.md "Go live 2026-11-16" section (changes, roadmap
    cause + fix = decisions 43, cost before/after = decisions 44, daily limits, owner steps
    1–6) and push main.

## Owner jobs — 2026-11-16 (work directly on `main`, live on solventia.in)
- [x] Job D — done (owner confirmed)
- [x] Job C Google shows "Solventia" (d557047): Google's own button + One Tap on our origin,
  redirect fallback; owner steps in REPORT.md (origins + branding already done by the owner); decisions 53
- [x] Job E emails
  - [x] deep links to the exact page, signed-out → /sign-in?next= → that page (db02015); decisions 54
  - [x] one address sol@solventia.in everywhere; reply-to sol@solventia.in since forwarding went
    live (2026-11-17, decision 58)
  - [x] status + SMTP/DNS owner steps in REPORT.md (27f419d)
  - [x] one layout from email-kit/ for every app email, en + hi (66cd4e0); logo live at
    https://solventia.in/brand/email-logo.png; 8 test sends accepted by Resend; screenshots
    600/375 light/dark (e9f4c69); Supabase templates in docs/redesign/email/supabase; decision 55
  - [x] owner: Email OTP Expiration 3600 s confirmed, custom SMTP (Resend) on (2026-11-17)
  - [x] owner: forwarding MX + one SPF on `@` for sol@solventia.in (ImprovMX, 2026-11-17)


## Owner jobs — 2026-11-17
- [x] email-kit extracted to the project root (email-kit/, identical to the copy used for Job E)
- [x] Job F iPhone email links (b7ad248): root cause = the site's CSS/JS refused (Vercel firewall
  challenge the Gmail in-app browser cannot pass) → raw HTML; load fallback panel in the server
  HTML, iOS 15 build target + polyfills, npm run check:ios15, e2e/ios-deeplink.spec.ts (WebKit);
  decision 56
- [x] Job G dashboard width: padding 5vw − 32px from 1024px (32/46/64 at 1280/1568/1920), content
  cap 1792px, phone unchanged; e2e/dash-width.spec.ts; before/after in docs/redesign/perf/width
- [x] owner, all done 2026-11-17: Vercel Firewall bypass rule `^/(assets|brand|film)/`; the 4
  Supabase templates pasted with their subjects and verified; OTP expiry 3600 s; custom SMTP via
  Resend from sol@solventia.in on; ImprovMX forwarding verified; a Google account for
  sol@solventia.in exists (S logo as its picture)
- [ ] owner (optional): make that Google account an Owner of the Google Cloud project and set it as
  the consent screen's support email (docs/google-auth-owner-checklist.md)
- [x] Job H cinematic on every device (157dac5): live / recorded / reduced paths, never the boxed
  still version; recorded film phone 1.34 MB, desktop 4.48 MB; ?film=debug; decision 57
- [x] Reply-to sol@solventia.in (ImprovMX forwarding live): one address for sender, reply-to,
  site, legal pages and emails, src/lib/contact.ts; guards contact.test.ts +
  e2e/contact-address.spec.ts; decision 58

## Owner jobs I–N, 2026-11-17 (evening)
- [x] Job I page opens (14b6be5, 828b29c): functions in bom1 next to Supabase; direction summary
  at once; hover preload; no AI on open; e2e/open-speed.spec.ts; docs/redesign/perf/open-times.md
- [x] Job J skills chips + one levels step (19f6d2d); e2e/skills-pick.spec.ts
- [x] Job K "a minute or two" (7af0b40)
- [x] Job N "Find 3 more directions" screen + one generation per founder (de04c41); migration 0021
- [x] Job M Ask Sol new facts → "Find new directions" (52fa85b)
- [x] Job L headers never overlap 320–430 en/hi (b7a6062); "Sol" untranslatable (6a0713a); scan
  extended (1920, direction pages, mission) — 174 pages, 0 findings; dashboard walk spec
- [x] owner: migration 0021_generation_jobs.sql is applied in production (both tables answer, 2026-11-17)
- [ ] owner decision: after Ask Sol's "Find new directions" with a roadmap, Today shows the new
  options (roadmap kept, reachable via History → Restore) — or keep the roadmap on Today?
