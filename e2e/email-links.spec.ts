import { expect, test } from "@playwright/test";

import { gotoApp } from "./helpers/page";
import { seedDirections } from "./helpers/seed";
import {
  createUser,
  fakeGoogleIdentity,
  forbidRealBackends,
  resetStack,
  signIn,
} from "./helpers/stack";

/**
 * Email links open the right page (owner, 2026-11-16): every email button is a plain deep link
 * (no login token). Signed in → straight to that page; signed out → the sign-in page, then that
 * exact page; an unsafe `next` is ignored.
 */
test.beforeEach(async ({ page }) => {
  forbidRealBackends(page);
  await resetStack();
});

/** The "ideas ready" email's button (email.server.ts → sendIdeasReadyEmail). */
const ideasLink = (businessDnaId: string) =>
  `/dashboard/opportunities?consultation=${encodeURIComponent(businessDnaId)}`;

test("signed in: the ideas-ready link opens the three directions in under 2 s", async ({
  page,
  context,
}) => {
  const user = await createUser({ fullName: "Asha Verma" });
  const seeded = await seedDirections(user.id);
  await signIn(context, user);
  // Warm the server once (the first request of a fresh test server compiles routes).
  await gotoApp(page, "/dashboard/settings");

  const t0 = Date.now();
  await page.goto(ideasLink(seeded.businessDnaId));
  await expect(page.getByTestId("opportunities-page")).toBeVisible();
  await expect(page.getByText(seeded.titles[0]).first()).toBeVisible();
  const ms = Date.now() - t0;
  console.log(`[email-links] signed in → directions in ${ms} ms`);
  expect(ms).toBeLessThan(2_000);
  // Straight there: no homepage, no opening, no sign-in.
  expect(new URL(page.url()).pathname).toBe("/dashboard/opportunities");
  await expect(page.getByTestId("cinematic-home")).toHaveCount(0);
});

test("signed out: the link asks to sign in (directions line, Google first), then opens that exact page", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const user = await createUser({ fullName: "Asha Verma" });
  const seeded = await seedDirections(user.id);
  const link = ideasLink(seeded.businessDnaId);

  await page.goto(link);
  await expect(page).toHaveURL(/\/sign-in\?next=/);
  await expect(page.getByText("Sign in to see your three directions.")).toBeVisible();
  // Google first: its button comes before the email form.
  const google = await page.getByTestId("google-signin").boundingBox();
  const email = await page.locator("#page-signin-email").boundingBox();
  expect(google!.y).toBeLessThan(email!.y);

  await page.locator("#page-signin-email").fill(user.email);
  await page.locator("#page-signin-password").fill(user.password);
  await page.locator("#page-signin-password").press("Enter");
  await expect(page).toHaveURL(
    new RegExp(`/dashboard/opportunities\\?consultation=${seeded.businessDnaId}$`),
    {
      timeout: 30_000,
    },
  );
  await expect(page.getByText(seeded.titles[0]).first()).toBeVisible({ timeout: 30_000 });
});

test("signed out: Google's button returns to the reminder email's mission link", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await fakeGoogleIdentity(page, { email: "mission.reader@example.com", name: "Ravi Kumar" });
  // The reminders-change link (a page every founder has).
  await page.goto("/dashboard/settings#reminders");
  await expect(page).toHaveURL(/\/sign-in\?next=/);
  await page.getByTestId("gis-button").click();
  await expect(page).toHaveURL(/\/dashboard\/settings(#reminders)?$/, { timeout: 30_000 });
});

test("an unsafe next (another site) is ignored after signing in", async ({ page }) => {
  test.setTimeout(60_000);
  const user = await createUser({ fullName: "Asha Verma" });
  for (const bad of ["https://evil.example/steal", "//evil.example/steal", "/\\evil.example"]) {
    await page.context().clearCookies();
    await gotoApp(page, `/sign-in?next=${encodeURIComponent(bad)}`);
    await page.locator("#page-signin-email").fill(user.email);
    await page.locator("#page-signin-password").fill(user.password);
    await page.locator("#page-signin-password").press("Enter");
    await expect(page).toHaveURL(/localhost:\d+\/dashboard/, { timeout: 30_000 });
    expect(new URL(page.url()).host).not.toContain("evil");
  }
});
