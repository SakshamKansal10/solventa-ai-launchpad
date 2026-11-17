import { expect, test, type Page } from "@playwright/test";

import { founderWithDirections } from "./helpers/flows";
import { gotoApp } from "./helpers/page";
import { forbidRealBackends, resetStack, sql } from "./helpers/stack";

/**
 * Every dashboard page shows content within 2 s (owner, 2026-11-17, Job I: "Explore this
 * direction" took ~40 s on solventia.in). Opening a direction whose detail is saved must never
 * wait on an AI call, and the page's own content must be on screen within 2 s of the click.
 */
const LIMIT_MS = 2_000;

test.beforeEach(async ({ page }) => {
  forbidRealBackends(page);
  await resetStack();
});

/** Every server call the page makes, by name, with whether it was an AI-generating POST. */
function watchCalls(page: Page) {
  const posts: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/_serverFn/") && r.method() === "POST") posts.push(r.url());
  });
  return posts;
}

async function timeOpen(page: Page, click: () => Promise<void>) {
  const start = Date.now();
  const log: string[] = [];
  const onDone = (r: import("@playwright/test").Request) => {
    if (r.url().includes("/_serverFn/"))
      log.push(
        `${r.method()} +${Date.now() - start} ms (took ${Math.round(r.timing().responseEnd)} ms) ${r.url().split("/_serverFn/")[1].slice(0, 10)}`,
      );
  };
  page.on("requestfinished", onDone);
  await click();
  // The page's own content: its title at once, and the saved detail (the four lines).
  await expect(page.getByTestId("opportunity-title")).toBeVisible({ timeout: 30_000 });
  const title = Date.now() - start;
  await expect(page.getByTestId("block-customer")).toBeVisible({ timeout: 30_000 });
  const detail = Date.now() - start;
  page.off("requestfinished", onDone);
  if (process.env.OPEN_SPEED_DEBUG) console.log(log.join("\n"));
  return { title, detail };
}

test("Explore this direction (Today) opens the direction with its saved detail within 2 s", async ({
  page,
  context,
}) => {
  await founderWithDirections(context);
  const posts = watchCalls(page);
  await gotoApp(page, "/dashboard");
  const explore = page.getByTestId("flagship-explore");
  await expect(explore).toBeVisible({ timeout: 30_000 });
  await page.waitForLoadState("networkidle");
  const t = await timeOpen(page, () => explore.click());
  console.log(`[open-speed] Today → direction: title ${t.title} ms, detail ${t.detail} ms`);
  expect(t.detail).toBeLessThan(LIMIT_MS);
  expect(posts, "no write or AI call on page open").toEqual([]);
});

test("a direction from the Directions page, then its fit and market pages, each within 2 s", async ({
  page,
  context,
}) => {
  await founderWithDirections(context);
  const posts = watchCalls(page);
  await gotoApp(page, "/dashboard/opportunities");
  const open = page.locator('main a[href^="/dashboard/opportunities/"]').first();
  await expect(open).toBeVisible({ timeout: 30_000 });
  await page.waitForLoadState("networkidle");
  const t = await timeOpen(page, () => open.click());
  console.log(`[open-speed] Directions → direction: title ${t.title} ms, detail ${t.detail} ms`);
  expect(t.detail).toBeLessThan(LIMIT_MS);

  for (const link of ["link-fit", "link-market"]) {
    await page.getByTestId("opportunity-title").waitFor();
    const s = Date.now();
    await page.getByTestId(link).click();
    await expect(page.locator("main h1")).toBeVisible();
    await expect(page.getByTestId("dash-skeleton")).toHaveCount(0, { timeout: 30_000 });
    const ms = Date.now() - s;
    console.log(`[open-speed] direction → ${link}: ${ms} ms`);
    expect(ms).toBeLessThan(LIMIT_MS);
    await page.goBack();
  }
  expect(posts, "no write or AI call on page open").toEqual([]);
});

test("a very old direction without a saved detail still opens at once (the rest in the background)", async ({
  page,
  context,
}) => {
  const { seeded } = await founderWithDirections(context);
  const id = seeded.opportunityIds[1];
  await sql(`delete from public.opportunity_details where opportunity_id = '${id}'`);
  const posts = watchCalls(page);
  await gotoApp(page, "/dashboard/opportunities");
  await page.waitForLoadState("networkidle");
  const start = Date.now();
  await page.locator(`main a[href="/dashboard/opportunities/${id}"]`).first().click();
  await expect(page.getByTestId("opportunity-title")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("block-customer")).toBeVisible({ timeout: 30_000 });
  const ms = Date.now() - start;
  console.log(`[open-speed] old direction (no saved detail): ${ms} ms`);
  expect(ms).toBeLessThan(LIMIT_MS);
  // Its saved package is the detail: no AI call and no write on open (it used to call Gemini here).
  await page.waitForTimeout(1_500);
  expect(posts, "no write or AI call on page open").toEqual([]);
});
