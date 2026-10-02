import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import {
  cpSync,
  createWriteStream,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
} from "node:fs";
import path from "node:path";

import { startFakeStack } from "./fake-supabase";

/**
 * The LOCAL COMPARISON SERVER (http://localhost:4175).
 *
 * A production build of this checkout, served locally, backed by an isolated
 * on-disk Postgres (PGlite + the repo's migrations) — never the real Supabase
 * project. That makes every feature work locally (Proof, avatars, week
 * generation, translations…) without touching a single production row.
 *
 * AI: if GEMINI_API_KEY exists in .env.local the real model is used, so content
 * reads like the live product; set COMPARE_AI=fake for deterministic fixtures.
 * Email (Resend) is never configured, so no email can be sent. Sign-in codes
 * are always 123456 and "Continue with Google" signs in a fake Google account.
 */

const APP_PORT = Number(process.env.E2E_PORT ?? 4175);
// Must equal the port the production build was compiled against (see global-setup).
const FAKE_PORT = Number(process.env.E2E_FAKE_PORT ?? 54329);
const DATA_DIR = path.resolve(process.cwd(), ".e2e-tmp/compare/db");
// The disposable test runs rebuild .e2e-tmp/output at will. The comparison server
// serves its OWN copy, taken once at start-up, so a test run can never swap the
// files (and the hashed asset names) out from under a page someone is looking at.
const BUILT = path.resolve(process.cwd(), ".e2e-tmp/output");
const SNAPSHOT = path.resolve(process.cwd(), ".e2e-tmp/compare/app");
const OUTPUT = path.resolve(SNAPSHOT, "server/index.mjs");

function readEnvLocal(keys: string[]): Record<string, string> {
  const file = path.resolve(process.cwd(), ".env.local");
  if (!existsSync(file)) return {};
  const text = readFileSync(file, "utf8");
  const out: Record<string, string> = {};
  for (const key of keys) {
    const m = new RegExp(`^\\s*${key}\\s*=\\s*["']?([^"'\\r\\n]+)`, "m").exec(text);
    if (m) out[key] = m[1].trim();
  }
  return out;
}

async function waitFor(url: string, timeoutMs: number, what: string) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { redirect: "manual" });
      if (res.status < 500) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`${what} did not become ready within ${timeoutMs / 1000}s`);
}

function killTree(child: ChildProcess) {
  if (!child.pid) return;
  if (process.platform === "win32")
    spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  else child.kill("SIGTERM");
}

/**
 * VITE_SUPABASE_URL is inlined into the CLIENT bundle at `vite build` time —
 * setting it on the spawned server process's env (below) only ever affects
 * server-side reads, never the already-built browser JS. A build produced by
 * a bare `vite build` (instead of the harness's own global-setup, which
 * injects the fake stack's URL before building) silently bakes in whatever
 * VITE_SUPABASE_URL is in .env.local — the real project, for this repo. That
 * happened once during development: a browser-side-only call (direct file
 * upload) tried to reach real Supabase Storage. It failed at the network/CORS
 * layer with no data transferred, but a build must never be allowed to carry
 * that risk silently again — refuse to serve one that does.
 */
function assertClientBundleIsNotProduction(): void {
  const local = readEnvLocal(["SUPABASE_URL"]);
  if (!local.SUPABASE_URL) return; // nothing to compare against
  let prodHost: string;
  try {
    prodHost = new URL(local.SUPABASE_URL).hostname;
  } catch {
    return;
  }
  const assetsDir = path.resolve(SNAPSHOT, "public/assets");
  if (!existsSync(assetsDir)) return;
  for (const file of readdirSync(assetsDir)) {
    if (!file.endsWith(".js")) continue;
    const text = readFileSync(path.join(assetsDir, file), "utf8");
    if (text.includes(prodHost)) {
      throw new Error(
        `SAFETY CHECK FAILED: the built client bundle (${file}) references the real Supabase project (${prodHost}). ` +
          "This build was not produced through the harness's own global-setup (which injects the fake stack's URL) — " +
          "most likely a bare `vite build` was run directly. Rebuild safely with: npx playwright test e2e/smoke.spec.ts " +
          "(builds correctly, runs two fast tests, exits) — then retry `npm run compare`. Refusing to serve this build.",
      );
    }
  }
}

