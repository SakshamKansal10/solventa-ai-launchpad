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
- [ ] 9 Hindi + 390px pass

## Part 4 — working features
- [ ] plan-4.md data model
- [ ] 1 mission workspaces + done rules
- [ ] 2 proof that updates itself
- [ ] 3 Stuck? + failed check
- [ ] 4 scripts and message templates
- [ ] 5 ask what is missing
- [ ] 6 estimates and sources
- [ ] 7 Make it official guide
- [ ] 8 weekly reminder
- [ ] 9 plain words
- [ ] 10 drop-off admin page

## Part 5 — idea engine
- [ ] plan-5.md audit
- [ ] 2 better inputs
- [ ] 3 staged pipeline
- [ ] 4 executable roadmaps
- [ ] 5 reliability
- [ ] 6 10-profile comparison + command

## Final
- [ ] REPORT.md
