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

## Part 1 — brand, SEO, Google sign-in
- [ ] plan-1.md + audit
- [ ] A. one Logo component everywhere
- [ ] B. favicon and app icons from the mark; manifest
- [ ] C. site name for Google: WebSite JSON-LD, og:site_name, titles, canonical, OG image
- [ ] D. sub-link eligibility: SSR content, plain links, one consultation route, sitemap, robots, noindex
- [ ] E. Google Identity Services + signInWithIdToken; privacy/terms; owner checklist doc
- [ ] F. other inconsistencies (Proof naming, header buttons, lang, footer year, dead links, 404)

## Part 2 — cinematic intro
- [ ] diagnosis (plan-2.md)
- [ ] mode decided once; no mid-scroll swap
- [ ] performance fixes
- [ ] proof (perf numbers)

## Part 3 — dashboard redesign
- [ ] plan-3.md file map
- [ ] 1 tokens and base components
- [ ] 2 app shell (top bar, phone bottom bar, avatar menu, Ask Sol trigger)
- [ ] 3 JourneyArc + fit bar
- [ ] 4 Today (five states)
- [ ] 5 Directions + Direction detail + two sub-pages
- [ ] 6 Roadmap + mission page shell
- [ ] 7 Proof
- [ ] 8 Building, History, Settings
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
