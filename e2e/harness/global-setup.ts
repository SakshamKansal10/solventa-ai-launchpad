import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { createWriteStream, existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { startFakeStack } from "./fake-supabase";

/**
 * Starts (1) the fake Supabase + Gemini stack, (2) a PRODUCTION build of the app
 * (`vite build` → local Node server) whose environment points at that stack, and
 * refuses to continue unless it can PROVE the app is talking to the fake and not
 * to a real project. Returns a teardown that stops both.
 *
 * Why a production build rather than `vite dev`: the dev server compiles modules
 * on demand and takes 20–30 s to hydrate a dashboard page on Windows, which makes
 * browser tests both slow and timing-flaky. A production build is what users get.
 *
 * Nothing in this file (or any E2E test) may ever be run against production
 * data — the real Supabase URL from .env.local is read only to make sure it is
 * NOT what the app ends up using.
 */

const APP_PORT = Number(process.env.E2E_PORT ?? 4173);
const FAKE_PORT = Number(process.env.E2E_FAKE_PORT ?? 54329);
const OUTPUT = path.resolve(process.cwd(), ".e2e-tmp/output/server/index.mjs");

function realSupabaseUrl(): string | null {
  const file = path.resolve(process.cwd(), ".env.local");
  if (!existsSync(file)) return null;
  const match = /^\s*SUPABASE_URL\s*=\s*["']?([^"'\r\n]+)/m.exec(readFileSync(file, "utf8"));
  return match ? match[1].trim() : null;
}

async function waitFor(url: string, timeoutMs: number, what: string): Promise<void> {
  const start = Date.now();
  let lastError: unknown;
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { redirect: "manual" });
      if (res.status < 500) return;
    } catch (err) {
      lastError = err;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(
    `${what} did not become ready within ${timeoutMs / 1000}s (${String(lastError ?? "no response")})`,
  );
}

function killTree(child: ChildProcess) {
  if (!child.pid) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {
      child.kill("SIGTERM");
    }
  }
}

function runBuild(env: NodeJS.ProcessEnv): void {
  mkdirSync(".e2e-tmp", { recursive: true });
  const started = Date.now();
  const result = spawnSync(process.platform === "win32" ? "npx.cmd" : "npx", ["vite", "build"], {
    env: { ...env, E2E_BUILD: "1" },
    encoding: "utf8",
    shell: process.platform === "win32",
    maxBuffer: 64 * 1024 * 1024,
  });
  const log = createWriteStream(path.join(".e2e-tmp", "build.log"));
  log.write(result.stdout ?? "");
  log.write(result.stderr ?? "");
  log.end();
  if (result.status !== 0 || !existsSync(OUTPUT)) {
    throw new Error(
      `The E2E production build failed (see .e2e-tmp/build.log):\n${(result.stderr ?? "").slice(-1500)}`,
    );
  }
  console.log(`[e2e] production build finished in ${Math.round((Date.now() - started) / 1000)}s`);
}

export default async function globalSetup() {
  const realUrl = realSupabaseUrl();
  const stack = await startFakeStack({ port: FAKE_PORT });
  if (realUrl && stack.url.includes(new URL(realUrl).hostname)) {
    await stack.close();
    throw new Error("Refusing to run: the fake stack resolved to the real Supabase host.");
  }

  const appUrl = `http://localhost:${APP_PORT}`;
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    SUPABASE_URL: stack.url,
    SUPABASE_ANON_KEY: stack.anonKey,
    VITE_SUPABASE_URL: stack.url,
    VITE_SUPABASE_ANON_KEY: stack.anonKey,
    GEMINI_API_KEY: "e2e-fake-gemini-key",
    GEMINI_API_BASE_URL: `${stack.url}/gemini`,
    GEMINI_MODEL: "gemini-e2e-fake",
    SITE_URL: appUrl,
    REVIEW_BYPASS_AUTH: "false",
    REVIEWER_EMAILS: "",
    NITRO_PORT: String(APP_PORT),
    PORT: String(APP_PORT),
    NITRO_HOST: "localhost",
    HOST: "localhost",
  };
  delete env.RESEND_API_KEY;

  let app: ChildProcess | null = null;
  const teardown = async () => {
    if (app) killTree(app);
    await stack.close();
  };

  try {
    if (process.env.E2E_SKIP_BUILD !== "1" || !existsSync(OUTPUT)) runBuild(env);

    mkdirSync(".e2e-tmp", { recursive: true });
    const log = createWriteStream(path.join(".e2e-tmp", "app.log"));
    app = spawn(process.execPath, [OUTPUT], {
      env,
      stdio: ["ignore", "pipe", "pipe"],
      detached: process.platform !== "win32",
    });
    app.stdout?.pipe(log);
    app.stderr?.pipe(log);
    await waitFor(appUrl, 60_000, "The app server");

    // Prove the app talks to the fake: sign a probe user in by cookie and load a
    // protected page, which makes the server verify the session against GoTrue.
    const probe = await stack.createUser({
      email: "probe@example.test",
      password: "probe-password",
    });
    const cookie = stack.cookieFor(probe.session);
    const stats = async () =>
      ((await (await fetch(`${stack.url}/__admin/health`)).json()) as { stats: { auth: number } })
        .stats.auth;
    const before = await stats();
    await fetch(`${appUrl}/dashboard`, {
      headers: { cookie: `${cookie.name}=${cookie.value}` },
      redirect: "manual",
    });
    if ((await stats()) <= before) {
      throw new Error(
        "The app did not contact the fake auth server. It may be using a real Supabase project — aborting so no real data can be touched.",
      );
    }
    await stack.reset();
  } catch (err) {
    await teardown();
    throw err;
  }

  process.env.E2E_APP_URL = appUrl;
  process.env.E2E_FAKE_URL = stack.url;
  process.env.E2E_ANON_KEY = stack.anonKey;
  return teardown;
}
