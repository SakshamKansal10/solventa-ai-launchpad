import { expect, test, type Page } from "@playwright/test";

import { founderWithDirections, founderWithRoadmap } from "./helpers/flows";
import { gotoApp } from "./helpers/page";
import {
  appUrl,
  createUser,
  forbidRealBackends,
  gemini,
  resetStack,
  signIn,
  sql,
} from "./helpers/stack";

/**
 * The whole dashboard as a founder uses it (owner, 2026-11-17, Job L): every page, back and
 * forward, a refresh on each page, double clicks — for a new and a returning founder, desktop and
 * phone, English and Hindi. Fails on any console error, failed request, crashed page or a page
 * without its heading.
 */
test.beforeEach(async ({ page }) => {
  forbidRealBackends(page);
  await resetStack();
});

function watch(page: Page) {
  const problems: string[] = [];
  page.on("pageerror", (e) => problems.push(`pageerror ${String(e).slice(0, 160)}`));
  page.on("console", (m) => {
    if (m.type() === "error") problems.push(`console ${m.text().slice(0, 160)}`);
  });
  page.on("response", (r) => {
    if (r.status() >= 400 && !/favicon|supabase\.co|accounts\.google/.test(r.url()))
      problems.push(`${r.status()} ${r.url().slice(0, 120)}`);
  });
  return problems;
}

/** The page is up: its heading is shown and nothing crashed. */
async function settled(page: Page, where: string) {
  await expect(page.locator("main :is(h1,h2)").first(), where).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("This page didn't load"), where).toHaveCount(0);
  await expect(page.getByTestId("error-panel"), where).toHaveCount(0);
  await expect(page.getByTestId("dash-skeleton"), where).toHaveCount(0, { timeout: 30_000 });
  // The assistant is always "Sol" (owner, 2026-11-17: an iPhone showed "Soul is thinking…").
  expect(await page.locator("body").innerText(), where).not.toMatch(/\bSoul\b/i);
}

for (const vp of [
  { name: "1440", width: 1440, height: 900 },
  { name: "390", width: 390, height: 844 },
]) {
  for (const locale of ["en", "hi"] as const) {
    test(`returning founder ${vp.name} ${locale}: every page, back/forward, refresh`, async ({
      page,
      context,
    }) => {
      test.setTimeout(300_000);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const { seeded } = await founderWithRoadmap(page, context);
      await context.addCookies([{ name: "solventia-locale", value: locale, url: appUrl() }]);
      const problems = watch(page);
      const id = seeded.opportunityIds[0];
      const pages = [
        "/dashboard",
        "/dashboard/opportunities",
        `/dashboard/opportunities/${id}`,
        `/dashboard/opportunities/${id}/fit`,
        `/dashboard/opportunities/${id}/market`,
        "/dashboard/roadmap",
        "/dashboard/proof",
        "/dashboard/history",
        "/dashboard/settings",
      ];
      for (const p of pages) {
        await gotoApp(page, p);
        await settled(page, p);
        await page.reload();
        await settled(page, `${p} after refresh`);
      }
      // A mission page, then back and forward through the history.
      await gotoApp(page, "/dashboard/roadmap");
      await page.getByTestId("mission-open").first().click();
      await expect(page.getByTestId("mission-page")).toBeVisible({ timeout: 30_000 });
      await page.reload();
      await expect(page.getByTestId("mission-page")).toBeVisible({ timeout: 30_000 });
      for (let i = 0; i < 4; i++) {
        await page.goBack();
        await settled(page, `back ${i + 1}`);
      }
      for (let i = 0; i < 3; i++) {
        await page.goForward();
        await settled(page, `forward ${i + 1}`);
      }
      expect(problems).toEqual([]);
    });
  }
}

test("new founder (no consultation): every page offers the next step, nothing breaks", async ({
  page,
  context,
}) => {
  test.setTimeout(150_000);
  const user = await createUser({ fullName: "Neha Rao" });
  await signIn(context, user);
  const problems = watch(page);
  for (const p of [
    "/dashboard",
    "/dashboard/opportunities",
    "/dashboard/roadmap",
    "/dashboard/proof",
    "/dashboard/history",
    "/dashboard/settings",
  ]) {
    await gotoApp(page, p);
    await expect(page.getByText("This page didn't load"), p).toHaveCount(0);
    await expect(page.getByTestId("dash-skeleton"), p).toHaveCount(0, { timeout: 30_000 });
    // Every empty page leads somewhere: the consultation, or a page that does.
    const next = page.locator('main a[href^="/consultation"], main a[href^="/dashboard"]');
    await expect(next.first(), `${p} has a next step`).toBeVisible({ timeout: 30_000 });
  }
  expect(problems).toEqual([]);
});

test("double clicks: choosing a direction twice chooses it once", async ({ page, context }) => {
  test.setTimeout(150_000);
  const { user, seeded } = await founderWithDirections(context);
  const problems = watch(page);
  await gotoApp(page, `/dashboard/opportunities/${seeded.opportunityIds[1]}`);
  await page.getByTestId("choose-direction").dblclick();
  await expect(page.getByTestId("build-roadmap")).toBeVisible({ timeout: 30_000 });
  const selected = await sql<{ id: string }>(
    "select id from opportunities where user_id = $1 and status = 'selected'",
    [user.id],
  );
  expect(selected.map((r) => r.id)).toEqual([seeded.opportunityIds[1]]);
  expect(problems).toEqual([]);
});

test('Ask Sol: the name stays "Sol" and is marked untranslatable (en + hi)', async ({
  page,
  context,
}) => {
  test.setTimeout(120_000);
  await founderWithDirections(context);
  for (const locale of ["en", "hi"] as const) {
    await context.addCookies([{ name: "solventia-locale", value: locale, url: appUrl() }]);
    await gotoApp(page, "/dashboard");
    await page.getByTestId("ask-sol-launcher").click();
    await gemini.delay("SOL_MESSAGE", 4_000);
    await page.getByTestId("ask-sol-input").fill("Listen one thing");
    // Send waits for the earlier conversation to load.
    await expect(page.getByTestId("ask-sol-send")).toBeEnabled({ timeout: 30_000 });
    await page.getByTestId("ask-sol-send").click();
    // The waiting line: "Sol is thinking…" / "Sol सोच रहा है…", its name never translatable.
    const thinking = page
      .getByTestId("ask-sol-panel")
      .getByText(locale === "en" ? "is thinking" : "सोच रहा है");
    await expect(thinking).toBeVisible();
    const name = thinking.locator("[data-sol-name]");
    await expect(name).toHaveText("Sol");
    await expect(name).toHaveAttribute("translate", "no");
    await expect(name).toHaveClass(/notranslate/);
    await expect(page.getByTestId("ask-sol-panel").locator("h2 [data-sol-name]")).toHaveText("Sol");
    expect(await page.locator("body").innerText()).not.toMatch(/\bSoul\b|सोल/i);
    await gemini.clearBehavior();
    await page.getByTestId("ask-sol-close").click();
  }
});