export default async function compareSetup() {
  if (!existsSync(path.join(BUILT, "server/index.mjs"))) {
    throw new Error(
      "No production build found. Run `npx playwright test` once (or E2E_SKIP_BUILD=0 with the serve config) to build it first.",
    );
  }
  rmSync(SNAPSHOT, { recursive: true, force: true });
  cpSync(BUILT, SNAPSHOT, { recursive: true });
  assertClientBundleIsNotProduction();
  mkdirSync(path.dirname(DATA_DIR), { recursive: true });
  const stack = await startFakeStack({ port: FAKE_PORT, dataDir: DATA_DIR });

  const local = readEnvLocal([
    "GEMINI_API_KEY",
    "GEMINI_MODEL",
    "GEMINI_FALLBACK_MODEL",
    "INITIAL_AI_THINKING_LEVEL",
    "MENTOR_AI_THINKING_LEVEL",
  ]);
  const realAi = process.env.COMPARE_AI !== "fake" && Boolean(local.GEMINI_API_KEY);
  const appUrl = `http://localhost:${APP_PORT}`;

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    SUPABASE_URL: stack.url,
    SUPABASE_ANON_KEY: stack.anonKey,
    VITE_SUPABASE_URL: stack.url,
    VITE_SUPABASE_ANON_KEY: stack.anonKey,
    SITE_URL: appUrl,
    REVIEW_BYPASS_AUTH: "false",
    REVIEWER_EMAILS: "",
    NITRO_PORT: String(APP_PORT),
    PORT: String(APP_PORT),
    NITRO_HOST: "localhost",
    HOST: "localhost",
    ...(realAi
      ? {
          GEMINI_API_KEY: local.GEMINI_API_KEY,
          ...(local.GEMINI_MODEL ? { GEMINI_MODEL: local.GEMINI_MODEL } : {}),
          ...(local.GEMINI_FALLBACK_MODEL
            ? { GEMINI_FALLBACK_MODEL: local.GEMINI_FALLBACK_MODEL }
            : {}),
          ...(local.INITIAL_AI_THINKING_LEVEL
            ? { INITIAL_AI_THINKING_LEVEL: local.INITIAL_AI_THINKING_LEVEL }
            : {}),
          ...(local.MENTOR_AI_THINKING_LEVEL
            ? { MENTOR_AI_THINKING_LEVEL: local.MENTOR_AI_THINKING_LEVEL }
            : {}),
        }
      : {
          GEMINI_API_KEY: "local-fake-gemini-key",
          GEMINI_API_BASE_URL: `${stack.url}/gemini`,
          GEMINI_MODEL: "gemini-local-fake",
        }),
  };
  delete env.RESEND_API_KEY;
  if (realAi) delete env.GEMINI_API_BASE_URL;

  mkdirSync(path.resolve(process.cwd(), ".e2e-tmp/compare"), { recursive: true });
  const log = createWriteStream(path.resolve(process.cwd(), ".e2e-tmp/compare/app.log"));
  const app = spawn(process.execPath, [OUTPUT], { env, stdio: ["ignore", "pipe", "pipe"] });
  app.stdout?.pipe(log);
  app.stderr?.pipe(log);

  const teardown = async () => {
    killTree(app);
    log.end();
    await stack.close();
  };
  try {
    await waitFor(appUrl, 60_000, "The comparison app");
    for (const account of [
      { email: "founder@solventia.local", fullName: "Local Founder" },
      { email: "demo@solventia.local", fullName: "Demo Founder" },
    ]) {
      const exists = await stack.db.admin("select 1 from auth.users where email = $1", [
        account.email,
      ]);
      if (exists.length === 0)
        await stack.createUser({ ...account, password: "Solventia-local-1" });
    }
  } catch (err) {
    await teardown();
    throw err;
  }
  process.env.E2E_APP_URL = appUrl;
  process.env.E2E_FAKE_URL = stack.url;
  process.env.COMPARE_AI_MODE = realAi ? "real" : "fake";
  return teardown;
}
