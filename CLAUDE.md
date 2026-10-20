# Solventia — project guide

See [AGENTS.md](AGENTS.md) first. This project is connected to Lovable: never rewrite pushed git history (no force push, rebase, amend or squash of pushed commits), and keep the connected branch in a working state.

## Stack
- TanStack Start + TanStack Router (file routes in `src/routes`, generated `src/routeTree.gen.ts` — don't hand-edit), React, Vite, Tailwind v4 (`src/styles.css`), shadcn-style UI in `src/components/ui`.
- Data: Supabase (`supabase/`), server functions in `src/lib/actions`, React Query hooks in `src/lib/queries`.
- i18n: English + Hindi. Every user-facing string goes in `src/lib/i18n/messages/*.ts` with BOTH `en` and `hi` entries. Never hardcode UI text.

## Commands
- `npm run dev` — dev server (port 8083 locally)
- `npm run typecheck` — `tsc --noEmit` (errors in `e2e/harness/db.ts` about `@electric-sql/pglite` are pre-existing)
- `npm run lint`, `npx prettier --write <files>`
- `npm test` — vitest; `npm run test:e2e` — Playwright

Run prettier, typecheck and eslint on files you change before finishing.

## Layout
- `src/routes/dashboard/*` — signed-in founder app (Command Center, Opportunities, Roadmap, Proof, History, Settings), wrapped by `src/components/founder/DashboardShell.tsx`.
- `src/components/founder/*` — dashboard components; `ui.tsx` has shared Button/Card/Pill/LinkButton/PageHeader.
- `src/components/solventia/*` — marketing homepage (keeps its own serif look; don't restyle it for dashboard work).
- `src/components/consultation/*` — onboarding consultation flow.

## Dashboard design rules
- One interface sans for the whole product: Geist (`--font-sans` = `--font-display`), Noto Sans Devanagari for Hindi; Montserrat only for the SOLVENTIA wordmark. No serif headings. `DashboardShell` still adds the `app-inter` class (name kept) so portals match. Overrides live at the end of `src/styles.css`.
- Headings are capped (h1 ≈ 24–30px, h2 ≈ 19–22px); labels are sentence case, not ALL-CAPS; semibold renders as medium, bold as semibold.
- Use `sol-h-sm` for small card headings and `sol-h-hero` for the Opportunities hero title. To change a `sol-h-sm` size use a Tailwind `!text-[…]` override.
- Palette (2026-10, set by the owner — supersedes the old ivory/violet rule): WHITE / COOL PEARL = canvas (`sol-surface`, `sol-pearl`; the `ivory` token names now hold cool neutrals), GRAPHITE = type (`sol-ink`, `sol-secondary`), DEEP NAVY = depth and primary actions (`sol-navy`), COBALT = interaction and current state (`sol-cobalt*`), CHAMPAGNE = selective emphasis (completed, milestones). No purple, no lavender or cream gradients. Thin cool borders (`sol-border`), minimal shadows.
- Founder fit has ONE source: `assessFit` in `src/lib/fit/model.ts`. Never derive a fit label anywhere else, never show a percentage, and show the founder's stated ranges, never a midpoint.
- Existing e2e tests rely on `data-testid` attributes (e.g. `assumption-card`, `mission-toggle`, `north-star`, `rail-ask-sol`, `week-avoid`, `success-threshold`). Keep them when restyling.
- Use real data; never replace it with hardcoded sample content. Don't add UI for features that don't exist (e.g. bookmarks).

## Permissions
`.claude/settings.json` auto-approves edits and common dev commands and blocks `git push`, `git reset --hard`, `git clean`, `rm -rf`, rebase and amend. Only commit/push when asked.
