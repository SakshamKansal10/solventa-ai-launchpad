import { expect, test, type Page } from "@playwright/test";

import { cont, expectScreen, pickCombo } from "./helpers/consultation";
import { gotoApp } from "./helpers/page";
import { appUrl, forbidRealBackends, resetStack } from "./helpers/stack";

/**
 * Picking several skills is quick (owner, 2026-11-17, Job J). Before: every pick closed the
 * picker, added a two-question card, and the list reopened at the top — 518 px, 1,530 px and
 * 2,086 px of scrolling to reach the 2nd, 3rd and 4th skill. Now each skill is a chip that toggles
 * in place; nothing moves; levels are asked once, on the next step.
 */
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

test.beforeEach(async ({ page }) => {
  forbidRealBackends(page);
  await resetStack();
});

async function toSkills(page: Page) {
  await gotoApp(page, "/consultation");
  await expectScreen(page, "basics");
  await page.getByTestId("input-age").fill("21");
  await page.getByTestId("opt-status-college_student").click();
  await cont(page);
  await expectScreen(page, "location");
  await pickCombo(page, "combo-country", "India");
  await pickCombo(page, "combo-state", "Haryana");
  await page.getByTestId("input-city").fill("Gurugram");
  await cont(page);
  await expectScreen(page, "education");
  await page.getByTestId("opt-education-bachelors").click();
  await pickCombo(page, "combo-major", /Computer science/);
  await page.getByTestId("opt-studyYear-y2").click();
  await cont(page);
  await expectScreen(page, "languagesTime");
  await page.getByTestId("opt-language-English").click();
  await page.getByTestId("opt-hours-h10_20").click();
  await cont(page);
  await expectScreen(page, "skills");
}

/** Every scroll position on the page (the window and any scrolling area). */
const scrolls = (page: Page) =>
  page.evaluate(() =>
    [document.scrollingElement!, ...document.querySelectorAll<HTMLElement>("*")]
      .filter(
        (e) =>
          e === document.scrollingElement ||
          (e.scrollHeight > e.clientHeight + 4 &&
            /(auto|scroll)/.test(getComputedStyle(e).overflowY)),
      )
      .map((e) => Math.round(e.scrollTop))
      .join(","),
  );

const box = async (page: Page, name: string) => {
  const b = await page.getByTestId(`skill-chip-${name}`).boundingBox();
  return b && { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width) };
};

test("390px phone: four skills in a row, nothing scrolls or moves, then one levels step", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await toSkills(page);
  // Mid-list, where the old picker hurt most: bring Finance into view once, by hand.
  const four = ["Accounting", "Bookkeeping", "Budgeting", "Personal Finance"];
  await page.getByTestId(`skill-chip-${four[0]}`).scrollIntoViewIfNeeded();
  const scroll0 = await scrolls(page);
  const boxes0 = await Promise.all(four.map((n) => box(page, n)));
  for (const [i, name] of four.entries()) {
    await page.getByTestId(`skill-chip-${name}`).tap();
    await expect(page.getByTestId(`skill-chip-${name}`)).toHaveAttribute("aria-checked", "true");
    await expect(page.getByTestId("skill-count")).toHaveText(`${i + 1} chosen`);
    // No scroll change and no chip moved, after every tap.
    expect(await scrolls(page)).toBe(scroll0);
    expect(await Promise.all(four.map((n) => box(page, n)))).toEqual(boxes0);
  }
  // Untoggle in place, toggle back.
  await page.getByTestId("skill-chip-Bookkeeping").tap();
  await expect(page.getByTestId("skill-chip-Bookkeeping")).toHaveAttribute("aria-checked", "false");
  expect(await scrolls(page)).toBe(scroll0);
  await page.getByTestId("skill-chip-Bookkeeping").tap();
  await page.screenshot({ path: "docs/redesign/perf/skills-pick-390.png" });

  // One compact step for the levels; Continue waits for every level.
  await cont(page);
  await expectScreen(page, "skillLevels");
  await expect(page.getByTestId("skill-list").locator("li")).toHaveCount(4);
  await expect(page.getByTestId("btn-continue")).toBeDisabled();
  for (const name of four)
    await page
      .getByRole("radiogroup", { name: new RegExp(`^${name} — How good are you\\?`) })
      .getByRole("radio", { name: "Working" })
      .tap();
  await expect(page.getByTestId("btn-continue")).toBeEnabled();
  await page.screenshot({ path: "docs/redesign/perf/skills-levels-390.png", fullPage: true });
  await cont(page);
  await expectScreen(page, "domains");
});

test("keyboard: Tab to a skill, Space toggles it; your own skill keeps its place", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await toSkills(page);
  const coding = page.getByTestId("skill-chip-Coding");
  await coding.focus();
  await page.keyboard.press("Space");
  await expect(coding).toHaveAttribute("aria-checked", "true");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("skill-chip-Web Development")).toHaveAttribute(
    "aria-checked",
    "true",
  );
  // A skill that is not in the list: typed, added with Enter, selected.
  await page.getByTestId("skill-search").fill("Pottery");
  await page.keyboard.press("Enter");
  const own = page.getByTestId("skill-chip-Pottery");
  await expect(own).toHaveAttribute("aria-checked", "true");
  await expect(page.getByTestId("skill-count")).toHaveText("3 chosen");
  // Untoggled, it stays where it is (nothing after it shifts).
  const before = await page.getByTestId("skill-chip-Coding").boundingBox();
  await own.click();
  await expect(own).toHaveAttribute("aria-checked", "false");
  expect(await page.getByTestId("skill-chip-Coding").boundingBox()).toEqual(before);
});

test("Hindi: the same chips and the levels step, in Hindi", async ({ page, context }) => {
  test.setTimeout(120_000);
  await context.addCookies([{ name: "solventia-locale", value: "hi", url: appUrl() }]);
  await gotoApp(page, "/consultation");
  await expectScreen(page, "basics");
  await page.getByTestId("input-age").fill("21");
  await page.getByTestId("opt-status-college_student").click();
  await cont(page);
  await expectScreen(page, "location");
  await pickCombo(page, "combo-country", /भारत|India/);
  await pickCombo(page, "combo-state", /हरियाणा|Haryana/);
  await page.getByTestId("input-city").fill("Gurugram");
  await cont(page);
  await expectScreen(page, "education");
  await page.getByTestId("opt-education-bachelors").click();
  await pickCombo(page, "combo-major", /कंप्यूटर|Computer science/);
  await page.getByTestId("opt-studyYear-y2").click();
  await cont(page);
  await expectScreen(page, "languagesTime");
  await page.getByTestId("opt-language-English").click();
  await page.getByTestId("opt-hours-h10_20").click();
  await cont(page);
  await expectScreen(page, "skills");
  await page.getByTestId("skill-chip-Coding").tap();
  await page.getByTestId("skill-chip-Writing").tap();
  await expect(page.getByTestId("skill-count")).toHaveText("2 चुने गए");
  await page.screenshot({ path: "docs/redesign/perf/skills-pick-390-hi.png" });
  await cont(page);
  await expectScreen(page, "skillLevels");
  await expect(page.getByRole("heading", { name: "हर एक में आप कितने अच्छे हैं?" })).toBeVisible();
});
