# Solventia redesign — status

Checkpoint file for the master redesign. Updated after every phase. No secrets, tokens or user data here.

## Branches

| Role | Branch | Commit |
|---|---|---|
| Implementation | `feature/solventia-master-redesign` | see `git log -1` |
| Backup of production before the redesign | `backup/pre-solventia-redesign-20261020` | `62e8e3c` |
| Production (Vercel deploys from it; Lovable-connected) | `main` | `62e8e3c` at start |
| Earlier unreviewed Founder OS WIP (not in main, kept) | `founder-os-wip` | `eb36f77` |

The implementation branch was cut from production `main` (`62e8e3c`), which already contains the
homepage release (`4c5bbc8`) and the merged dashboard work (PR #1 and PR #2).

To return to the previous implementation: `git switch backup/pre-solventia-redesign-20261020`.

## Brief

- Master brief + addendum pasted 2026-10-20. **The master brief arrived truncated at about 50,000
  characters — it stops in section 11.3 ("Every ext…").** Sections after 11.3 (roadmap, evidence,
  Ask Sol, history, settings, homepage bugs, icons, Google branding, testing, release) were not
  received. Until the rest is provided, those areas follow the addendum's scope list only.
- The user's brief supersedes `CLAUDE.md`'s old "violet/lavender, warm ivory" palette rule; that
  rule is updated as part of the design-system phase.

## Brief, sections 12–28 (received 2026-10-21; again truncated inside the §28 checklist)

Compact checklist — resume from this, not from the conversation:
- §12 Roadmap: VALIDATE → BUILD → ELEVATE; first missions test demand and the riskiest assumptions (buyer, buying process, willingness to consider, then supplier feasibility, then a continue/revise/reconsider gate). No hard-coded sequence, no arbitrary volume targets, future phases provisional. Week load ≤ lower bound of stated hours minus ~15%. Budget ranges stay ranges. Missions: title, why, time, steps, output, done-when, linked assumptions, what the result means. One recommended mission at a time; statuses Ready / In progress / Waiting for evidence / Completed / Needs revision. Replace the 3D floating-island roadmap with a light SVG/HTML VALIDATE → BUILD → ELEVATE path (all phases readable, current/completed/provisional, mobile-legible).
- §13 Generation screen: trace the real lifecycle; progress % only for real stages, else honest indeterminate stages; never "saved" before save; "Building your roadmap" (no serif); timeouts, retries, idempotent clicks, resume an existing roadmap.
- §14 Proof → "Evidence" (keep /dashboard/proof working; tab=evidence). Assumption model: id, direction, statement, category, why it matters, test method, mission ids, evidence ids, status (Not tested / Testing / Supported / Contradicted / Inconclusive), updated, next action. Evidence recordable from week 1; completing a mission never validates by itself; assumption ↔ mission links both ways; low-friction evidence entry; negative results are fine.
- §15 Real adaptation: "Your roadmap has changed" with what/why/evidence/new next action, only when the plan really changed; keep history.
- §16 Notifications: correct user/consultation/direction/roadmap; "roadmap ready" only after a successful save; no success on failure; no duplicates; correct links; unread from real state; preferences; language.
- §17 Ask Sol: designed panel (emblem, tokens), instant shell, contextual welcome "Let's work on your next move.", real contextual prompts, no invented facts, desktop overlay / mobile sheet, recovery state.
- §18 History: editorial timeline (consultation, directions, chosen, roadmap built, outcome, what changed), compare consultations only from stored data, safe review/delete.
- §19 Settings: editable name with real save state; photo truth ("Using your initials"); founder profile rows "Not provided yet", no truncation, recalculation notice; language everywhere; preferences and account actions real.
- §20 Homepage: brand on first frame; scroll sync; ONE identity (centre → bar → centre at finale → bar), never two lockups at once; no clipped logo; semantic profile icons (education, time, location, money, skills, experience, languages, risk) in one icon family; no purple.
- §21 Google sign-in shows the Supabase hostname — external config (Google OAuth consent screen app name/logo/authorized domains; Supabase custom auth domain). Fix code-side, report exact external steps, mark blocked until verified.
- §22 Copy: Customer / Problem to solve / Your offer / Revenue model / First validation test; "Market evidence hasn't been collected yet."; "Your roadmap hasn't been built yet."; Evidence not Proof; consistent sentence case.
- §23 Remove duplication and clutter at the IA level. §24 Viewports 360/390/430/1280/1366/1440/1920/3840, WCAG 2.2 AA, reduced motion. §25 Measure before/after. §26 Tests for data, roadmap, evidence, flows, homepage, auth. §27 Phase order. §28 Report every checklist item's real status.

## Phases

| # | Phase | State |
|---|---|---|
| 0 | Branches, backup, this file | done |
| 1 | Data integrity: provenance, ranges as ranges, unknown ≠ absent, no invented facts | done (fe85c11) — typed provenance per claim still to add with Phase 3 schema work |
| 2 | One canonical fit model (5 factors, 0–3, unknown = null, coverage, bands) used everywhere | done (ce19fd4) |
| 3 | AI direction generation: structured, distinct, plain language, hypotheses labelled | not started |
| 4 | Design system: pearl/graphite/navy/cobalt/champagne tokens, type scale, components; purple removed | not started |
| 5 | Command Center (state-aware: before choice / chosen, no roadmap / roadmap) | not started |
| 6 | Opportunities + direction detail (Overview / Fit with you / Market & validation) | not started |
| 7 | Roadmap logic + generation states + Evidence + adaptation + notifications + Ask Sol + History + Settings + homepage + copy (§12–22) | in progress |
| 8 | Tests, build, release to `main`, verify https://solventia.in | not started |

## In progress

Phase 4 (design system).

## Done so far

- `src/lib/fit/model.ts` — the only fit function; stored in `opportunities.score_breakdown` with `rubricVersion`; `fit_score` = its score (ordering only).
- Old `fitClass` and `src/lib/fit/matrix.ts` removed; every screen, filter, compare grid and email reads the canonical label.
- Profile keeps stated ranges (`time.weeklyHoursRange`, capital tier → range) and `v2.accessNone`.
- Prompts (`src/lib/ai/prompts/shared.ts`) give ranges + truthfulness rules; roadmap prompts plan at the lower end, named as an assumption.
- `src/lib/ai/integrity.ts` drops unsupported personal reasons before display.

## Tests

- `npm run typecheck`: pass. `vitest`: 42 files, 384 tests pass (fe85c11).
- E2E not yet run on this branch (fit rows changed: `fit-row-ambition` → five factor rows; specs may need updating).

## Deployment

Not deployed. Production is unchanged.

## Next action

§12: demand-first roadmap prompt + hours budget; then §14 Evidence naming and assumption links; then §20 homepage identity; then §16 notifications. Run the rest of the E2E suite (buttons, roadmap, history, settings, auth, hindi, a11y, visual) after those.
