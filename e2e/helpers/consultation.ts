import { expect, type Page } from "@playwright/test";

/** Selects an option in a cmdk combobox by its visible label. */
export async function pickCombo(page: Page, testId: string, label: string | RegExp) {
  await page.getByTestId(testId).click();
  await page.getByRole("option", { name: label }).first().click();
}

export async function cont(page: Page) {
  const btn = page.getByTestId("btn-continue");
  await expect(btn).toBeEnabled();
  await btn.click();
}

export async function expectScreen(page: Page, key: string) {
  await expect(page.getByTestId(`screen-${key}`)).toBeVisible();
}

export interface WalkOptions {
  status?: "college_student" | "working_professional" | "business_owner";
}

/**
 * Walks every question of the seven-stage consultation with realistic answers.
 * Returns once the final "submit" step is showing. Selectors are the stable
 * data-testids the consultation UI exposes.
 */
export async function walkConsultation(page: Page, opts: WalkOptions = {}) {
  const status = opts.status ?? "college_student";

  // Stage 1 — foundation
  await expectScreen(page, "basics");
  await page.getByTestId("input-age").fill("21");
  await page.getByTestId(`opt-status-${status}`).click();
  await cont(page);

  await expectScreen(page, "location");
  await pickCombo(page, "combo-country", "India");
  await pickCombo(page, "combo-state", "Haryana");
  await page.getByTestId("input-city").fill("Gurugram");
  await cont(page);

  await expectScreen(page, "education");
  await page.getByTestId("opt-education-bachelors").click();
  await pickCombo(page, "combo-major", /Computer science/);
  if (status === "college_student") await page.getByTestId("opt-studyYear-y2").click();
  await cont(page);

  await expectScreen(page, "languagesTime");
  await page.getByTestId("opt-language-English").click();
  await page.getByTestId("opt-language-Hindi").click();
  await page.getByTestId("opt-hours-h10_20").click();
  await cont(page);

  // Stage 2 — capability
  await expectScreen(page, "skills");
  await page.getByTestId("skill-add").click();
  await page.getByRole("option", { name: "Coding" }).first().click();
  await page
    .getByRole("radio", { name: /Coding — How good are you\?.*Working|Working/ })
    .first()
    .click();
  await cont(page);

  await expectScreen(page, "domains");
  await page.getByTestId("opt-domains-software").click();
  await cont(page);

  await expectScreen(page, "execution");
  await page.getByTestId("opt-execution-built_product").click();
  await cont(page);

  // Stage 3 — resources
  await expectScreen(page, "capital");
  await page.getByTestId("opt-capital-5").click();
  await cont(page);

  await expectScreen(page, "access");
  await page.getByTestId("opt-access-laptop").click();
  await cont(page);

  if (status !== "college_student") {
    await expectScreen(page, "position");
    if (status === "business_owner") {
      await pickCombo(page, "combo-biz-sector", /Manufacturing/);
      await page.getByTestId("opt-turnover-4").click();
      await page.getByTestId("opt-bizteam-t51_250").click();
    }
    await cont(page);
  }

  // Stage 4
  await expectScreen(page, "riskRoles");
  await page.getByTestId("opt-risk-balanced").click();
  await page.getByTestId("opt-roles-building").click();
  await page.getByTestId("opt-team-open_cofounder").click();
  await cont(page);

  // Stage 5
  await expectScreen(page, "commitment");
  await page.getByTestId("opt-commitment-solve_problem").click();
  await cont(page);

  await expectScreen(page, "interests");
  await page.getByTestId("opt-interests-education").click();
  await cont(page);

  // Stage 6
  await expectScreen(page, "refuseRelocation");
  await page.getByTestId("opt-relocation-unlikely").click();
  await cont(page);

  await expectScreen(page, "constraints");
  await page.getByTestId("opt-constraints-none").click();
  await cont(page);

  // Stage 7
  await expectScreen(page, "scaleHorizon");
  await page.getByTestId("opt-scale-national").click();
  await page.getByTestId("opt-horizon-y2_4").click();
  await cont(page);

  await expectScreen(page, "incomeHope");
  await page.getByTestId("opt-hope-large_company").click();
  await cont(page);

  await expectScreen(page, "submit");
}
