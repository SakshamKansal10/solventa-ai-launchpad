# Part 3 — dashboard redesign: file map and plan

Presentation and navigation only. No schema, DB query, AI prompt or auth change. The brief's
approval gate is overridden by the run instructions (decisions 3). Colours map to the existing
tokens (decisions 5); type scale per decisions 4.

## What the code is today
- Layout route `src/routes/dashboard.tsx` → `DashboardShell` (left sidebar 260px, 72px top bar
  with page title, language switch, notification bell, avatar menu; Ask Sol docked at ≥1280px,
  a drawer below; a floating Ask Sol launcher everywhere).
- Pages: `dashboard/index.tsx` (Command Center, four stage components), `opportunities/index.tsx`
  (selected hero, compare table, search + filters, cards with Choose), `opportunities/$id.tsx`
  (header + Overview/Fit/Market tabs), `roadmap/index.tsx` (RoadmapJourney + Week/Plan/Progress
  tabs; WeekTab has the missions accordion and a right rail), `proof.tsx`, `history.tsx`,
  `settings.tsx`; chrome-free `dashboard_/roadmap/building.tsx`.
- Shared UI: `components/founder/ui.tsx` (navy primary button, 12–17px text), global
  `.app-inter` rules in `styles.css` that cap h1/h2 sizes with `!important`, force sentence-case
  labels and shrink the root font to 93.75%.
- Strings: `src/lib/i18n/messages/*.ts`, `{ en, hi }` with `hi` typed against `en`.

## File map
| File | Change |
|---|---|
| `src/styles.css` | `.app-inter` caps replaced by the v2 scale (`dash-*` utilities: headline, mission headline, section, statement, lead, label); root size back to 100% in the dashboard; enter/arc/halo keyframes with reduced-motion off-switch |
| `src/components/founder/dash/ui.tsx` (new) | `PrimaryLink`/`PrimaryButton` (68px, 21px, cobalt, arrow; `onNavy` variant white/ink), `SecondaryLink`/`SecondaryButton` (outline), `Tag`, `Label`, `Headline`, `MistCard`, `NavyBlock`, `LinkRow`, `PageEnter`, `DashSkeleton`, `DashError` |
| `src/components/founder/dash/JourneyArc.tsx` (new) | the SVG arc from the brief's formula, real week count, phase ticks, current-phase stroke, halo; draws once |
| `src/components/founder/dash/FitBar.tsx` (new) | one segment per fit factor, clear fits first; solid / hatched / ink / dashed; legend component |
| `src/components/founder/dash/StatusShape.tsx` (new) | proof status pill with a shape (dashed ring, half, check, cross, dash) |
| `src/components/founder/DashboardShell.tsx` | sidebar removed; top bar = lockup · pill nav (Today · Directions · Roadmap · Proof) · language · bell · Ask Sol · avatar (History, Settings, New consultation, Sign out); Roadmap/Proof disabled before a direction; <768px: bottom bar + round Ask Sol button; Ask Sol state lifted into an exported `AskSolProvider` so the mission page can use it |
| `src/routes/dashboard/index.tsx` | Today: five states per the brief; removed strip, chip row, stat tiles, roadmap-at-a-glance, "your direction" card |
| `src/routes/dashboard/opportunities/index.tsx` | Directions: headline, built-from line, cards (recommended navy first), fit bar + legend once, one **Open direction** each; nudge row (TODO task 4) + Find more; search, filters, compare table, Choose removed |
| `src/routes/dashboard/opportunities/$id.tsx` → `$id/index.tsx` | Direction detail: back, headline, paragraph, state-following primary, fit summary card, four mist cards, navy first-test block with Estimate tag, two link rows; `?tab=fit|market` redirects to the sub-pages |
| `src/routes/dashboard/opportunities/$id/fit.tsx` (new) | How it fits you: factor rows with reasons, advantages, gaps (old Fit tab) |
| `src/routes/dashboard/opportunities/$id/market.tsx` (new) | Market and sources: sources, validation plan, "how it's delivered", "more detail" sentences (old Market tab + expanders) |
| `src/lib/actions/founder.ts` | `OpportunityBrief.fitFactors` — the per-factor scores from the same `assessFit` call that already produces `fit` (no query change) |
| `src/routes/dashboard/roadmap/index.tsx` | Roadmap: direction name, headline, navy arc + phase cards, current week with mission rows (Start/Open), week review when ready, earlier weeks row, Make it official row (TODO task 4); tabs, rail, pager, phase stepper removed |
| `src/routes/dashboard_/roadmap/mission.$missionId.tsx` (new) | mission page: lockup, back to week, Ask Sol, tags, headline, why, steps, done-when, Mark as done, Record what you learned, avoid-this-week, Stuck? row; TODO for task 4 inputs |
| `src/routes/dashboard/proof.tsx` | Proof: headline, line, N / total with segments, one mist card per assumption (type, status shape, statement, how you check it → mission), If a check fails row; status bar, fit and market sections removed (they live on Direction detail) |
| `src/routes/dashboard_/roadmap/building.tsx` | headline + elapsed kept; bullets and "one real request" replaced by the arc drawing itself |
| `src/routes/dashboard/history.tsx`, `settings.tsx` (+ settings sections) | same content, tokens and type scale; Settings two columns on desktop |
| `src/lib/i18n/messages/v2.ts` (new) | every new string, English + Hindi |
| `e2e/*.spec.ts` | tests follow moved elements (decisions 7) |

## Things in the brief that do not match the code
1. "Use the real `Logo` component" — there is none; the project's logo is `BrandLockup` (tagline
   = the signature). Used everywhere.
2. "Opportunities", "Evidence" labels — the code already says "Directions"/"Proof" in English
   since an earlier pass; Hindi labels are checked again.
3. Fit has **five** factors (access, resources, capability, time, goals), matching the brief's
   five-segment bar. `OpportunityBrief` only carries the overall label, so the per-factor scores
   are added to it from the existing `assessFit` call.
4. Building screen: the roadmap's length is unknown while it is being built, so the arc draws
   its curve without week dots (no invented week count).
5. The notification bell is not in the brief's top bar; it is kept beside the avatar (a working
   feature with tests; nothing in the brief says to remove it).
6. Mission "Start": starting moves the mission to in progress (the existing state machine) and
   opens its page. "Mark as done" is the page's one primary action.
7. Week review (closing a week) has no screen in the reference; it stays on Roadmap as the
   current week's primary action when the week is ready to close.

## Order (one commit each)
1 tokens + base components · 2 shell · 3 arc + fit bar · 4 Today · 5 Directions + detail +
sub-pages · 6 Roadmap + mission page · 7 Proof · 8 Building, History, Settings · 9 Hindi + 390px.
