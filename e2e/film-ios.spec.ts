import fs from "node:fs";

import { devices, expect, test, type Page } from "@playwright/test";

import { gotoApp } from "./helpers/page";
import { forbidRealBackends } from "./helpers/stack";

/**
 * The home page's cinematic on an iPhone (owner, 2026-11-17: the Google app on his iPhone got the
 * boxed still version): iPhone WebKit with the Google/Gmail in-app browser's user agent. Every path
 * keeps the full cinematic layout; screenshots of each at iPhone size.
 */
const IPHONE = devices["iPhone 13"];
test.use({
  browserName: "webkit",
  channel: "",
  viewport: IPHONE.viewport,
  deviceScaleFactor: IPHONE.deviceScaleFactor,
  isMobile: IPHONE.isMobile,
  hasTouch: IPHONE.hasTouch,
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) GSA/330.0.661620966 Mobile/15E148 Safari/604.1",
});

const SHOTS = "docs/redesign/perf/film-paths";
const HOME = "[data-testid=cinematic-home]";
test.beforeEach(({ page }) => {
  forbidRealBackends(page);
  fs.mkdirSync(SHOTS, { recursive: true });
});

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
}

test("iPhone, Google app: the cinematic home page (live if WebGL works, else the recording)", async ({
  page,
}) => {
  test.setTimeout(150_000);
  await gotoApp(page, "/?freeze=1");
  const home = page.locator(HOME);
  await expect(home).toHaveAttribute("data-mode", /^(live|recorded)$/, { timeout: 60_000 });
  await expect(page.getByTestId("cinematic-fallback")).toHaveCount(0);
  await expect(page.getByTestId("cinematic-timeline")).toBeAttached();
  await expect(page.getByTestId("recorded-film")).toHaveAttribute("data-film-set", "phone", {
    timeout: 30_000,
  });
  const mode = await home.getAttribute("data-mode");
  console.log(`[film-ios] WebKit iPhone path: ${mode}`);
  if (mode === "live")
    await expect(home).toHaveAttribute("data-ready", "true", { timeout: 90_000 });
  await page.screenshot({ path: `${SHOTS}/${mode}-iphone-top.png` });
  await goTo(page, "universe", 0.5);
  await page.waitForTimeout(3_000);
  await page.screenshot({ path: `${SHOTS}/${mode}-iphone-universe.png` });
});

test("iPhone: WebGL unavailable → the recorded film; reduced motion → crossfades — same layout", async ({
  browser,
}) => {
  test.setTimeout(120_000);
  for (const path of ["recorded", "reduced"] as const) {
    const ctx = await browser.newContext({
      viewport: IPHONE.viewport,
      deviceScaleFactor: IPHONE.deviceScaleFactor,
      isMobile: true,
      hasTouch: true,
      reducedMotion: path === "reduced" ? "reduce" : "no-preference",
    });
    const page = await ctx.newPage();
    forbidRealBackends(page);
    if (path === "recorded")
      await page.addInitScript(() => {
        const real = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (
          this: HTMLCanvasElement,
          kind: string,
          ...rest: unknown[]
        ) {
          if (/webgl/i.test(kind)) return null;
          return (real as (...a: unknown[]) => unknown).call(this, kind, ...rest);
        } as typeof real;
      });
    await gotoApp(page, "/?freeze=1");
    await expect(page.locator(HOME)).toHaveAttribute("data-mode", path, { timeout: 30_000 });
    await expect(page.getByTestId("cinematic-fallback")).toHaveCount(0);
    await expect(page.getByTestId("recorded-film")).toHaveAttribute("data-film-set", "phone");
    await page.screenshot({ path: `${SHOTS}/${path}-iphone-top.png` });
    await goTo(page, "universe", 0.5);
    await expect
      .poll(() => page.getByTestId("recorded-film").getAttribute("data-frame"), { timeout: 15_000 })
      .not.toBeNull();
    if (path === "reduced")
      // The crossfade ends on the scene's key frame, fully drawn.
      await expect(page.getByTestId("recorded-film")).toHaveAttribute("data-settled", "1");
    await page.waitForTimeout(1_500);
    await page.screenshot({ path: `${SHOTS}/${path}-iphone-universe.png` });
    await ctx.close();
  }
});
