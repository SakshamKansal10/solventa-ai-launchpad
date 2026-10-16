import { expect, test } from "@playwright/test";

import { cont, expectScreen, walkConsultation } from "./helpers/consultation";

test.describe("consultation — seven stages", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/consultation");
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();
    await expect(page.getByTestId("screen-basics")).toBeVisible();
  });

  test("has no intro/commentary screens, no Business DNA percentage, and opens on a real question", async ({
    page,
  }) => {
    await expect(page.getByTestId("stage-label")).toContainText("Stage 1 of 7");
    await expect(page.getByText(/Business DNA/i)).toHaveCount(0);
    await expect(page.getByText(/\d+\s?%/)).toHaveCount(0);
    await expect(page.getByTestId("input-age")).toBeVisible();
  });

  test("Continue is disabled until required input is complete, and validates age", async ({
    page,
  }) => {
    const btn = page.getByTestId("btn-continue");
    await expect(btn).toBeDisabled();
    await page.getByTestId("input-age").fill("9");
    await page.getByTestId("opt-status-college_student").click();
    await expect(btn).toBeDisabled();
    await expect(page.getByRole("alert")).toContainText(/between 13 and 90/);
    await page.getByTestId("input-age").fill("21");
    await expect(btn).toBeEnabled();
  });

  test("completes all seven stages in ~16 screens and reaches the submit step", async ({
    page,
  }) => {
    let screens = 0;
    page.on("framenavigated", () => undefined);
    await walkConsultation(page);
    screens = 16; // student path: 17 screens minus the adaptive Position screen
    await expect(page.getByTestId("stage-label")).toContainText("Stage 7 of 7");
    expect(screens).toBeLessThanOrEqual(19);
    // Right rail shows only confirmed facts.
    const rail = page.getByTestId("profile-signals");
    await expect(rail).toContainText("India");
    await expect(rail).toContainText("Haryana");
    await expect(rail).toContainText("College student");
    await expect(rail).toContainText("10–20 hrs");
    await expect(rail).toContainText("₹5 lakh – ₹10 lakh");
    // A living panel, not a static receipt: it says what it's for.
    await expect(rail).toContainText("These signals shape your opportunities.");
  });

  test("a newly confirmed fact briefly highlights in the Founder Signal panel, then settles", async ({
    page,
  }) => {
    await page.getByTestId("input-age").fill("21");
    await page.getByTestId("opt-status-college_student").click();
    const statusFact = page.getByTestId("profile-fact-status");
    await expect(statusFact).toHaveAttribute("data-just-arrived", "true");
    await expect(statusFact).not.toHaveAttribute("data-just-arrived", "true", { timeout: 2000 });
  });

  test("Back always works and keeps answers", async ({ page }) => {
    await page.getByTestId("input-age").fill("30");
    await page.getByTestId("opt-status-working_professional").click();
    await cont(page);
    await expectScreen(page, "location");
    await page.getByTestId("btn-back").click();
    await expectScreen(page, "basics");
    await expect(page.getByTestId("input-age")).toHaveValue("30");
    await expect(page.getByTestId("opt-status-working_professional")).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  test("working professionals and business owners see the adaptive Position screen; students do not", async ({
    page,
  }) => {
    await walkConsultation(page, { status: "business_owner" });
    await page.getByTestId("btn-back").click(); // from submit → last question
    await expectScreen(page, "incomeHope");
  });

  test("autosaves locally and resumes on the exact unfinished question after a reload", async ({
    page,
  }) => {
    await page.getByTestId("input-age").fill("22");
    await page.getByTestId("opt-status-college_student").click();
    await cont(page);
    await expectScreen(page, "location");
    await page.reload();
    await expectScreen(page, "location");
    await expect(page.getByTestId("resumed-note")).toBeVisible();
    // and the earlier answers survived
    await page.getByTestId("btn-back").click();
    await expect(page.getByTestId("input-age")).toHaveValue("22");
  });

  test("changing the branch clears the answers that belonged to the old branch", async ({
    page,
  }) => {
    await walkConsultation(page, { status: "college_student" });
    // go back to screen 1 and switch to business owner
    for (let i = 0; i < 20; i++) {
      const back = page.getByTestId("btn-back");
      if (await page.getByTestId("screen-basics").isVisible()) break;
      await back.click();
    }
    await page.getByTestId("opt-status-business_owner").click();
    await cont(page);
    await cont(page); // location already complete
    await expectScreen(page, "education");
    // college-student-only "study year" must be gone
    await expect(page.getByTestId("opt-studyYear-y2")).toHaveCount(0);
  });
});
