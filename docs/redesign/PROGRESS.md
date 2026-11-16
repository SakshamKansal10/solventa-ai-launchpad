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
- [ ] L3 roadmap: week 1 fast and reliable
- [ ] L4 cost and speed of idea generation, daily limits
- [ ] L5 Hindi for everything, simpler words
- [ ] L6 dashboard: width, tab flash, npm run scan, mobile
- [ ] L7 small items: one "How it works", silver S on lite
- [ ] L8 final check and REPORT.md
