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
| 7 | Remaining scope (roadmap, evidence, Ask Sol, history, settings, homepage, icons, Google) — needs the rest of the brief | blocked on brief |
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

Phase 4: add pearl/graphite/navy/cobalt/champagne tokens in `src/styles.css`, replace `sol-violet*` usage with cobalt across `src/components/founder`, `src/routes/dashboard`, `src/components/consultation`; move dashboard headings off the serif; update `CLAUDE.md` design rules. Then run E2E for opportunities/proof/command-center.
