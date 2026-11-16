import { expect, test } from "@playwright/test";

import { gotoApp } from "./helpers/page";
import { appUrl, createUser, forbidRealBackends, resetStack, signIn } from "./helpers/stack";

/**
 * The openings (redesign-v2 intro): the question on a first visit, "Welcome back." on a later
 * one. Automated browsers skip them unless ?intro asks: ?intro=1 always shows the question,
 * ?intro=return the welcome, ?intro=auto applies the real rules.
 */
test.beforeEach(async ({ page }) => {
  forbidRealBackends(page);
});

test.describe("What brings you here? (the opening)", () => {
  test("first visit: the question, a tapped choice, its answer, then Solventia — and it is remembered", async ({
    page,
  }) => {
    await gotoApp(page, "/?intro=auto");
    const intro = page.getByTestId("intro");
    await expect(page.getByTestId("intro-question")).toHaveText("What brings you here?");
    await expect(page.getByTestId("cinematic-home")).toHaveAttribute("aria-busy", "true");
    for (const c of ["start", "idea", "stuck"])
      await expect(page.getByTestId(`intro-choice-${c}`)).toBeVisible();
    // No visible Skip (owner, 2026-11-16): a screen-reader-only control, never on screen.
    expect(
      await page.getByTestId("intro-skip").evaluate((el) => el.getBoundingClientRect().width),
    ).toBeLessThanOrEqual(1);

    await page.getByTestId("intro-choice-idea").click();
    await expect(page.getByTestId("intro-answer")).toHaveText(
      "Then you need to test it before you spend on it.",
    );
    // The answer leads out and the real lockup beneath is revealed (main carries the state).
    await expect(page.locator("main[data-intro-state=reveal]")).toHaveCount(1, { timeout: 8_000 });
    // The words give way to the film (or, if the world is slow here, to the still version).
    await expect(intro).toHaveCount(0, { timeout: 15_000 });
    await expect(page.getByTestId("cinematic-home")).not.toHaveAttribute("aria-busy", "true");
    expect(await page.evaluate(() => sessionStorage.getItem("sol-intro-choice"))).toBe("idea");
    expect(await page.evaluate(() => localStorage.getItem("sol-intro-seen"))).not.toBeNull();

    // A returning visit: no question — one line for their earlier answer, then the lockup.
    await gotoApp(page, "/?intro=auto");
    await expect(page.getByTestId("intro")).toHaveCount(0);
    await expect(page.locator("[data-return-line=idea]")).toHaveText(
      "Still wondering if your idea will work?",
    );
    await expect(page.locator("[data-return-line=idea]")).toBeVisible();
    await expect(page.locator("[data-return-line=start]")).toBeHidden();
    await expect(page.getByTestId("intro-return")).toHaveCount(0, { timeout: 15_000 });
  });

  test("a visitor who saw it but never tapped a choice gets the question again", async ({
    page,
  }) => {
    await page.addInitScript(() => localStorage.setItem("sol-intro-seen", "2026-11-15"));
    await gotoApp(page, "/?intro=auto");
    await expect(page.getByTestId("intro-question")).toBeVisible();
    await expect(page.getByTestId("intro-return")).toHaveCount(0);
  });

  test("a signed-in founder is welcomed by name, with no button, and goes on into the film", async ({
    page,
    context,
  }) => {
    await resetStack();
    const user = await createUser({ fullName: "Asha Verma" });
    await signIn(context, user);
    await gotoApp(page, "/?intro=auto");
    await expect(page.getByTestId("intro-question")).toHaveCount(0);
    await expect(page.getByTestId("intro-return-title")).toHaveText("Welcome back, Asha.");
    await expect(page.getByTestId("intro-return-line")).toHaveText("Pick up where you left off.");
    await expect(
      page.locator("[data-intro-layer] a, [data-intro-layer] button:visible"),
    ).toHaveCount(0);
    // It ends by itself and hands over to the film.
    await expect(page.getByTestId("intro-return")).toHaveCount(0, { timeout: 20_000 });
  });

  test("without a tap, the question answers for the visitor after three seconds", async ({
    page,
  }) => {
    await gotoApp(page, "/?intro=1&tier=fallback");
    await expect(page.getByTestId("intro-question")).toBeVisible();
    await expect(page.getByTestId("intro-answer")).toHaveText(
      "Then you need a plan built around you.",
      { timeout: 5_000 },
    );
    // The default is not the visitor's answer: nothing is stored.
    expect(await page.evaluate(() => localStorage.getItem("sol-intro-choice"))).toBeNull();
  });

  test("Esc ends it at once; a reload never shows it, even on a first visit", async ({ page }) => {
    await gotoApp(page, "/?intro=auto");
    await expect(page.getByTestId("intro-question")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("intro")).toHaveCount(0);
    await expect(page.getByTestId("cinematic-home")).toHaveAttribute("data-intro-state", "off");

    // Forget the visit, then reload: a reload arrives part-way, so there is no question.
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.getByTestId("cinematic-home")).toHaveAttribute("data-intro-state", "off");
    expect(await page.evaluate(() => document.documentElement.dataset.intro ?? null)).toBeNull();
  });

  test("the film tailors one line to the answer, and the opening hands over to the film", async ({
    page,
  }) => {
    await gotoApp(page, "/?intro=1&tier=lite");
    await expect(page.getByTestId("cinematic-home")).toHaveAttribute("data-mode", "lite");
    await page.getByTestId("intro-choice-stuck").click();
    await expect(page.locator("[data-caption=awakening]")).toContainText(
      "The next step that moves you, from where you actually are.",
    );
    // Either the world was ready at the lockup, or the lockup held (no scrolling) until it was —
    // or, after 8 s, the visit was given the still version. It never waits forever.
    await expect(page.getByTestId("cinematic-home")).toHaveAttribute("data-intro-state", "off", {
      timeout: 20_000,
    });
    const mode = await page.getByTestId("cinematic-home").getAttribute("data-mode");
    expect(["lite", "fallback"]).toContain(mode);
    if (mode === "lite")
      await expect(page.getByTestId("cinematic-home")).toHaveAttribute("data-ready", "true");
  });

  test("Hindi: the question and choices in Hindi", async ({ page, context }) => {
    await context.addCookies([{ name: "solventia-locale", value: "hi", url: appUrl() }]);
    await gotoApp(page, "/?intro=1&tier=fallback");
    await expect(page.getByTestId("intro-question")).toHaveText("आप यहाँ किसलिए आए हैं?");
    await expect(page.getByTestId("intro-choice-idea")).toContainText("मेरे पास एक आइडिया है।");
  });
});

