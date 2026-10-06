import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { gotoApp } from "./helpers/page";
import { forbidRealBackends, resetStack } from "./helpers/stack";

/**
 * The cinematic homepage (/cinematic). The live homepage (/) is covered by
 * public.spec.ts and must be untouched by it.
 *
 * ?freeze=1 makes frames deterministic (no smoothing, no ambient motion) and
 * exposes the scene ranges for positioning. Headless Chrome on CI may only
 * have a software GPU, which the device check routes to the still version, so
 * WebGL tests force a tier with ?tier=.
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

async function open(page: Page, query = "tier=medium&freeze=1") {
  await gotoApp(page, `/cinematic?${query}`);
  const home = page.getByTestId("cinematic-home");
  await expect(home).toHaveAttribute("data-ready", "true", { timeout: 45_000 });
  return home;
}

/** Scroll to a point inside a scene (needs ?freeze or ?debug for the scene table). */
async function goTo(page: Page, scene: string, at: number) {
  await page.evaluate(
    ([id, l]) => {
      const w = window as unknown as {
        __cine: { scenes: { id: string; start: number; end: number }[] };
      };
      const r = w.__cine.scenes.find((s) => s.id === id)!;
      const p = r.start + (r.end - r.start) * (l as number);
      const sec = document.querySelector<HTMLElement>("[data-testid=cinematic-timeline]")!;
      const top = sec.getBoundingClientRect().top + window.scrollY;
      window.scrollTo(0, top + p * (sec.offsetHeight - window.innerHeight));
    },
    [scene, at] as const,
  );
  await page.waitForTimeout(250);
}

const captionOpacity = (page: Page, id: string) =>
  page.locator(`[data-caption="${id}"]`).evaluate((el) => Number(getComputedStyle(el).opacity));

const cameraState = (page: Page) =>
  page.evaluate(() => {
    const s = (window as unknown as { __cine: { state: { camera: object; sceneIndex: number } } })
      .__cine.state;
    return { camera: { ...s.camera }, scene: s.sceneIndex };
  });

