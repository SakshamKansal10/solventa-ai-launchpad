import fs from "node:fs";

import { chromium, devices, expect, test, type Page } from "@playwright/test";

import { gotoApp } from "./helpers/page";
import { forbidRealBackends } from "./helpers/stack";

/**
 * The home page's cinematic on every device (owner, 2026-11-17): the same cinematic layout always —
 * never the boxed still version — drawn live (WebGL), from the recording (no WebGL, or the live
 * world lost), or with crossfades (reduced motion). Slow first frames and slow running stay on the
 * cinematic layout; only quality inside the live film adapts.
 */
const SHOTS = "docs/redesign/perf/film-paths";
test.beforeEach(({ page }) => {
  forbidRealBackends(page);
  fs.mkdirSync(SHOTS, { recursive: true });
});

const HOME = "[data-testid=cinematic-home]";

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

/** The film position (0..1) the page is at — the recording's frame index must follow it. */
const progress = (page: Page) =>
  page.evaluate(
    () => (window as unknown as { __cine: { state: { progress: number } } }).__cine.state.progress,
  );

/** The boxed still version is gone for good; the cinematic layout is always there. */
async function expectCinematicLayout(page: Page) {
  await expect(page.getByTestId("cinematic-fallback")).toHaveCount(0);
  await expect(page.getByTestId("cinematic-timeline")).toBeAttached();
  await expect(page.getByTestId("recorded-film")).toBeAttached();
}

const noWebGl = () => {
  const real = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (
    this: HTMLCanvasElement,
    kind: string,
    ...rest: unknown[]
  ) {
    if (/webgl/i.test(kind)) return null;
    return (real as (...a: unknown[]) => unknown).call(this, kind, ...rest);
  } as typeof real;
};

test("WebGL disabled: the recorded film, scrubbed at the same positions — never the boxed card", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.addInitScript(noWebGl);
  await gotoApp(page, "/?freeze=1");
  await expect(page.locator(HOME)).toHaveAttribute("data-mode", "recorded", { timeout: 30_000 });
  await expectCinematicLayout(page);
  const film = page.getByTestId("recorded-film");
  await expect(film).toHaveAttribute("data-mode", "scrub");
  await expect(film).toHaveAttribute("data-film-set", "desktop");
  await page.screenshot({ path: `${SHOTS}/recorded-desktop-top.png` });
  await goTo(page, "universe", 0.5);
  await page.waitForTimeout(1500);
  const p = await progress(page);
  const frames = 240;
  await expect
    .poll(async () => Math.abs(Number(await film.getAttribute("data-frame")) - p * (frames - 1)), {
      timeout: 15_000,
    })
    .toBeLessThanOrEqual(1);
  await page.screenshot({ path: `${SHOTS}/recorded-desktop-universe.png` });
});

test("slow first frames and slow running (6× CPU) stay on the live cinematic layout", async ({
  page,
  context,
}) => {
  test.setTimeout(150_000);
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 6 });
  await gotoApp(page, "/?perf=1");
  await expect(page.locator(HOME)).toHaveAttribute("data-mode", "live", { timeout: 60_000 });
  await expectCinematicLayout(page);
  // While the live world prepares, the recording's frame for this position shows (no blank page).
  for (const [scene, at] of [
    ["awakening", 0.5],
    ["universe", 0.5],
    ["three", 0.5],
    ["finale", 0.5],
  ] as const) {
    await goTo(page, scene, at);
    await page.waitForTimeout(4_000);
    await expect(page.locator(HOME)).toHaveAttribute("data-mode", "live");
    await expectCinematicLayout(page);
  }
  const perf = await page.evaluate(
    () =>
      (window as unknown as { __cine: { state: { perf: { notch: number; dpr: number } } } }).__cine
        .state.perf,
  );
  console.log(
    `[film] 6× CPU: still live, quality level ${perf.notch + 1}, pixel ratio ${perf.dpr}`,
  );
});

