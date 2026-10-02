# Test harness

Browser tests never touch the real Supabase project or the real Gemini API.

| Piece              | What it is                                                                                                                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `db.ts`            | A real Postgres (PGlite) with **this repo's migrations** applied. Defaults, unique indexes, CHECK constraints and row-level security all behave as in production.        |
| `postgrest.ts`     | The subset of the PostgREST HTTP API supabase-js uses here, translated to SQL.                                                                                           |
| `fake-supabase.ts` | One local server: `/rest/v1`, `/auth/v1` (password, OTP `123456`, refresh, OAuth), `/storage/v1`, `/gemini`, and `/__admin` for tests.                                   |
| `fake-gemini.ts`   | Recognises each prompt and answers with schema-valid fixtures (`src/lib/ai/fixtures/e2e-gemini.ts`, validated in a unit test). Can be told to fail or stall.             |
| `global-setup.ts`  | Builds the app (`E2E_BUILD=1 vite build` → local Node server), starts it against the fake stack, and **aborts unless it proves the app talked to the fake auth server**. |

## Commands

```bash
npm run test:e2e                      # build + full browser suite
E2E_SKIP_BUILD=1 npm run test:e2e     # reuse the last build

# fast iteration: keep the stack running, re-run specs in seconds
npx playwright test -c playwright.serve.config.ts        # leave running
E2E_BASE_URL=http://localhost:4173 E2E_FAKE_URL=http://127.0.0.1:54329 \
  npx playwright test e2e/roadmap.spec.ts

npm run compare                       # local comparison server on http://localhost:4175
npm run compare:seed                  # (optional) fill the demo founder via the real UI
```

## The local comparison server (`npm run compare`)

- A production build of this checkout on **http://localhost:4175**.
- Backed by an **isolated on-disk database** (`.e2e-tmp/compare/db`) — not the real Supabase project.
- Uses the real Gemini model when `GEMINI_API_KEY` is in `.env.local` (`COMPARE_AI=fake` for fixtures).
- No email provider is configured, so nothing is ever sent. Sign-in codes are `123456`; "Continue with Google" signs in a fake Google account.
- Accounts: `founder@solventia.local` (empty) and `demo@solventia.local` (after `compare:seed`), password `Solventia-local-1`.
- Stop it by creating `.e2e-tmp/compare/stop`.

The build bakes in the fake Supabase URL (port 54329), so the fake stack's port is fixed.
