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
| 1 | Data integrity: provenance, ranges as ranges, unknown ≠ absent, no invented facts | not started |
| 2 | One canonical fit model (5 factors, 0–3, unknown = null, coverage, bands) used everywhere | not started |
| 3 | AI direction generation: structured, distinct, plain language, hypotheses labelled | not started |
| 4 | Design system: pearl/graphite/navy/cobalt/champagne tokens, type scale, components; purple removed | not started |
| 5 | Command Center (state-aware: before choice / chosen, no roadmap / roadmap) | not started |
| 6 | Opportunities + direction detail (Overview / Fit with you / Market & validation) | not started |
| 7 | Remaining scope (roadmap, evidence, Ask Sol, history, settings, homepage, icons, Google) — needs the rest of the brief | blocked on brief |
| 8 | Tests, build, release to `main`, verify https://solventia.in | not started |

## In progress

Phase 1–2: reading the profile, fit and AI-schema code.

## Tests

None run yet on this branch.

## Deployment

Not deployed. Production is unchanged.

## Next action

Read `src/lib/fit`, `src/lib/direction.ts`, `src/lib/ai/schemas.ts` and
`src/lib/ai/prompts/intelligence-package.ts`; implement the canonical fit model (Phase 2) with tests.
