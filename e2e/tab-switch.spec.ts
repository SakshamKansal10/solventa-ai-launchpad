import { expect, test, type Page } from "@playwright/test";

import { founderWithRoadmap } from "./helpers/flows";
import { forbidRealBackends, resetStack } from "./helpers/stack";

/**
 * Owner bug (2026-11-16): clicking a dashboard tab highlighted it at once, but the OLD page stayed
 * on screen for 6–7 s. Now, even with every server call 3 s slow, the new tab's page shows within
 * 300 ms — its name and skeletons, or its real content — the old page is gone, and the real
 * content replaces the skeleton when the data arrives.
 */
test.beforeEach(async ({ page }) => {
  forbidRealBackends(page);
  await resetStack();
});

const TABS = [
  ["nav-proof", "Proof"],
  ["nav-command", "Today"],
  ["nav-opportunities", "Directions"],
  ["nav-roadmap", "Roadmap"],
] as const;

/** Clicks the tab and, on the page's own clock, measures when the new page showed: its name in
 * the loading state, or a different headline than the old page's. */
async function clickAndTime(page: Page, testId: string, label: string) {
  return page.evaluate(
    ({ testId, label }) =>
      new Promise<{ ms: number; oldGone: boolean; how: string }>((done) => {
        const main = () => document.querySelector("#main") ?? document.body;
        const oldH1 = main().querySelector("h1")?.textContent ?? null;
        const t0 = performance.now();
        (
          document.querySelector(`[data-testid=topnav] [data-testid=${testId}]`) as HTMLElement
        ).click();
        const tick = () => {
          const ms = performance.now() - t0;
          const heading = main().querySelector("[data-testid=tab-heading]")?.textContent ?? null;
          const h1 = main().querySelector("h1")?.textContent ?? null;
          const oldGone = !oldH1 || !main().textContent?.includes(oldH1);
          if (heading === label && oldGone) return done({ ms, oldGone, how: "skeleton" });
          if (h1 && h1 !== oldH1 && oldGone) return done({ ms, oldGone, how: "content" });
          if (ms > 2_000)
            return done({ ms, oldGone, how: `timeout (h1 ${h1}, heading ${heading})` });
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    { testId, label },
  );
}

test("every tab shows its own page within 300 ms of the click, even with a 3 s server", async ({
  page,
  context,
}) => {
  test.setTimeout(240_000);
  await founderWithRoadmap(page, context);
  // A fresh page (nothing cached but what the server rendered), then a slow server.
  await page.reload();
  await expect(page.getByTestId("roadmap-page")).toBeVisible({ timeout: 30_000 });
  await page.route("**/_serverFn/**", async (route) => {
    await new Promise((ok) => setTimeout(ok, 3_000));
    await route.continue().catch(() => {});
  });

  for (const [testId, label] of TABS) {
    const r = await clickAndTime(page, testId, label);
    console.log(`[tab-switch] ${label}: page shown after ${Math.round(r.ms)} ms (${r.how})`);
    expect(r.how).not.toMatch(/^timeout/);
    expect(r.ms).toBeLessThanOrEqual(300);
    // The real content replaces the skeleton once the data arrives.
    await expect(page.locator("#main [data-testid=dash-skeleton]")).toHaveCount(0, {
      timeout: 15_000,
    });
    await expect(page.locator("#main h1").first()).toBeVisible();
  }
});

test("a tab whose code is still downloading shows its own page at once, then the real one", async ({
  page,
  context,
}) => {
  test.setTimeout(240_000);
  await founderWithRoadmap(page, context);
  // A slow connection: Proof's code takes 4 s to arrive (the router waits for it before it can
  // render the page — before the fix the old page stayed on screen all that time).
  await page.route(/\/assets\/proof-[\w-]+\.js$/, async (route) => {
    await new Promise((ok) => setTimeout(ok, 4_000));
    await route.continue().catch(() => {});
  });
  await page.reload();
  await expect(page.getByTestId("roadmap-page")).toBeVisible({ timeout: 30_000 });

  const r = await clickAndTime(page, "nav-proof", "Proof");
  console.log(
    `[tab-switch] Proof, code downloading: page shown after ${Math.round(r.ms)} ms (${r.how})`,
  );
  expect(r.how).toBe("skeleton");
  expect(r.ms).toBeLessThanOrEqual(300);
  await expect(page.getByTestId("page-switching")).toBeVisible();
  await expect(page.getByTestId("roadmap-page")).toHaveCount(0);
  // The real page replaces it once its code is here.
  await expect(page.getByTestId("page-switching")).toHaveCount(0, { timeout: 15_000 });
  await expect(page.locator("#main [data-testid=dash-skeleton]")).toHaveCount(0, {
    timeout: 15_000,
  });
  await expect(page.locator("#main h1").first()).toBeVisible();
});
