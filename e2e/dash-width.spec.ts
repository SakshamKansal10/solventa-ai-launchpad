import { expect, test, type Page } from "@playwright/test";

import { founderWithRoadmap } from "./helpers/flows";
import { forbidRealBackends, resetStack } from "./helpers/stack";

/**
 * Dashboard width on desktop (owner, 2026-11-17): side padding 5vw − 32px (32px at 1280, ~46px at
 * 1568, 64px at 1920), content up to 1792px, the top bar and the page on the same edges, and the
 * phone unchanged (20px sides at 390).
 */
test.beforeEach(async ({ page }) => {
  forbidRealBackends(page);
  await resetStack();
});

const TABS = [
  ["Today", "/dashboard"],
  ["Directions", "/dashboard/opportunities"],
  ["Roadmap", "/dashboard/roadmap"],
  ["Proof", "/dashboard/proof"],
] as const;

async function frame(page: Page) {
  return page.evaluate(() => {
    const inner = (el: Element | null) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      const l = b.left + parseFloat(s.paddingLeft);
      const r = b.right - parseFloat(s.paddingRight);
      return { left: Math.round(l), right: Math.round(r), width: Math.round(r - l) };
    };
    return {
      top: inner(document.querySelector("[data-testid=topbar]")),
      main: inner(document.querySelector("#main")),
      h1: parseFloat(
        getComputedStyle(document.querySelector("#main h1") ?? document.body).fontSize,
      ),
    };
  });
}

test("content fills wide screens (1568, 1920), top bar and page aligned, phone unchanged", async ({
  page,
  context,
}) => {
  test.setTimeout(240_000);
  await founderWithRoadmap(page, context);
  for (const [w, h, sides] of [
    [1568, 744, 1568 * 0.05 - 32],
    [1920, 1080, 64],
    [390, 844, 20],
  ] as const) {
    await page.setViewportSize({ width: w, height: h });
    for (const [name, path] of TABS) {
      await page.goto(path);
      await expect(page.locator("#main h1").first()).toBeVisible({ timeout: 30_000 });
      const f = await frame(page);
      const label = `${name} at ${w}`;
      expect(f.main!.left, `${label}: left padding`).toBeGreaterThanOrEqual(Math.floor(sides) - 1);
      expect(f.main!.left, `${label}: left padding`).toBeLessThanOrEqual(Math.ceil(sides) + 1);
      expect(f.main!.width, `${label}: content width`).toBeGreaterThanOrEqual(
        Math.floor(w - 2 * sides) - 2,
      );
      expect(f.main!.width, `${label}: content cap`).toBeLessThanOrEqual(1792);
      if (w > 767) {
        // The top bar shares the frame: its edges are the page's edges.
        expect(Math.abs(f.top!.left - f.main!.left), `${label}: left edges`).toBeLessThanOrEqual(1);
        expect(Math.abs(f.top!.right - f.main!.right), `${label}: right edges`).toBeLessThanOrEqual(
          1,
        );
      }
      console.log(
        `[width] ${label}: content ${f.main!.width}px, sides ${f.main!.left}px, h1 ${f.h1}px`,
      );
    }
  }
});