test("a lost WebGL context hands the film to the recording at the same position", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await gotoApp(page, "/?perf=1&tier=lite");
  await expect(page.locator(HOME)).toHaveAttribute("data-ready", "true", { timeout: 60_000 });
  await goTo(page, "universe", 0.5);
  await page.waitForTimeout(2_000);
  const p = await progress(page);
  await page.evaluate(() => {
    const c = document.querySelector<HTMLCanvasElement>(
      "[data-cine-world] canvas:not([data-testid=recorded-film])",
    )!;
    const gl = (c.getContext("webgl2") ?? c.getContext("webgl")) as WebGL2RenderingContext;
    gl.getExtension("WEBGL_lose_context")!.loseContext();
  });
  await expect(page.locator(HOME)).toHaveAttribute("data-mode", "recorded", { timeout: 15_000 });
  await expectCinematicLayout(page);
  const film = page.getByTestId("recorded-film");
  // The recording shows the frame of the position the page is at (the scroll was not touched).
  await expect
    .poll(
      async () =>
        Math.abs(Number(await film.getAttribute("data-frame")) - (await progress(page)) * 239),
      { timeout: 15_000 },
    )
    .toBeLessThanOrEqual(1);
  console.log(
    `[film] context lost at progress ${p.toFixed(4)}; now ${(await progress(page)).toFixed(4)}`,
  );
});

test("?film=debug shows the path, the quality level and why", async ({ page }) => {
  await gotoApp(page, "/?film=debug&tier=lite");
  const dbg = page.getByTestId("film-debug");
  await expect(dbg).toHaveAttribute("data-path", "live", { timeout: 30_000 });
  await expect(dbg).toContainText("path: live");
  await expect(dbg).toContainText("why: WebGL2 available");
  await expect(dbg).toContainText(/quality: level \d of 4/);
});

test("desktop screenshots: the live film and the reduced-motion path", async ({ browser }) => {
  test.setTimeout(180_000);
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  forbidRealBackends(page);
  await gotoApp(page, "/?freeze=1");
  await expect(page.locator(HOME)).toHaveAttribute("data-ready", "true", { timeout: 90_000 });
  await page.screenshot({ path: `${SHOTS}/live-desktop-top.png` });
  await goTo(page, "universe", 0.5);
  await page.waitForTimeout(2_500);
  await page.screenshot({ path: `${SHOTS}/live-desktop-universe.png` });
  await page.close();

  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  const r = await ctx.newPage();
  forbidRealBackends(r);
  await gotoApp(r, "/?freeze=1");
  await expect(r.locator(HOME)).toHaveAttribute("data-mode", "reduced", { timeout: 30_000 });
  await r.screenshot({ path: `${SHOTS}/reduced-desktop-top.png` });
  await goTo(r, "universe", 0.5);
  await r.waitForTimeout(2_000);
  await expect(r.getByTestId("recorded-film")).toHaveAttribute("data-settled", "1");
  await r.screenshot({ path: `${SHOTS}/reduced-desktop-universe.png` });
  await ctx.close();
});

test("Android Chrome, low-end (Pixel 5, 4× CPU): the live cinematic, phone recording as the poster", async ({
  browser,
}) => {
  test.setTimeout(120_000);
  const { defaultBrowserType: _ignored, ...pixel } = devices["Pixel 5"];
  const ctx = await browser.newContext(pixel);
  const page = await ctx.newPage();
  forbidRealBackends(page);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await gotoApp(page, "/?perf=1");
  await expect(page.locator(HOME)).toHaveAttribute("data-mode", "live", { timeout: 60_000 });
  await expectCinematicLayout(page);
  await goTo(page, "universe", 0.5);
  await page.waitForTimeout(5_000);
  await expect(page.locator(HOME)).toHaveAttribute("data-mode", "live");
  await expect(page.getByTestId("recorded-film")).toHaveAttribute("data-film-set", "phone");
  await ctx.close();
});

// eslint-disable-next-line no-empty-pattern -- Playwright needs the fixtures argument to reach testInfo
test("Windows Chrome without a GPU (--disable-gpu, software WebGL) and 4× CPU: still the cinematic", async ({}, info) => {
  test.setTimeout(150_000);
  const browser = await chromium.launch({ channel: "chrome", args: ["--disable-gpu"] });
  try {
    const ctx = await browser.newContext({
      baseURL: info.project.use.baseURL,
      viewport: { width: 1366, height: 768 },
    });
    const page = await ctx.newPage();
    forbidRealBackends(page);
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await page.goto("/?film=debug");
    const home = page.locator(HOME);
    // Software WebGL is still WebGL: the live film, its quality adapting — or, if this machine's
    // Chrome offers no WebGL2 at all without a GPU, the recording. Never the boxed card.
    await expect(home).toHaveAttribute("data-mode", /^(live|recorded)$/, { timeout: 60_000 });
    await expectCinematicLayout(page);
    console.log(`[film] --disable-gpu: ${await page.getByTestId("film-debug").innerText()}`);
    await page.mouse.wheel(0, 3000);
    await page.waitForTimeout(6_000);
    await expectCinematicLayout(page);
    await expect(home).toHaveAttribute("data-mode", /^(live|recorded)$/);
  } finally {
    await browser.close();
  }
});
