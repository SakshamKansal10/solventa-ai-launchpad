# Solventia redesign — status

Checkpoint for the master redesign. Updated after every milestone. No secrets, tokens or user
data here. Specification: `SOLVENTIA_MASTER_PROMPT.md` (reconstructed — the original brief
arrived truncated twice; nothing here claims to be its verbatim text).

## Branches

| Role                                                                              | Branch                                   | Commit                                 |
| --------------------------------------------------------------------------------- | ---------------------------------------- | -------------------------------------- |
| Implementation                                                                    | `feature/solventia-master-redesign`      | see `git log -1` (85fe2b1 at QA close) |
| Backup of production before the redesign                                          | `backup/pre-solventia-redesign-20261020` | `62e8e3c`                              |
| Production (Vercel project `solventa-ai-launchpad` deploys it; Lovable-connected) | `main`                                   | `62e8e3c` before release               |
| Earlier unreviewed Founder OS WIP (not in main, kept)                             | `founder-os-wip`                         | `eb36f77`                              |

Cut from production `main` (`62e8e3c`, which holds the homepage release and Anushka Shah's
PR #1/#2). `main` had no newer commits from anyone when the release was prepared, so the
branch integrates without conflicts and overwrites nobody's work.

Recovery: `git switch backup/pre-solventia-redesign-20261020` (or redeploy `62e8e3c`).

## Checklist (§1–§28) — real status

| Area                                                                                                                                             | State                                | Where                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------ | ---------------------------------------------------------------- |
| Data integrity — ranges stay ranges, unknown ≠ absent, no invented personal facts                                                                | done                                 | fe85c11, 4468915 (one claim filter for page and translation)     |
| One canonical fit model, used everywhere, including ranking                                                                                      | done                                 | ce19fd4, 85fe2b1 (ranking follows the fit; AI order breaks ties) |
| §7 structured directions — delivery model, critical assumptions, success criteria, reconsider-if, risks, unknowns; validated; old rows tolerated | done                                 | 4468915                                                          |
| Design system — pearl/graphite/navy/cobalt/champagne, Geist, no purple                                                                           | done                                 | 478b065, 71d4d93, 85fe2b1                                        |
| Command Center (state-aware, one next move)                                                                                                      | done                                 | f83d708, 85fe2b1                                                 |
| Opportunities + detail (Overview / Fit with you / Market & validation), comparison                                                               | done                                 | f83d708, 71d4d93, 4468915, 85fe2b1                               |
| §12 roadmap — demand first, week ≤ 85% of the lower stated hours, all phases on a Validate → Build → Elevate path                                | done                                 | ef66b46, 0b3e4e0                                                 |
| §13 building screen — real elapsed time, no fake stages                                                                                          | done                                 | d4ce537                                                          |
| §14 Evidence — five statuses from evidence only, assumption ↔ mission links both ways, entry from week 1, negative results, edit/delete          | done                                 | 71d4d93                                                          |
| §15 "Your roadmap has changed" only on a real change                                                                                             | done                                 | 591edbc                                                          |
| §16 notifications — after a real save, traceable, no duplicates                                                                                  | done                                 | 490145f                                                          |
| §17 Ask Sol — instant welcome, context, emblem                                                                                                   | done                                 | 2f59d5a                                                          |
| §18 History — timeline from stored data, comparison, restore/delete                                                                              | done                                 | fe9af18, 85fe2b1                                                 |
| §19 Settings — name save state, photo truth, "Not provided yet"                                                                                  | done                                 | 1a37c8c, b5c979f, 1b89901                                        |
| §20 homepage — one identity at a time, semantic icons, cobalt, ≥12px captions                                                                    | done                                 | 9911d92, ee5a451, 85fe2b1                                        |
| §21 Google sign-in shows the Supabase host                                                                                                       | **blocked — external configuration** | see below                                                        |
| §22 copy — Customer / Problem to solve / Your offer, Evidence not Proof, "direction"                                                             | done                                 | b5c979f, 85fe2b1                                                 |
| §23 duplication removed                                                                                                                          | done                                 | 85fe2b1 (Today's Move, roadmap header, Fit with you)             |
| §24 responsive 360 → 3840, container queries, ≥12px text                                                                                         | done                                 | 85fe2b1                                                          |
| Header "Product" / "How It Works" dead anchors                                                                                                   | done                                 | 1a37c8c                                                          |

## Blocked pending external configuration

- §21 Google's account chooser names the Supabase project host. The code is correct
  (`redirectTo` = site origin); the name comes from the Google OAuth consent screen and the
  Supabase auth domain, which need the owner's console access:
  1. Google Cloud Console → APIs & Services → OAuth consent screen → Branding: App name
     "Solventia", logo, home page https://solventia.in, privacy https://solventia.in/privacy,
     terms https://solventia.in/terms, authorized domains `solventia.in` (and `supabase.co`
     while the Supabase host is used); submit for brand verification.
  2. Optional, removes the host entirely: Supabase → Project Settings → Custom domains (e.g.
     `auth.solventia.in`), add `https://auth.solventia.in/auth/v1/callback` to the Google OAuth
     client's redirect URIs, and set the production `SUPABASE_URL` / `VITE_SUPABASE_URL` in
     Vercel to the custom domain.
     Verify: Google sign-in on https://solventia.in says "to continue to Solventia".

## Tests (latest)

- `vitest`: 46 files, 412 tests pass. `tsc --noEmit`: pass. ESLint (`--quiet`): no errors.
  `npm run build` (Vercel preset): passes; Vercel preview builds of the branch: success.
- E2E on the fake stack (PGlite + fake Gemini), 155 tests in 17 spec files:
  - full run: tests 1–126 (every spec except the screenshot spec) passed; the screenshot spec
    then timed out on a stale "details" selector, so the run was stopped and the spec fixed;
  - screenshot spec rerun: 28 passed, 1 failed — the existing 14px text-floor test (0.875rem
    is 13.1px at the dashboard root). Fixed by raising every sub-14px size; the test passes;
  - after those fixes, the functional specs for the touched screens (a11y, buttons, command
    center, opportunities, evidence, roadmap, Hindi, history, settings, shell): 77/77 passed.
- Responsive QA: every Founder OS screen (Command Center before/after choice and with a
  roadmap, Opportunities, detail, Fit with you, Market & validation, This Week, Plan,
  Progress, Evidence with an open assumption, History with a comparison, Settings, Ask Sol
  open, notifications open, homepage) at 360×740, 390×844, 430×932, 1280×800, 1366×768,
  1440×900, 1920×1080 and 3840×2160, with automatic checks for horizontal overflow, text
  under 12px, clipped controls and console errors. Pack (local, not committed):
  `.e2e-tmp/qa/shots-final/<width>/<screen>.png` + `_report.json`; fixes re-shot in
  `.e2e-tmp/qa/shots-fix/` and `.e2e-tmp/qa/shots-14px/`. Only remaining console error:
  opportunity image generation is not available on the fake AI stack (expected).

## Deployment

Not yet released at the time of this checkpoint. Next: full E2E + production build, merge into
`main`, push (Vercel deploys), verify https://solventia.in in a fresh browser.

## Next action

Read `.e2e-tmp/full-e2e-2.log`; fix any regression; `npm run build`; merge
`feature/solventia-master-redesign` into `main` (no fast-forward, like the earlier PR merges),
push `main`, wait for Vercel's commit status, verify the live homepage and dashboard.
