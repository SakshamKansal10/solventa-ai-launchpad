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
    await expect(page.getByTestId("intro-skip")).toBeVisible();

    await page.getByTestId("intro-choice-idea").click();
    await expect(page.getByTestId("intro-answer")).toHaveText(
      "Then you need to test it before you spend on it.",
    );
    // The answer leads out and the real lockup beneath is revealed (main carries the state).
    await expect(page.locator("main[data-intro-state=reveal]")).toHaveCount(1, { timeout: 5_000 });
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
    await expect(page.getByTestId("intro-return-dashboard")).toHaveCount(0);
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

  test("a signed-in founder coming back can go straight to the dashboard", async ({
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
    await page.getByTestId("intro-return-dashboard").click();
    await expect(page).toHaveURL(/\/dashboard/);
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

  test("Skip intro ends it at once; a reload never shows it, even on a first visit", async ({
    page,
  }) => {
    await gotoApp(page, "/?intro=auto");
    await page.getByTestId("intro-skip").click();
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
