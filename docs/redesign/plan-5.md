# Part 5 — the idea engine: audit and plan

The brief's "wait for my OK" is overridden by the run instructions (decisions 3): this audit is
committed and work carries straight on. Everything below is read from the code on `redesign-v2`
(2026-11-15).

## 1. Audit

### Questions, storage, and what the prompts use
Seven stages (`src/lib/consultation/model.ts`, screens in `src/components/consultation/`). Every
answer is stored as a language-neutral id in `business_dna.onboarding_answers` (schema v2) and
normalised into `business_dna.normalized_signals` (`NormalizedProfile`, `profile/normalize-v2.ts`)
— structured data, not text.

| Screen | Answers | Used by the direction prompt? |
|---|---|---|
| basics | age, status (+other) | yes (identity line) |
| location | country, state, city, postal code | country/state/city yes; postal code **ignored** |
| education | level, major, institution, study year | yes |
| languagesTime | languages, weekly hours (range) | yes |
| skills (optional) | skills + level + used on a real project | yes; empty → "UNKNOWN, not absent" |
| domains | sectors worked in | yes |
| execution | things actually done | yes (also the experience estimate) |
| capital | money bracket (+ precise amount at the top tier) | yes |
| access | laptop, workspace, network, audience, suppliers… | yes |
| position (employed / owner) | income or business turnover, team, sector | yes |
| riskRoles | risk tolerance, roles, team preference | yes |
| commitment | why they want this | yes |
| interests (soft) | interests | yes, as a soft signal |
| refuseRelocation | refusals, relocation | yes |
| constraints | hard constraints (+other) | yes |
| scaleHorizon | scale, horizon, minimum monthly income, hope | yes; minimum income as a constraint |

**Not asked at all** (the brief's adviser questions): what people ask them for help with; who they
can reach *this week* without advertising; how much of the money they could afford to **lose**;
which **days** they can work. Contradictions are not checked during the consultation (part 4
feature 5 now flags them on Directions afterwards).

### Pipeline today
- **One model call** for the whole result: `generateIntelligencePackage`
  (`prompts/intelligence-package.ts`, purpose `INITIAL_INTELLIGENCE`) returns the founder
  analysis and **exactly three** directions with all display fields and `fitSignals`
  (required skills, starting capital, weekly hours, risk level, ceiling…).
- **Fit** is computed in code (`fit/model.ts` `assessFit`) from those signals and the profile —
  the model never writes a label. Directions are ordered by it.
- Parsing: JSON mode + a provider response schema (`toGeminiSchema` from zod), then local zod
  validation. **On a bad response:** one retry with the parse/validation error quoted back
  (`runGenerationLoop`), then a fallback model (if configured) for transient provider errors,
  then `AIGenerationError` → the consultation shows a retry screen. Partial output is never shown.
- Later, on demand: direction detail (`opportunity-detail.ts`), cited market research
  (`market-research.ts`, **Google Search grounding** via `generateGrounded`, cached 30 days),
  roadmap skeleton + week detail (just in time), translations, Ask Sol.
- No stage generates wide, filters hard limits in code, checks the money, or argues against a
  direction. The model is told to respect constraints and to label numbers as hypotheses, but
  nothing in code checks either.

### Model and settings
- `GEMINI_MODEL` (default `gemini-3.6-flash`), optional `GEMINI_FALLBACK_MODEL`; thinking level
  from `INITIAL_AI_THINKING_LEVEL` (unset = model default). **Temperature and max output tokens
  are not set** (model defaults).
- Every call logs `GEMINI_CALL` with token counts and duration (no cost figure). Cost and time
  per consultation are **measured in step 6** on real calls (not guessed here).
- Stored with each consultation: `ai_model`, `prompt_version`, `initial_ai_calls`, the profile
  (answers + normalised). **Not stored:** the raw model response and the call settings.

### Real examples
I have no access to the production database. Step 6 runs the current pipeline on ten profiles
against the real model; those ten real outputs are what is critiqued (in `engine-compare.md`).

## 2. Plan (each step one commit)
- **Step 2 — better inputs** (no migration: new answer ids in the same jsonb): afford-to-lose
  share of the money (capital screen), who they can reach this week without advertising (access
  screen), which days (time screen), what people ask them for help with (optional, execution
  screen). All normalised, all passed to the engine — empty = "unknown", never guessed.
  Contradictions (`fit/gaps.ts findContradictions`) shown on the last consultation step with a
  way back to fix them.
- **Step 3 — a staged pipeline** behind `IDEA_ENGINE=v2` (default stays the current pipeline
  until the owner has seen the comparison): understand (code) → generate 20+ candidates wide
  (1 call) → hard-limit filter (code) → fit (code, `assessFit`; each dimension names the profile
  field it used) → money check (code: price × volume × margin vs the income target and hours) →
  attack (1 call; fatal objections drop a direction, the strongest surviving objection becomes
  the first test) → choose up to three, diverse (code) → expand the chosen ones into the full
  direction shape the UI already shows (1 call). Fewer than three when fewer fit — with what is
  missing. Grounding (Google Search, already in the project) stays on demand from Market, as
  today: per-consultation grounding would add three search-grounded calls; its cost is measured
  in step 6 and left to the owner.
- **Step 4 — executable roadmaps:** week 1 never needs money, registration or a website (prompt
  rule + code check that drops/flags such missions); hours already fit the budget in code
  (`fitTasksToBudget`); later phases stay "depends on what you learn" and are written from the
  proof (part 4).
- **Step 5 — reliability:** store the raw response and the call settings with the result
  (migration 0020), prompt versions as constants per prompt file; progress and leave/return
  already exist for consultations and roadmaps.
- **Step 6 — prove it:** ten profiles, an automatic five-check scoring sheet, old vs new on the
  real model, a table of scores, cost (tokens) and time; `npm run engine:compare`.