test("after the reveal the S is ONE whole logo: the halves and the glint are gone", async ({
  page,
}) => {
  await gotoApp(page, "/?intro=1");
  await page.getByTestId("intro-choice-start").click();
  await expect(page.getByTestId("cinematic-home")).not.toHaveAttribute(
    "data-intro-state",
    /ask|reveal/,
    { timeout: 20_000 },
  );
  const mark = page.locator("[data-brand-opening] [data-rv-mark]").first();
  await expect(mark.locator("[data-rv-whole] img")).toBeVisible();
  await expect(mark.locator("[data-rv-half]")).toBeHidden();
  await expect(mark.locator("[data-rv=glint]")).toBeHidden();
});

/**
 * The opening's own clock, exact even while the page is busy (a rAF sampler misses frames then):
 * when the answer was inserted and when an opening started its exit, from DOM mutations (same task
 * as React's commit). The returning openings' text appears at the first contentful paint.
 */
async function recordOpeningClock(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __ansAt?: number; __exitAt?: number };
    new MutationObserver(() => {
      if (!w.__ansAt && document.querySelector("[data-testid=intro-answer]"))
        w.__ansAt = performance.now();
      if (!w.__exitAt && document.querySelector("[data-intro-layer][data-phase=reveal]"))
        w.__exitAt = performance.now();
    }).observe(document, { subtree: true, childList: true, attributes: true });
  });
}
async function openingClock(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const w = window as unknown as { __ansAt?: number; __exitAt?: number };
    const fcp = performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? NaN;
    return { fcp, ansAt: w.__ansAt ?? NaN, exitAt: w.__exitAt ?? NaN };
  });
}

