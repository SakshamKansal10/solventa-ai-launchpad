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
      ["crisis", 0.6, "adaptation"],
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
    await expect(
      page.getByRole("tabpanel").getByText("Contradicted", { exact: true }),
    ).toBeVisible();
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
      // The nine still compositions (the product panel carries its own brand mark besides).
      await expect(fallback.locator('img[src^="/cinematic/"]')).toHaveCount(9);
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
    // Deep in the film the navigation recedes — it must stay legible (AA) while it does.
    await goTo(page, "computation", 0.5);
    await audit("immersed");
    await goTo(page, "product", 0.5);
    await audit("product");
    await goTo(page, "finale", 0.95);
    await audit("finale");
    await gotoApp(page, "/cinematic?tier=fallback");
    await expect(page.getByTestId("cinematic-fallback")).toBeVisible({ timeout: 45_000 });
    await audit("fallback");
    expect(findings).toEqual([]);
  });

  test("back and forward return to the same moment of the story", async ({ page }) => {
    await open(page);
    await goTo(page, "crisis", 0.5);
    const before = await cameraState(page);
    await page.getByTestId("cinematic-nav").getByRole("link", { name: "Solventia home" }).click();
    await page.waitForURL((url) => url.pathname === "/");
    await page.goBack();
    await expect(page.getByTestId("cinematic-home")).toHaveAttribute("data-ready", "true", {
      timeout: 45_000,
    });
    await expect.poll(async () => (await cameraState(page)).scene).toBe(before.scene);
    await page.goForward();
    await page.waitForURL((url) => url.pathname === "/");
    await page.goBack();
    await expect(page.getByTestId("cinematic-home")).toHaveAttribute("data-ready", "true", {
      timeout: 45_000,
    });
    await expect.poll(async () => (await cameraState(page)).scene).toBe(before.scene);
  });

  test("sound is off until asked for, plays on request, and is remembered for the visit", async ({
    page,
  }) => {
    await open(page);
    const toggle = page.getByTestId("sound-toggle");
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await expect(toggle).toHaveAttribute("data-audio", "idle");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect(toggle).toHaveAttribute("data-audio", "running");
    // A reload keeps the choice, but audio waits for the visitor's next interaction.
    await page.reload();
    await expect(page.getByTestId("cinematic-home")).toHaveAttribute("data-ready", "true", {
      timeout: 45_000,
    });
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect(toggle).toHaveAttribute("data-audio", "idle");
    await page.mouse.click(400, 400);
    await expect(toggle).toHaveAttribute("data-audio", "running");
    // Muting is immediate and also remembered.
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await expect(toggle).toHaveAttribute("data-audio", "idle");
  });

  test("live sound: real output follows the scene, cues play once, mute is silence, leaving tears it down", async ({
    page,
  }) => {
    await open(page);
    type Sound = { level: () => number; context: () => string; fired: () => number };
    const sound = <T>(fn: (s: Sound) => T) =>
      page.evaluate((src) => {
        const s = (window as unknown as { __cine: { sound: Sound } }).__cine.sound;
        return new Function("s", `return (${src})(s)`)(s) as never;
      }, fn.toString()) as Promise<T>;
    const peak = async () => {
      let max = 0;
      for (let k = 0; k < 20; k++) {
        max = Math.max(max, await sound((s) => s.level()));
        await page.waitForTimeout(60);
      }
      return max;
    };
    const toggle = page.getByTestId("sound-toggle");
    await expect(toggle).toContainText(/sound/i);
    // No autoplay: nothing exists until the visitor asks.
    expect(await sound((s) => s.context())).toBe("none");
    await goTo(page, "awakening", 0.7);
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() => sound((s) => s.context())).toBe("running");
    // Real signal reaches the destination.
    await expect.poll(peak, { timeout: 10_000 }).toBeGreaterThan(0.005);
    // Travelling forward through the Engine's completion plays its cues…
    const before = await sound((s) => s.fired());
    for (let k = 0; k <= 30; k++) await goTo(page, "awakening", 0.7 + k * 0.01);
    expect(await sound((s) => s.fired())).toBeGreaterThan(before);
    // …and wiggling around one boundary does not re-trigger anything.
    const settled = await sound((s) => s.fired());
    for (let k = 0; k < 8; k++) await goTo(page, "awakening", 0.9 + (k % 2 ? 0.003 : -0.003));
    expect(await sound((s) => s.fired())).toBe(settled);
    // Mute is silence; un-mute restores the current scene's soundscape.
    await toggle.click();
    await expect.poll(() => sound((s) => s.level()), { timeout: 10_000 }).toBe(0);
    await toggle.click();
    await expect.poll(peak, { timeout: 10_000 }).toBeGreaterThan(0.005);
    // Leaving the page tears the audio down.
    await page.evaluate(() => {
      const w = window as unknown as { __cine: { sound: unknown }; __soundRef: unknown };
      w.__soundRef = w.__cine.sound;
    });
    await page.getByTestId("cinematic-nav").getByRole("link", { name: "Solventia home" }).click();
    await page.waitForURL((url) => url.pathname === "/");
    await expect
      .poll(() =>
        page.evaluate(() =>
          (window as unknown as { __soundRef: { context: () => string } }).__soundRef.context(),
        ),
      )
      .toBe("none");
  });

  test("the still version offers no sound at all", async ({ page }) => {
    await gotoApp(page, "/cinematic?tier=fallback");
    await expect(page.getByTestId("cinematic-fallback")).toBeVisible({ timeout: 45_000 });
    await expect(page.getByTestId("sound-toggle")).toHaveCount(0);
  });

  test("the ending is protected: the footer arrives below the finale, never over it", async ({
    page,
  }) => {
    await open(page);
    await goTo(page, "finale", 1);
    const cta = page.getByTestId("cinematic-cta");
    await expect(cta).toBeVisible();
    // Scroll on into the footer: the stage leaves with the page instead of being covered.
    await page.evaluate(() => window.scrollBy(0, Math.round(window.innerHeight * 0.45)));
    await expect
      .poll(async () => {
        const ctaBox = await cta.boundingBox();
        const footerTop = await page
          .locator("footer")
          .first()
          .evaluate((f) => f.getBoundingClientRect().top);
        return ctaBox ? ctaBox.y + ctaBox.height <= footerTop + 1 : false;
      })
      .toBe(true);
  });

  test("the site bar leaves the film, stays reachable, and returns for the product", async ({
    page,
  }) => {
    await open(page);
    const nav = page.getByTestId("cinematic-nav");
    const links = nav.getByRole("navigation").locator("ul").first();
    const opacity = () => links.evaluate((el) => Number(getComputedStyle(el).opacity));
    const wordmark = nav.getByRole("link", { name: "Solventia home" });
    // On arrival the full bar is there.
    expect(await opacity()).toBeGreaterThan(0.99);
    // During the film the links and calls to action leave the frame entirely; the wordmark stays,
    // quietly, never below AA contrast.
    await goTo(page, "computation", 0.5);
    await expect.poll(opacity).toBeLessThan(0.05);
    expect(
      await wordmark.evaluate((el) => Number(getComputedStyle(el).opacity)),
    ).toBeGreaterThanOrEqual(0.54);
    // Pointer and keyboard both bring the whole bar back at once.
    await nav.hover();
    await expect.poll(opacity).toBeGreaterThan(0.99);
    await page.mouse.move(700, 500);
    await expect.poll(opacity).toBeLessThan(0.05);
    await wordmark.focus();
    await expect.poll(opacity).toBeGreaterThan(0.99);
    await wordmark.blur();
    // The product is part of the site again: the bar returns.
    await goTo(page, "product", 0.5);
    await expect.poll(opacity).toBeGreaterThan(0.99);
  });

  test("world labels never linger after a jump to another part of the story", async ({ page }) => {
    await open(page);
    const label = page.locator("[data-anchor=finalist-0]");
    const opacity = () => label.evaluate((el) => Number(getComputedStyle(el).opacity));
    // The overview of the three futures: every direction is named on screen.
    await goTo(page, "three", 0.97);
    await expect.poll(opacity).toBeGreaterThan(0.5);
    await goTo(page, "context", 0.85);
    await expect.poll(opacity).toBe(0);
  });
});
