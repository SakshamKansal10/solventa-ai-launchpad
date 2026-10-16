import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { gotoApp } from "./helpers/page";
import { forbidRealBackends, resetStack } from "./helpers/stack";

/**
 * The cinematic homepage — the official homepage at `/`, and the same page on its review route
 * `/cinematic` (tier, debug and frozen frames; not indexed). Tests drive the review route.
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

/** A caption's presence (0 → 1): the masked reveal reads it from --o, written every frame. */
const captionOpacity = (page: Page, id: string) =>
  page
    .locator(`[data-caption="${id}"]`)
    .evaluate((el) =>
      getComputedStyle(el).visibility === "hidden"
        ? 0
        : Number(getComputedStyle(el).getPropertyValue("--o") || 0),
    );

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
    // The opening is the identity alone, centred: one SOLVENTIA on screen, not two.
    await expect(page.locator("[data-brand-opening] [data-brand-part=word]")).toBeVisible();
    await expect(page.locator("[data-nav-brand]")).toHaveCSS("opacity", "0");
    await expect(page.locator("[data-brand-cue]")).toContainText(/scroll to explore/i);
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

  test("the opening identity travels into the site bar — one object — and comes back on the way up", async ({
    page,
  }) => {
    await open(page);
    const word = page.locator("[data-brand-opening] [data-brand-part=word]");
    const target = page.locator("[data-nav-brand] [data-brand-part=word]");
    const centre = await word.boundingBox();
    await goTo(page, "awakening", 0.3);
    await expect
      .poll(async () => {
        const [a, b] = [await word.boundingBox(), await target.boundingBox()];
        return a && b
          ? Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.width - b.width)
          : 1e9;
      })
      .toBeLessThan(3);
    await goTo(page, "void", 0);
    await expect
      .poll(async () => {
        const a = await word.boundingBox();
        return a && centre ? Math.abs(a.x - centre.x) + Math.abs(a.y - centre.y) : 1e9;
      })
      .toBeLessThan(3);
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
    // Home is the same film, on its official route.
    await nav.getByRole("link", { name: "Solventia home" }).click();
    await page.waitForURL((url) => url.pathname === "/");
    await expect(page.getByTestId("cinematic-home")).toBeVisible();
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
      // The seven still compositions (the finale presents the approved emblem itself).
      await expect(fallback.locator('img[src^="/cinematic/"]')).toHaveCount(7);
      // The still version's bar carries the identity on its pearl bar.
      await expect(page.locator("[data-nav-brand]")).toHaveCSS("opacity", "1");
      await expect(fallback.getByRole("heading", { level: 1 })).toHaveText(
        "Your reality. Made actionable.",
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

  test("the review route is hidden from search engines; the homepage is the same film, indexed", async ({
    page,
  }) => {
    await gotoApp(page, "/cinematic?tier=fallback");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await gotoApp(page, "/?tier=fallback");
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    await expect(page.getByTestId("cinematic-home")).toHaveAttribute("data-mode", "fallback");
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

  test("sound belongs to the experience: no control on arrival, it starts with the first interaction, mute is remembered", async ({
    page,
  }) => {
    await open(page);
    const toggle = page.getByTestId("sound-toggle");
    // Arriving: nothing plays and no utility competes with the film.
    await expect(toggle).toHaveCount(0);
    // The first real interaction starts it; only then does the quiet mute control appear.
    await page.mouse.click(400, 400);
    await expect(toggle).toHaveAttribute("data-audio", "running");
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    // Muting is immediate…
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await expect(toggle).toHaveAttribute("data-audio", "idle");
    // …and remembered for the visit: after a reload an interaction does not start it, and the
    // control is there to turn it back on.
    await page.reload();
    await expect(page.getByTestId("cinematic-home")).toHaveAttribute("data-ready", "true", {
      timeout: 45_000,
    });
    await page.mouse.click(400, 400);
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await expect(toggle).toHaveAttribute("data-audio", "idle");
    await toggle.click();
    await expect(toggle).toHaveAttribute("data-audio", "running");
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
    // No autoplay: nothing exists before the visitor's first interaction.
    expect(await sound((s) => s.context())).toBe("none");
    await goTo(page, "awakening", 0.7);
    await page.mouse.click(400, 400);
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect(toggle).toHaveAttribute("aria-label", "Mute sound");
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
    // The calls to action (sign-in and the CTA) recede together.
    const actions = nav.getByRole("link", { name: /Find My Business Idea/ }).locator("..");
    const opacity = () => actions.evaluate((el) => Number(getComputedStyle(el).opacity));
    const wordmark = nav.getByRole("link", { name: "Solventia home" });
    // In the film the visible identity is the opening lockup, now resting in the bar.
    const identity = page.locator("[data-brand-opening] [data-brand-part=word]");
    // On arrival the full bar is there.
    expect(await opacity()).toBeGreaterThan(0.99);
    // During the film the calls to action leave the frame entirely; the wordmark stays,
    // quietly, never below AA contrast.
    await goTo(page, "computation", 0.5);
    await expect.poll(opacity).toBeLessThan(0.05);
    await expect
      .poll(() => identity.evaluate((el) => Number(getComputedStyle(el).opacity)))
      .toBeGreaterThanOrEqual(0.54);
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
    const strongest = () =>
      page
        .locator("[data-anchor]")
        .evaluateAll((els) =>
          Math.max(0, ...els.map((el) => Number(getComputedStyle(el).opacity))),
        );
    // On the path, its milestones are named where they stand.
    await goTo(page, "build", 0.3);
    await expect.poll(strongest).toBeGreaterThan(0.3);
    await goTo(page, "context", 0.85);
    await expect.poll(strongest).toBe(0);
  });
});
