# Solventia redesign — status

Checkpoint for the master redesign. Updated after every milestone. No secrets, tokens or user
data here. Specification: `SOLVENTIA_MASTER_PROMPT.md` (reconstructed — the original brief
arrived truncated twice; nothing here claims to be its verbatim text).

## Branches

| Role                                                                              | Branch                                   | Commit                             |
| --------------------------------------------------------------------------------- | ---------------------------------------- | ---------------------------------- |
| Implementation                                                                    | `feature/solventia-master-redesign`      | see `git log -1`                   |
| Backup of production before the redesign                                          | `backup/pre-solventia-redesign-20261020` | `62e8e3c`                          |
| Production (Vercel project `solventa-ai-launchpad` deploys it; Lovable-connected) | `main`                                   | `85f9e06` release (from `62e8e3c`) |
| Release merge branch (cut from remote `main`)                                     | `release/solventia-master-redesign`      | `85f9e06`                          |
| Earlier unreviewed Founder OS WIP (not in main, kept)                             | `founder-os-wip`                         | `eb36f77`                          |

Cut from production `main` (`62e8e3c`, which holds the homepage release and Anushka Shah's
PR #1/#2). `main` had no newer commits from anyone when the release was prepared, so the
branch integrates without conflicts and overwrites nobody's work.

Recovery: `git switch backup/pre-solventia-redesign-20261020` (or redeploy `62e8e3c`, the
previous production commit, from Vercel).

Note: the local `main` in this checkout holds four old, never-pushed "Founder OS" commits
(`41da902` and parents). They were left untouched and were not released; the release was
merged on `release/solventia-master-redesign`, cut from the remote `main`.

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

Released and verified live on 2026-10-21.

- `85f9e06` (a merge of the tested branch tip `a8a11fb` onto production `62e8e3c`; its tree
  is identical to the tested branch) pushed to `main` — a normal fast-forward push, no
  force. Vercel commit status: "Deployment has completed" for `solventa-ai-launchpad` (the
  project serving solventia.in) and `solventia10`.
- https://solventia.in now serves the new build: 10 of 17 homepage assets changed and the new
  copy ("Find more directions", "Fit with you") is in the live bundle.
- Fresh-browser check (desktop 1440 and iPhone-size 390, no cookies): brand alone on the first
  frame; never more than one film identity at a time; after the film the bar is solid with
  its own lockup (the old finale-under-"Sign In" overlap is gone); scrolling back up returns
  the centred opening; the header's "How It Works" opens /how-it-works (it was the dead
  /#how-it-works before the release); signed-out /dashboard returns home with the sign-in
  dialog; no console errors. Shots: `.e2e-tmp/qa/live-before/`, `.e2e-tmp/qa/live-after/`.
- Not verified on production: signed-in dashboard pages. That needs the owner's account
  (Google or email); creating a production account would put test data in the real
  database. The dashboard was verified on the identical build against the fake stack (E2E +
  responsive QA above).
- Follow-up after release: History reads `roadmaps.completed_at` only when the database has
  migration 0010 (same probe as the rest of Founder OS), released the same way.

## Incident 2026-10-21 — Stage 7 "We couldn't finish your analysis" (400 INVALID_ARGUMENT)

- **Symptom:** every consultation failed at Stage 7 on production after release `85f9e06`;
  console: `Gemini request failed after retry: {"code":400,"message":"Request contains an
invalid argument.","status":"INVALID_ARGUMENT"}`. Reproduced on production through
  `/review-public` (fixed fictional profile, nothing persisted): failed at "Gemini —
  intelligence package" in 1.3 s, i.e. rejected before any generation.
- **Root cause (measured live, synthetic prompt):** the consultation is the call that sends a
  provider-side `responseSchema` (`generateStructured(FlatIntelligencePackageSchema)`). The
  structured direction fields added in `4468915` raised that schema's `maxItems` constraints
  from 14 to 17. Gemini rejects a schema with "too many" constraints with a bare 400 and no
  detail (the undocumented limit already noted in `gemini.server.ts`):
  released schema → 400; pre-release shape (14 maxItems) → accepted; released schema with
  every description removed → still 400; with only `maxItems` removed → accepted. The
  same-model retry re-sent the same schema, hence "failed after retry".
- **Fix:** `src/lib/ai/gemini.server.ts` — (1) `toGeminiSchema` no longer sends `maxItems` to
  the provider (Zod still enforces every upper bound on the response; the prompt's JSON
  contract states them); (2) if Gemini still rejects a request that carries a schema with a
  400, the one retry goes without the provider schema — same prompt (it contains the JSON
  contract), same Zod validation, same two-attempt budget; a 400 without a schema, or an
  invalid response, still fails as a real error with the retry screen.
- **Regression tests:** `gemini-schema.test.ts` (no `maxItems` in any provider schema; the
  consultation schema still requires deliveryModel / criticalAssumptions (min 2, category
  enum) / successCriteria / reconsiderIf; keyword stripping never removes a same-named
  property) — fails without the fix; `intelligence-package.pipeline.test.ts` (400 with schema
  → schema-less retry succeeds and is validated; schema-less invalid JSON still fails); the E2E
  fake Gemini now rejects a responseSchema with more than 14 `maxItems` like the provider;
  `auth.spec.ts` (a provider 400 recovers on the first click: 2 calls, 3 directions; a full
  failure then "Try again" keeps the answers: 1 consultation, 3 directions, 1 notification).
- **Results:** vitest 46 files / 420 tests pass; `tsc` pass; ESLint no errors; `npm run build`
  pass; E2E `auth` + `consultation` + `smoke` + `command-center`: 29/29 passed. Live Gemini,
  synthetic fixture profile: fixed schema accepted; real `generateIntelligencePackage` → 3
  distinct directions with every structured field in 32 s, no schema-less retry needed.
- **Commit / deploy:** fix `8da93a1` on `fix/consultation-gemini-400`; merged onto production
  `5631af3` as `20393ed` (branch `release/consultation-gemini-400`), pushed to `main` (normal
  push). Vercel: "Deployment has completed" for `solventa-ai-launchpad`.
- **Verified on production:** `/review-public` (same `generateIntelligencePackage`, production
  model and settings, fictional profile, nothing persisted). Before the fix it failed at
  "Gemini — intelligence package" with `400 INVALID_ARGUMENT` in 1.3 s; after: "Run complete
  in 33391ms", three distinct directions, every step successful.
- **Not verified on production:** the signed-in `/consultation` submit with a real account
  (saving the consultation and opening the dashboard). That code is unchanged and passed E2E;
  it needs the owner to press "Try again" on their saved consultation.
- No user data was read, changed or created; no secrets logged. Shots: `.e2e-tmp/qa/prod-before/`,
  `.e2e-tmp/qa/prod-after/`.

## Next action

Owner: press "Try again" on the saved consultation at https://solventia.in/consultation (the
answers are kept) and confirm the dashboard opens with three directions. Then the §21 Google
consent-screen branding above.