test("signed in: 'Welcome back, Saksham.' from the first visible frame, never changing; after the wipe starts it never comes back", async ({
  page,
  context,
}) => {
  test.setTimeout(90_000);
  await resetStack();
  const user = await createUser({ fullName: "Saksham Kansal" });
  await signIn(context, user);
  // The server is slow (getWelcomeInfo and every other call +3 s): the words must not wait on it.
  await page.route("**/_serverFn/**", async (route) => {
    await new Promise((ok) => setTimeout(ok, 3_000));
    await route.continue();
  });
  await page.addInitScript(() => {
    const w = window as unknown as {
      __frames: {
        t: number;
        text: string | null;
        o: number;
        line: string | null;
        lo: number;
        phase: string | null;
      }[];
    };
    w.__frames = [];
    const t0 = performance.now();
    const tick = () => {
      const h = document.querySelector("[data-testid=intro-return-title]");
      const l = document.querySelector("[data-intro-layer=signedin] [data-welcome-line]");
      const layer = document.querySelector("[data-intro-layer=signedin]");
      const seen = (el: Element | null) => {
        if (!el || !layer || getComputedStyle(layer).display === "none") return 0;
        let o = 1;
        for (let e: Element | null = el; e && e !== document.body; e = e.parentElement)
          o *= Number(getComputedStyle(e).opacity);
        return o;
      };
      const o = seen(h);
      w.__frames.push({
        t: Math.round(performance.now() - t0),
        text: h?.textContent ?? null,
        o,
        line: l?.textContent ?? null,
        lo: seen(l),
        phase: layer?.getAttribute("data-phase") ?? null,
      });
      if (performance.now() - t0 < 9_000) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await recordOpeningClock(page);
  await page.goto(`${appUrl()}/?intro=signedin`);
  // The second line fades in 1.2 s after the title, by CSS from the first paint.
  await expect(page.locator("[data-intro-layer=signedin] [data-welcome-line]")).toHaveCSS(
    "animation-delay",
    "1.2s",
  );
  await page.waitForTimeout(9_500);
  const frames = await page.evaluate(
    () =>
      (
        window as unknown as {
          __frames: {
            t: number;
            text: string | null;
            o: number;
            line: string | null;
            lo: number;
            phase: string | null;
          }[];
        }
      ).__frames,
  );
  const shown = frames.filter((f) => f.o > 0.01);
  expect(shown.length).toBeGreaterThan(20);
  // From the first visible frame: the final words, and only those.
  expect([...new Set(shown.map((f) => f.text))]).toEqual(["Welcome back, Saksham."]);
  // The second line: chosen before the first paint, never changing, and not yet showing when the
  // title first does.
  const lineShown = frames.filter((f) => f.lo > 0.01);
  expect([...new Set(lineShown.map((f) => f.line))]).toHaveLength(1);
  expect(shown[0].lo).toBeLessThan(0.01);
  // From the start of the exit: its opacity only ever falls, and once gone it never returns.
  const exit = frames.findIndex((f) => f.phase === "reveal");
  expect(exit).toBeGreaterThan(0);
  // The text never holds longer than 4.0 s after it first appears (one frame of slack).
  const clock = await openingClock(page);
  const held = clock.exitAt - clock.fcp;
  console.log(
    `[signed in] text held ${Math.round(held)} ms (first paint ${Math.round(clock.fcp)} ms)`,
  );
  expect(held).toBeLessThanOrEqual(4_050);
  let last = 1;
  for (const f of frames.slice(exit)) {
    expect(f.o).toBeLessThanOrEqual(last + 0.001);
    last = f.o;
  }
});

for (const path of ["world", "flat"] as const)
  test(`the hand-off (${path} path): the S never moves (≤ 1 px) or disappears from the end of the reveal into the film`, async ({
    page,
  }) => {
    test.setTimeout(90_000);
    if (path === "flat") {
      // The world is late (its bundle arrives 7 s after it is asked for): the text's 4 s cap comes
      // first, so the reveal runs on the pearl sky alone and the world joins after it.
      await page.route("**/CinematicCanvas-*.js", async (route) => {
        await new Promise((ok) => setTimeout(ok, 7_000));
        await route.continue();
      });
    }
    await page.addInitScript(() => {
      const w = window as unknown as {
        __marks: {
          t: number;
          state: string | null;
          x: number;
          y: number;
          w: number;
          h: number;
          vis: boolean;
          ready: boolean;
        }[];
      };
      w.__marks = [];
      const t0 = performance.now();
      const tick = () => {
        const main = document.querySelector("main[data-intro-state]");
        const mark = document.querySelector("[data-brand-opening] [data-rv-mark]");
        if (main && mark) {
          const halves =
            getComputedStyle(mark.querySelector("[data-rv-half]")!).visibility === "visible";
          const img = mark.querySelector(halves ? "[data-rv=top] img" : "[data-rv-whole] img")!;
          const r = img.getBoundingClientRect();
          let o = 1;
          for (let e: Element | null = img; e && e !== document.body; e = e.parentElement)
            o *= Number(getComputedStyle(e).opacity);
          const vis = o > 0.98 && getComputedStyle(img).visibility === "visible";
          w.__marks.push({
            t: Math.round(performance.now() - t0),
            state: main.getAttribute("data-intro-state"),
            x: r.left,
            y: r.top,
            w: r.width,
            h: r.height,
            vis,
            ready: main.getAttribute("data-ready") === "true",
          });
        }
        if (performance.now() - t0 < 20_000) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await recordOpeningClock(page);
    await gotoApp(page, "/?intro=1&tier=lite");
    if (path === "flat") await page.getByTestId("intro-choice-start").click();
    // The world path: the question answers itself after 3 s, by when the world is ready.
    else await page.getByTestId("intro-answer").waitFor({ timeout: 10_000 });
    await expect(page.getByTestId("cinematic-home")).toHaveAttribute("data-intro-state", "reveal", {
      timeout: 10_000,
    });
    const clock = await openingClock(page);
    const held = clock.exitAt - clock.ansAt;
    console.log(
      `[hand-off ${path}] at the exit:`,
      await page
        .getByTestId("cinematic-home")
        .evaluate((m) => [m.dataset.mode, m.dataset.ready, m.dataset.introPath].join(" ")),
    );
    await expect(page.getByTestId("cinematic-home")).toHaveAttribute("data-intro-path", path);
    // The answer never holds longer than the cap (4.0 s; one frame of slack).
    console.log(`[hand-off ${path}] answer held ${Math.round(held)} ms`);
    expect(held).toBeLessThanOrEqual(4_050);
    await expect(page.getByTestId("cinematic-home")).toHaveAttribute("data-intro-state", "off", {
      timeout: 30_000,
    });
    await page.waitForTimeout(1_200);
    const marks = await page.evaluate(
      () =>
        (
          window as unknown as {
            __marks: {
              t: number;
              state: string | null;
              x: number;
              y: number;
              w: number;
              h: number;
              vis: boolean;
              ready: boolean;
            }[];
          }
        ).__marks,
    );
    // Hitting the cap never downgrades the film: it is still the film, on its tier.
    await expect(page.getByTestId("cinematic-home")).toHaveAttribute("data-mode", /^(?!fallback)/);
    if (path === "flat")
      // The world drew nothing while the reveal ran (its first frames would stall it).
      expect(marks.filter((m) => m.state === "reveal" && m.ready)).toEqual([]);
    const endOfReveal = marks.findLastIndex((m) => m.state === "reveal");
    const off = marks.findIndex((m) => m.state === "off");
    expect(endOfReveal).toBeGreaterThan(0);
    // The S is settled 1.25 s before the reveal ends (its halves land at 2.2 s of 3.45 s).
    const start = marks.findIndex((m) => m.t >= marks[endOfReveal].t - 1_000);
    const window_ = marks.slice(start).filter((m) => m.t <= marks[off].t + 1_000);
    const ref = window_[0];
    for (const m of window_) {
      expect(m.vis, `S invisible at ${m.t} ms (${m.state})`).toBe(true);
      for (const k of ["x", "y", "w", "h"] as const)
        expect(Math.abs(m[k] - ref[k]), `${k} moved at ${m.t} ms (${m.state})`).toBeLessThanOrEqual(
          1,
        );
    }
  });