test.describe("cinematic homepage", () => {
  test("the whole story plays on one WebGL stage, scene by scene", async ({ page }) => {
    const errors = collectErrors(page);
    const home = await open(page);
    await expect(home).toHaveAttribute("data-mode", "webgl");
    await expect(page.locator("canvas")).toHaveCount(1);
    expect(await captionOpacity(page, "void")).toBeGreaterThan(0.9);
    for (const [scene, at, caption] of [
      ["awakening", 0.8, "awakening"],
      ["context", 0.5, "context"],
      ["selection", 0.85, "selection"],
      ["validate", 0.5, "validate"],
      ["crisis", 0.6, "evidence"],
      ["adaptation", 0.7, "adaptation"],
      ["finale", 0.9, "finale"],
    ] as const) {
      await goTo(page, scene, at);
      await expect.poll(() => captionOpacity(page, caption)).toBeGreaterThan(0.9);
    }
    expect(errors).toEqual([]);
  });

  test("every transformation is reversible: back, forward and jumps land on the same frame", async ({
    page,
  }) => {
    await open(page);
    await goTo(page, "computation", 0.5);
    const first = await cameraState(page);
    await goTo(page, "finale", 0.6); // jump far forward
    await goTo(page, "universe", 0.1); // then back past it
    await goTo(page, "computation", 0.5);
    const again = await cameraState(page);
    expect(again.scene).toBe(first.scene);
    for (const axis of ["x", "y", "z"] as const) {
      expect((again.camera as Record<string, number>)[axis]).toBeCloseTo(
        (first.camera as Record<string, number>)[axis],
        5,
      );
    }
  });

  test("a refresh mid-story resumes where the visitor was", async ({ page }) => {
    await open(page);
    await goTo(page, "build", 0.5);
    const before = await cameraState(page);
    await page.reload();
    await expect(page.getByTestId("cinematic-home")).toHaveAttribute("data-ready", "true", {
      timeout: 45_000,
    });
    await expect.poll(async () => (await cameraState(page)).scene).toBe(before.scene);
  });

  test("the 3D surface becomes the real, keyboard-operable interface", async ({ page }) => {
    await open(page);
    await goTo(page, "product", 0.5);
    const preview = page.getByTestId("product-preview");
    await expect(preview).toBeVisible();
    await expect(page.getByText("Illustrative preview · sample founder")).toBeVisible();
    const direction = page.getByRole("tab", { name: "Direction" });
    await direction.focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("tab", { name: "This week" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await page.getByRole("tab", { name: "Evidence" }).click();
    await expect(page.getByText("Contradicted")).toBeVisible();
    // Real DOM: text is selectable, not painted into the canvas.
    expect(await preview.evaluate((el) => getComputedStyle(el).userSelect)).not.toBe("none");
    // Outside the product scene it is inert (not focusable, not clickable).
    await goTo(page, "adaptation", 0.5);
    expect(
      await page.locator("[data-testid=product-preview]").evaluate((el) => el.parentElement?.inert),
    ).toBe(true);
  });

  test("the finale's call to action opens the consultation", async ({ page }) => {
    await open(page);
    await goTo(page, "finale", 0.95);
    const cta = page.getByTestId("cinematic-cta");
    await expect(cta).toBeVisible();
    await cta.click();
    await page.waitForURL((url) => url.pathname === "/consultation");
  });

  test("cinematic navigation keeps sign-in and the real routes", async ({ page }) => {
    await open(page);
    const nav = page.getByTestId("cinematic-nav");
    await nav.getByRole("button", { name: "Sign In" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await nav.getByRole("link", { name: "Solventia home" }).click();
    await page.waitForURL((url) => url.pathname === "/");
    await expect(page.locator("canvas")).toHaveCount(0);
    await page.goBack();
    await expect(page.getByTestId("cinematic-home")).toHaveAttribute("data-ready", "true", {
      timeout: 45_000,
    });
    await expect(page.locator("canvas")).toHaveCount(1);
  });

  test("the canvas follows the viewport through resizes, without horizontal overflow", async ({
    page,
  }) => {
    await open(page, "tier=low&freeze=1");
    await goTo(page, "three", 0.5);
    for (const [width, height] of [
      [390, 844],
      [820, 1180],
      [1180, 820],
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

  test("reduced motion gets the still narrative — same story, no WebGL", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    forbidRealBackends(page);
    try {
      await gotoApp(page, "/cinematic");
      const home = page.getByTestId("cinematic-home");
      await expect(home).toHaveAttribute("data-mode", "fallback", { timeout: 45_000 });
      await expect(page.locator("canvas")).toHaveCount(0);
      const fallback = page.getByTestId("cinematic-fallback");
      await expect(fallback.locator("img")).toHaveCount(9);
      await expect(fallback.getByRole("heading", { level: 1 })).toHaveText(
        "Every founder begins with uncertainty.",
      );
      await expect(fallback.getByTestId("product-preview")).toBeVisible();
      await expect(fallback.getByRole("link", { name: "Find My Business Idea" })).toHaveAttribute(
        "href",
        "/consultation",
      );
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

  test("no serious or critical accessibility violations — WebGL scenes and the still version", async ({
    page,
  }) => {
    const findings: string[] = [];
    const audit = async (label: string) => {
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      for (const v of results.violations) {
        if (v.impact === "serious" || v.impact === "critical") {
          findings.push(`${label}: ${v.id} — ${v.nodes[0]?.html.slice(0, 120) ?? ""}`);
        }
      }
    };
    await open(page, "tier=low&freeze=1");
    await audit("start");
    await goTo(page, "product", 0.5);
    await audit("product");
    await goTo(page, "finale", 0.95);
    await audit("finale");
    await gotoApp(page, "/cinematic?tier=fallback");
    await expect(page.getByTestId("cinematic-fallback")).toBeVisible({ timeout: 45_000 });
    await audit("fallback");
    expect(findings).toEqual([]);
  });
});
