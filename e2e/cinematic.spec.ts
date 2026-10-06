import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { gotoApp } from "./helpers/page";
import { forbidRealBackends, resetStack } from "./helpers/stack";

/**
 * Phase 1 of the cinematic homepage — a prototype on its own route
 * (/cinematic). The live homepage (/) is covered by public.spec.ts and must be
 * untouched by it.
 *
 * Headless Chrome on CI may only have a software GPU, which the device check
 * routes to the static fallback, so the WebGL tests force a tier with ?tier=.
 */

test.beforeEach(async ({ page }) => {
  forbidRealBackends(page);
  await resetStack();
});

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}

async function experienceReady(page: Page) {
  const home = page.getByTestId("cinematic-home");
  await expect(home).toHaveAttribute("data-ready", "true", { timeout: 30_000 });
  return home;
}

async function scrollToProgress(page: Page, progress: number) {
  await page.evaluate((p) => {
    const section = document.querySelector<HTMLElement>("[data-testid=cinematic-timeline]");
    if (!section) throw new Error("no timeline section");
    const top = section.getBoundingClientRect().top + window.scrollY;
    window.scrollTo(0, top + p * (section.offsetHeight - window.innerHeight));
  }, progress);
}

test.describe("cinematic homepage prototype", () => {
  test("one WebGL stage that scroll drives through all eight scenes", async ({ page }) => {
    const errors = collectErrors(page);
    await gotoApp(page, "/cinematic?tier=medium");
    const home = await experienceReady(page);
    await expect(home).toHaveAttribute("data-mode", "webgl");
    await expect(page.locator("canvas")).toHaveCount(1);
    await expect(page.getByTestId("cinematic-loader")).toHaveAttribute("data-state", "done");

    const overlay = page.getByTestId("cinematic-overlay");
    await expect(overlay).toHaveAttribute("data-scene", "chaos");
    await scrollToProgress(page, 0.44);
    await expect(overlay).toHaveAttribute("data-scene", "intelligence");
    await scrollToProgress(page, 1);
    await expect(overlay).toHaveAttribute("data-scene", "adaptation");
    await scrollToProgress(page, 0);
    await expect(overlay).toHaveAttribute("data-scene", "chaos");
    expect(errors).toEqual([]);
  });

  test("the canvas follows the viewport through resizes, without horizontal overflow", async ({
    page,
  }) => {
    await gotoApp(page, "/cinematic?tier=low");
    await experienceReady(page);
    for (const [width, height] of [
      [390, 844],
      [1024, 768],
      [1440, 900],
    ]) {
      await page.setViewportSize({ width, height });
      await expect
        .poll(() =>
          page
            .locator("canvas")
            .evaluate((c: HTMLCanvasElement) => `${c.clientWidth}x${c.clientHeight}`),
        )
        .toBe(`${width}x${height}`);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);
    }
  });

  test("leaving and coming back tears WebGL down and rebuilds it cleanly", async ({ page }) => {
    const errors = collectErrors(page);
    await gotoApp(page, "/cinematic?tier=low");
    await experienceReady(page);
    await page.locator('header a[href="/"]').first().click();
    await page.waitForURL((url) => url.pathname === "/");
    await expect(page.locator("canvas")).toHaveCount(0);
    await page.goBack();
    await experienceReady(page);
    await expect(page.locator("canvas")).toHaveCount(1);
    expect(errors).toEqual([]);
  });

  test("reduced motion gets the static page: no WebGL, no long scroll", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    forbidRealBackends(page);
    try {
      await gotoApp(page, "/cinematic");
      const home = await experienceReady(page);
      await expect(home).toHaveAttribute("data-mode", "fallback");
      await expect(page.locator("canvas")).toHaveCount(0);
      await expect(page.getByTestId("cinematic-timeline")).toHaveCount(0);
      await expect(page.getByTestId("cinematic-fallback").locator("li")).toHaveCount(8);
    } finally {
      await context.close();
    }
  });

  test("is hidden from search engines and leaves the homepage untouched", async ({ page }) => {
    await gotoApp(page, "/cinematic?tier=fallback");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await gotoApp(page, "/");
    await expect(page.locator("canvas")).toHaveCount(0);
    await expect(page.locator("h1").first()).toContainText("Your Dream.");
  });

  test("no serious or critical accessibility violations, WebGL or static", async ({ page }) => {
    const findings: string[] = [];
    for (const route of ["/cinematic?tier=low", "/cinematic?tier=fallback"]) {
      await gotoApp(page, route);
      await experienceReady(page);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      for (const v of results.violations) {
        if (v.impact === "serious" || v.impact === "critical") {
          findings.push(`${route}: ${v.id} — ${v.nodes[0]?.html.slice(0, 120) ?? ""}`);
        }
      }
    }
    expect(findings).toEqual([]);
  });
});
