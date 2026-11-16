import { expect, test } from "@playwright/test";

import { walkConsultation } from "./helpers/consultation";
import { gotoApp } from "./helpers/page";
import { fakeGoogleIdentity, forbidRealBackends, gemini, resetStack } from "./helpers/stack";

/**
 * Google Identity Services (owner, 2026-11-16): Google's own button and One Tap — Google then
 * names Solventia, not the Supabase project's domain — verified by Supabase with a hashed nonce.
 * If Google's script cannot load, the old redirect flow stays (google-resume.spec.ts runs it).
 */
test.beforeEach(async ({ page }) => {
  forbidRealBackends(page);
  await resetStack();
});

test("after the consultation, Google's button signs in and goes on to idea generation", async ({
  page,
}) => {
  test.setTimeout(240_000);
  await fakeGoogleIdentity(page);
  await gotoApp(page, "/consultation");
  await page.evaluate(() => window.localStorage.clear());
  await gotoApp(page, "/consultation");
  await walkConsultation(page);

  const gate = page.getByTestId("account-gate");
  // Google's own button replaces the redirect one, as Google's guidelines style it…
  await expect(gate.getByTestId("gis-button")).toBeVisible({ timeout: 15_000 });
  await expect(gate.getByTestId("google-signin")).toHaveCount(0);
  const options = await page.evaluate(
    () =>
      (window as unknown as { __gis: { options: Record<string, string>; prompts: number } }).__gis,
  );
  expect(options.options).toMatchObject({
    theme: "outline",
    size: "large",
    shape: "pill",
    text: "continue_with",
  });
  // …and One Tap is offered.
  expect(options.prompts).toBeGreaterThanOrEqual(1);

  await gate.getByTestId("gis-button").click();
  // Never the dashboard first: the finished consultation is analysed (idea generation)…
  await expect(page).toHaveURL(/\/consultation\?submit=1/, { timeout: 30_000 });
  // …then its three directions.
  await expect(page).toHaveURL(/localhost:\d+\/dashboard$/, { timeout: 120_000 });
  await expect(page.getByTestId("flagship-card")).toBeVisible({ timeout: 60_000 });
  expect(await gemini.countOf("INITIAL_INTELLIGENCE")).toBe(1);
});

test("the sign-in page: Google's button returns the founder to the page they were headed to", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await fakeGoogleIdentity(page, { email: "returning@example.com", name: "Arjun Mehta" });
  await gotoApp(page, `/sign-in?next=${encodeURIComponent("/dashboard/settings")}`);
  await page.getByTestId("gis-button").click();
  await expect(page).toHaveURL(/\/dashboard\/settings$/, { timeout: 30_000 });
});

test("Google's script blocked (ad blocker): the redirect button stays and is the way in", async ({
  page,
}) => {
  // forbidRealBackends aborts accounts.google.com, as an ad blocker would.
  await gotoApp(page, "/sign-in");
  await expect(page.getByTestId("google-signin")).toBeVisible();
  await expect(page.getByTestId("google-gis")).toHaveAttribute("data-state", "off", {
    timeout: 10_000,
  });
  await expect(page.getByTestId("gis-button")).toHaveCount(0);
  const authorize: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/authorize")) authorize.push(r.url());
  });
  await page.getByTestId("google-signin").click();
  // The redirect flow (fake GoTrue plays Google) signs in and lands on the dashboard.
  await expect(page).toHaveURL(/localhost:\d+\/dashboard/, { timeout: 60_000 });
  expect(authorize.some((u) => u.includes("prompt=select_account"))).toBe(true);
});
