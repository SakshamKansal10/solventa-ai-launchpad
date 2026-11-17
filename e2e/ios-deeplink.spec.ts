import fs from "node:fs";

import { devices, expect, test, type Page } from "@playwright/test";

import { seedDirections } from "./helpers/seed";
import { createUser, forbidRealBackends, resetStack, signIn } from "./helpers/stack";

/**
 * Owner bug (2026-11-17): "See my three directions" tapped in the Gmail app on an iPhone opened
 * the page as raw HTML — no CSS, no app. iPhone WebKit with the Gmail/Google app's in-app browser
 * user agent, opening the email button's exact deep link, signed in and signed out; then the
 * failure itself (the site's files refused, as a firewall challenge does) and blocked storage.
 */
const IPHONE = devices["iPhone 13"];
test.use({
  browserName: "webkit",
  channel: "",
  viewport: IPHONE.viewport,
  deviceScaleFactor: IPHONE.deviceScaleFactor,
  isMobile: IPHONE.isMobile,
  hasTouch: IPHONE.hasTouch,
  // The Google app / Gmail in-app browser on iOS (GSA token).
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) GSA/330.0.661620966 Mobile/15E148 Safari/604.1",
});

const SHOTS = "docs/redesign/perf/iphone";

test.beforeEach(async ({ page }) => {
  forbidRealBackends(page);
  await resetStack();
  fs.mkdirSync(SHOTS, { recursive: true });
});

const ideasLink = (id: string) => `/dashboard/opportunities?consultation=${encodeURIComponent(id)}`;

/** Console errors, failed requests and every CSS/JS response, for the report. */
function watch(page: Page) {
  const errors: string[] = [];
  const failed: string[] = [];
  const assets: { url: string; status: number; type: string }[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text().slice(0, 160));
  });
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message.slice(0, 160)}`));
  page.on("requestfailed", (r) => failed.push(`${r.url()} ${r.failure()?.errorText}`));
  page.on("response", (r) => {
    if (/\/assets\/.+\.(css|js)$/.test(new URL(r.url()).pathname))
      assets.push({
        url: new URL(r.url()).pathname,
        status: r.status(),
        type: r.headers()["content-type"] ?? "",
      });
  });
  return { errors, failed, assets };
}

/** Raw HTML would show the skip link and unstyled nav as visible text. */
async function looksStyled(page: Page) {
  return page.evaluate(() => {
    const body = getComputedStyle(document.body);
    const sheetApplied =
      getComputedStyle(document.documentElement).getPropertyValue("--sol-navy").trim() !== "";
    return { sheetApplied, bodyVisible: body.visibility === "visible" };
  });
}

test("signed in: the email's deep link opens the styled directions page", async ({
  page,
  context,
}) => {
  test.setTimeout(90_000);
  const user = await createUser({ fullName: "Asha Verma" });
  const seeded = await seedDirections(user.id);
  await signIn(context, user);
  const w = watch(page);
  await page.goto(ideasLink(seeded.businessDnaId));
  await expect(page.getByTestId("opportunities-page")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(seeded.titles[0]).first()).toBeVisible();
  expect(await looksStyled(page)).toEqual({ sheetApplied: true, bodyVisible: true });
  await expect(page.getByTestId("load-fallback")).toBeHidden();
  const css = w.assets.filter((a) => a.url.endsWith(".css"));
  expect(css.length).toBeGreaterThan(0);
  for (const a of w.assets) expect(a.status, a.url).toBe(200);
  for (const a of css) expect(a.type).toContain("text/css");
  console.log(
    `[ios] signed in: ${w.assets.length} CSS/JS responses all 200; console errors: ${w.errors.length ? w.errors.join(" | ") : "none"}; failed: ${w.failed.length ? w.failed.join(" | ") : "none"}`,
  );
  await page.screenshot({ path: `${SHOTS}/signed-in-directions.png` });
});

test("signed out: the deep link opens the styled sign-in page with the directions line", async ({
  page,
}) => {
  const user = await createUser({ fullName: "Asha Verma" });
  const seeded = await seedDirections(user.id);
  const w = watch(page);
  await page.goto(ideasLink(seeded.businessDnaId));
  await expect(page).toHaveURL(/\/sign-in\?next=/);
  await expect(page.getByText("Sign in to see your three directions.")).toBeVisible();
  expect(await looksStyled(page)).toEqual({ sheetApplied: true, bodyVisible: true });
  await expect(page.getByTestId("load-fallback")).toBeHidden();
  console.log(
    `[ios] signed out: console errors: ${w.errors.length ? w.errors.join(" | ") : "none"}`,
  );
  await page.screenshot({ path: `${SHOTS}/signed-out-sign-in.png` });
});

test("the site's files refused (a firewall challenge): a styled panel, never raw HTML", async ({
  page,
  context,
}) => {
  test.setTimeout(60_000);
  const user = await createUser({ fullName: "Asha Verma" });
  const seeded = await seedDirections(user.id);
  await signIn(context, user);
  // What Vercel's challenge answers for a CSS or JS file the in-app browser asks for.
  await page.route(/\/assets\/.+\.(css|js)$/, (r) =>
    r.fulfill({
      status: 403,
      contentType: "text/html",
      body: "<!doctype html><title>Vercel Security Checkpoint</title>",
    }),
  );
  await page.goto(ideasLink(seeded.businessDnaId));
  const panel = page.getByTestId("load-fallback");
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("link", { name: "Try again" })).toHaveAttribute(
    "href",
    ideasLink(seeded.businessDnaId),
  );
  await expect(panel.getByRole("link", { name: "Sign in again" })).toBeVisible();
  // The raw page behind it is hidden: no "Skip to content", no bare nav links.
  await expect(page.getByText("Skip to content")).toBeHidden();
  await expect(page.getByRole("link", { name: "Directions" }).first()).toBeHidden();
  await page.screenshot({ path: `${SHOTS}/files-blocked-fallback.png` });
});

test("storage blocked (a strict in-app browser): the page still opens", async ({
  page,
  context,
}) => {
  test.setTimeout(60_000);
  const user = await createUser({ fullName: "Asha Verma" });
  const seeded = await seedDirections(user.id);
  await signIn(context, user);
  await page.addInitScript(() => {
    for (const name of ["localStorage", "sessionStorage"] as const)
      Object.defineProperty(window, name, {
        get() {
          throw new DOMException("The operation is insecure.", "SecurityError");
        },
      });
  });
  await page.goto(ideasLink(seeded.businessDnaId));
  await expect(page.getByTestId("opportunities-page")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("load-fallback")).toBeHidden();
});
