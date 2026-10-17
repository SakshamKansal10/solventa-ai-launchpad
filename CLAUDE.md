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
- Dashboard typography is Inter. `DashboardShell` adds the `app-inter` class to `<html>` while mounted so portals (dialogs, sheets) match. Overrides live at the end of `src/styles.css`.
- Headings are capped (h1 ≈ 24–30px, h2 ≈ 19–22px); labels are sentence case, not ALL-CAPS; semibold renders as medium, bold as semibold.
- Use `sol-h-sm` for small card headings and `sol-h-hero` for the Opportunities hero title. To change a `sol-h-sm` size use a Tailwind `!text-[…]` override.
- Keep the Solventia palette: warm ivory background, navy text/primary buttons, violet/lavender accents, beige borders, white cards. Thin borders, minimal shadows.
- Existing e2e tests rely on `data-testid` attributes (e.g. `assumption-card`, `mission-toggle`, `north-star`, `rail-ask-sol`, `week-avoid`, `success-threshold`). Keep them when restyling.
- Use real data; never replace it with hardcoded sample content. Don't add UI for features that don't exist (e.g. bookmarks).

## Permissions
`.claude/settings.json` auto-approves edits and common dev commands and blocks `git push`, `git reset --hard`, `git clean`, `rm -rf`, rebase and amend. Only commit/push when asked.
