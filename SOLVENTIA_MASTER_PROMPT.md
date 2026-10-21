# Solventia master redesign — specification (reconstructed)

The original master brief was pasted into a conversation twice and arrived truncated both
times (once inside §11.3, once inside the §28 checklist). It was never saved to the repo. This
file reconstructs the specification from what was received — the checklist recorded in
`SOLVENTIA_REDESIGN_STATUS.md` and the owner's final execution order of 2026-10-21 — so the work
has a durable source. Where the original wording is lost, the requirement is stated as it was
implemented and checked. If the full original brief is found, it replaces this file.

## Constraints (addendum)

- Work on a separate branch; keep the original production commit and a backup branch.
- No force-push, destructive reset or indiscriminate cleanup; never rewrite pushed history.
- Never commit secrets, credentials, `.env` files, private user data, build output,
  `node_modules` or generated test artifacts.
- Database migrations only when safe and backward-compatible.
- Never bypass authentication or authorisation to deploy; don't revert the TanStack security fix.
- Never claim a deployment that hasn't been verified live; report an external blocker exactly.
- Preserve other contributors' (Anushka Shah's, Lovable's) work.

## Product truth

1. **Data integrity** — ranges stay ranges (hours, money); unknown is not absent; no invented
   personal facts (places, single figures, credentials, access); market claims are hypotheses.
2. **One canonical founder-fit model** — five factors (access, resources, capability, time,
   goals), each 0–3 or unknown, weighted, with coverage; labels Strong / Moderate /
   Conditional / Weak / Provisional used identically everywhere.
3. **Directions** — three genuinely different directions, plain language, each with a
   delivery model, critical assumptions (riskiest first, demand first), success criteria for the
   first test, reconsider-if signals, risks and unknowns; validated on generation, tolerant of
   older stored rows.

## Founder OS (§12–§22)

- **§12 Roadmap** — Validate → Build → Elevate; first missions test demand and the riskiest
  assumptions; no inventory, paid tools or supplier contracts before demand evidence; a
  continue / revise / reconsider gate; future phases provisional; week load ≤ 85% of the lower
  bound of stated hours; a light HTML/SVG path showing every phase (no 3D islands).
- **§13 Generation screen** — honest lifecycle: no fake percentages, never "saved" before the
  save, retries, idempotent clicks, resume an existing roadmap.
- **§14 Evidence** — "Evidence", not "Proof" (old route kept). Assumptions with statement,
  category, why it matters, how to test it, linked missions, evidence, status (Not tested /
  Testing / Supported / Contradicted / Inconclusive), updated date and next action. Evidence
  can be recorded from week 1; completing a mission never validates by itself; links
  assumption ↔ mission both ways; negative results are first-class.
- **§15 Adaptation** — "Your roadmap has changed" only when the plan really changed, with why.
- **§16 Notifications** — right user / consultation / direction / roadmap; "roadmap ready" only
  after a successful save with Week 1; no duplicates; correct links; language.
- **§17 Ask Sol** — designed panel, instant shell, "Let's work on your next move.", contextual
  prompts, no invented facts.
- **§18 History** — editorial timeline (consultation, directions, choice, roadmap, outcome);
  compare consultations only from stored data; safe review / restore / delete.
- **§19 Settings** — editable name with a real save state; photo label tells the truth;
  "Not provided yet" for missing profile values; language everywhere.
- **§20 Homepage** — brand on the first frame; scroll sync; one identity at a time (never two
  lockups); semantic founder-profile icons; no purple.
- **§21 Google sign-in branding** — external configuration (Google consent screen, optional
  Supabase custom domain); report the exact steps.
- **§22 Copy** — Customer / Problem to solve / Your offer / Revenue model / First validation test;
  "Market evidence hasn't been collected yet."; Evidence not Proof; sentence case.

## Design direction

Premium fresh white and pearl surfaces, graphite type, deep navy, purposeful cobalt, selective
champagne gold; Geist only for the interface (Montserrat for the wordmark); disciplined motion;
useful graphics; strong hierarchy and whitespace; no purple effects, clutter, repetition, tiny
text or unclear actions. Every dashboard screen — Command Center, Opportunities, opportunity
detail (Overview / Fit with you / Market & validation), Roadmap (path, This Week, missions,
Plan, Progress), Evidence, Ask Sol, History and comparison, Settings, notifications, navigation,
dialogs, loading and error states.

## Quality and release (§23–§28)

- §23 remove duplication at the IA level; §24 viewports 360 / 390 / 430 / 1280 / 1366 / 1440 /
  1920 / 3840, WCAG 2.2 AA, reduced motion; §25 measure before/after; §26 tests for data,
  roadmap, evidence, flows, homepage, auth; §27 phase order; §28 report every item's real status.
- Unit, integration and full E2E suites, type check, lint, production build, responsive and
  visual checks with real screenshots, key journeys (sign in → consultation → direction → compare
  → choose → roadmap → first mission → evidence → assumption update → adaptation → Ask Sol →
  notifications → history → settings, English and Hindi).
- Release: integrate into `main` through the normal process without overwriting other
  contributors' work, keep a recovery path, verify the deployment on https://solventia.in in a
  fresh browser session, re-check the homepage and dashboard on production.
