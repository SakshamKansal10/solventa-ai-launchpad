import { readFileSync } from "node:fs";

import { expect, test } from "@playwright/test";

import { gotoApp } from "./helpers/page";
import { forbidRealBackends, resetStack } from "./helpers/stack";

type Frame = { id: string; scene: string; at: number; regression?: boolean };
const frames = JSON.parse(
  readFileSync(new URL("./cinematic-frames.json", import.meta.url), "utf8"),
) as Frame[];

/**
 * Lightweight visual regression for the cinematic homepage: a handful of
 * keyframes (marked "regression" in cinematic-frames.json), rendered
 * deterministically (?freeze=1) and compared with stored baselines.
 *
 * WebGL output depends on the GPU, so this is opt-in on the machine that owns
 * the baselines: CINEMATIC_VISUAL=1 npx playwright test e2e/cinematic-visual.spec.ts
 * (add --update-snapshots after an intended visual change).
 */
test.skip(!process.env.CINEMATIC_VISUAL, "opt-in: set CINEMATIC_VISUAL=1");
test.use({ viewport: { width: 1280, height: 720 } });

test.beforeEach(async ({ page }) => {
  forbidRealBackends(page);
  await resetStack();
});

test("cinematic keyframes match their baselines", async ({ page }) => {
  await gotoApp(page, "/cinematic?tier=high&freeze=1&debug=0");
  await expect(page.getByTestId("cinematic-home")).toHaveAttribute("data-ready", "true", {
    timeout: 45_000,
  });
  for (const frame of frames.filter((f) => f.regression)) {
    await page.evaluate(
      ([id, at]) => {
        const w = window as unknown as {
          __cine: { scenes: { id: string; start: number; end: number }[] };
        };
        const r = w.__cine.scenes.find((s) => s.id === id)!;
        const p = r.start + (r.end - r.start) * (at as number);
        const sec = document.querySelector<HTMLElement>("[data-testid=cinematic-timeline]")!;
        window.scrollTo(
          0,
          sec.getBoundingClientRect().top +
            window.scrollY +
            p * (sec.offsetHeight - window.innerHeight),
        );
      },
      [frame.scene, frame.at] as const,
    );
    await page.waitForTimeout(400);
    await expect(page).toHaveScreenshot(`${frame.id}.png`, { maxDiffPixelRatio: 0.03 });
  }
});
