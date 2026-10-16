import type { BrowserContext, Page } from "@playwright/test";

/**
 * Test-side client for the fake stack (e2e/harness). Everything talks to the
 * local fake over HTTP — the fake lives in the Playwright main process, tests in
 * worker processes.
 */

const fakeUrl = () => {
  const url = process.env.E2E_FAKE_URL;
  if (!url) throw new Error("E2E_FAKE_URL is not set — is the harness global setup running?");
  return url;
};
export const appUrl = () => process.env.E2E_APP_URL ?? "http://localhost:4173";

async function call<T>(pathname: string, body?: unknown): Promise<T> {
  const res = await fetch(`${fakeUrl()}${pathname}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Fake stack ${pathname} → ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

/** Runs SQL as the database owner (RLS bypassed): seeding and assertions only. */
export async function sql<T = Record<string, unknown>>(
  query: string,
  params: unknown[] = [],
): Promise<T[]> {
  return call<T[]>("/__admin/sql", { sql: query, params });
}

export async function resetStack(): Promise<void> {
  await call("/__admin/reset", {});
}

export interface TestUser {
  id: string;
  email: string;
  password: string;
  session: Record<string, unknown>;
}

let counter = 0;
export async function createUser(
  opts: { email?: string; fullName?: string; password?: string } = {},
): Promise<TestUser> {
  const email = opts.email ?? `founder${Date.now()}${++counter}@example.test`;
  const password = opts.password ?? "correct-horse-battery";
  const made = await call<{ user: { id: string }; session: Record<string, unknown> }>(
    "/__admin/user",
    {
      email,
      password,
      fullName: opts.fullName ?? "Test Founder",
    },
  );
  return { id: made.user.id, email, password, session: made.session };
}

function cookieFor(session: Record<string, unknown>) {
  const host = new URL(fakeUrl()).hostname.split(".")[0];
  return {
    name: `sb-${host}-auth-token`,
    value: `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`,
  };
}

/** Signs the browser context in as `user` by installing the Supabase session cookie. */
export async function signIn(context: BrowserContext, user: TestUser): Promise<void> {
  const { name, value } = cookieFor(user.session);
  await context.addCookies([{ name, value, url: appUrl() }]);
}

export const gemini = {
  calls: () =>
    call<{ purpose: string; at: number; hindi: boolean; weekTitle?: string }[]>("/__admin/gemini"),
  async countOf(purpose: string): Promise<number> {
    return (await gemini.calls()).filter((c) => c.purpose === purpose).length;
  },
  failNext: (purpose: string, count = 1, status = 503) =>
    call("/__admin/gemini", { failNext: { purpose, count, status } }),
  delay: (purpose: string, ms: number) => call("/__admin/gemini", { delayMs: { purpose, ms } }),
  clearBehavior: () => call("/__admin/gemini", { clear: true }),
};

/** Fails the test if the page ever reaches for a real Supabase project. */
export function forbidRealBackends(page: Page): void {
  void page.route(/https:\/\/[^/]*supabase\.(co|in)\//, (route) => route.abort());
}
