import { expect, test, type Page } from "@playwright/test";
import { gotoApp } from "./helpers/page";

import { founderWithRoadmap } from "./helpers/flows";
import { forbidRealBackends, gemini, resetStack, sql } from "./helpers/stack";

test.beforeEach(async ({ page }) => {
  forbidRealBackends(page);
  await resetStack();
});

async function openProof(page: Page) {
  await gotoApp(page, "/dashboard/proof");
  await expect(page.getByTestId("assumption-card").first()).toBeVisible({ timeout: 45_000 });
}

test.describe("Proof — why this idea fits", () => {
  test("opens with generated assumptions — written once — that expand inline", async ({
    page,
    context,
  }) => {
    await founderWithRoadmap(page, context);
    await openProof(page);

    const cards = page.getByTestId("assumption-card");
    await expect(cards).toHaveCount(3);
    await cards.first().getByTestId("view-details").click();
    await expect(cards.first().getByTestId("view-details")).toHaveAttribute(
      "aria-expanded",
      "true",
    );

    await page.reload();
    await expect(page.getByTestId("assumption-card")).toHaveCount(3);
    expect(await gemini.countOf("PROOF_ASSUMPTIONS")).toBe(1);
  });
});

test.describe("Proof — assumptions, missions and recorded results", () => {
  test("evidence is recorded from the first mission, and only evidence moves an assumption", async ({
    page,
    context,
  }) => {
    test.setTimeout(180_000);
    await founderWithRoadmap(page, context);

    // Before anything is done, the first assumption is not checked yet.
    await openProof(page);
    await expect(page.getByTestId("assumption-card").first()).toHaveAttribute(
      "data-status",
      "not_tested",
    );

    // The first mission's page names the assumption it tests.
    await gotoApp(page, "/dashboard/roadmap");
    await page.getByTestId("mission-card").first().getByTestId("mission-primary").click();
    const mission = page.getByTestId("mission-page");
    await expect(mission).toHaveAttribute("data-state", "in_progress");
    await expect(page.getByTestId("mission-assumption")).toBeVisible({ timeout: 45_000 });

    // Finishing the mission is not evidence: the assumption is only "Checking".
    await page.getByTestId("mission-complete").click();
    await expect(mission).toHaveAttribute("data-state", "completed");
    await expect(page.getByTestId("mission-assumption")).toContainText("Checking");

    // A negative result is recorded from the mission itself.
    await page.getByTestId("mission-record-evidence").click();
    const dialog = page.getByTestId("evidence-dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByTestId("ev-save")).toBeDisabled();
    await dialog.getByTestId("ev-person").fill("Dr Rao, Sunrise Clinic");
    await dialog
      .getByTestId("ev-summary")
      .fill("Said follow-ups are handled by the front desk and are not a priority this year.");
    await dialog.getByTestId("ev-signal-contradicts").click();
    await dialog.getByTestId("ev-save").click();
    await expect(dialog).toBeHidden();
    await expect(mission).toContainText("1 recorded");
    await page.getByTestId("back-to-week").click();
    await expect(page.getByTestId("mission-card").first()).toHaveAttribute("data-evidence", "1");

    // Evidence lists the assumption with its mission and the recorded result.
    await gotoApp(page, "/dashboard/proof");
    const card = page.getByTestId("assumption-card").first();
    await expect(card).toHaveAttribute("data-status", "testing");
    await card.getByTestId("view-details").click();
    await expect(card.getByTestId("linked-mission").first()).toContainText("Week 1");
    await expect(card.getByTestId("evidence-item")).toHaveCount(1);
    await expect(card.getByTestId("evidence-item")).toHaveAttribute("data-signal", "contradicts");
    // One negative result does not settle it: nothing is "checked" yet.
    await expect(page.getByTestId("proof-count")).toContainText("0 / 3");

    // It persists, and it can be removed.
    await page.reload();
    const again = page.getByTestId("assumption-card").first();
    await again.getByTestId("view-details").click();
    await expect(again.getByTestId("evidence-item")).toHaveCount(1);
    await again.getByTestId("delete-evidence").click();
    await page.getByTestId("confirm-delete-evidence").click();
    await expect(again.getByTestId("evidence-item")).toHaveCount(0);
    await expect(again).toHaveAttribute("data-status", "testing");
    await expect(again).toContainText("Record what it showed");
  });

  test("proof recorded on the Proof page settles an assumption only at its threshold", async ({
    page,
    context,
  }) => {
    test.setTimeout(180_000);
    await founderWithRoadmap(page, context);
    await openProof(page);
    const card = page.getByTestId("assumption-card").first();
    await card.getByTestId("view-details").click();

    for (const [i, person] of ["Clinic A", "Clinic B", "Clinic C"].entries()) {
      await card.getByTestId("record-evidence").click();
      const dialog = page.getByTestId("evidence-dialog");
      await dialog.getByTestId("ev-person").fill(person);
      await dialog
        .getByTestId("ev-summary")
        .fill(`Owner confirmed they lose patients to missed follow-ups (${i + 1}).`);
      await dialog.getByTestId("ev-signal-supports").click();
      await dialog.getByTestId("ev-save").click();
      await expect(dialog).toBeHidden();
      await expect(card.getByTestId("evidence-item")).toHaveCount(i + 1);
      await expect(card).toHaveAttribute("data-status", i < 2 ? "testing" : "supported");
    }
    await expect(card).toContainText("build on it");
    await expect(page.getByTestId("proof-count")).toContainText("1 / 3");
  });
});

test.describe("Proof is private to its founder", () => {
  test("another account sees none of the first founder's assumptions", async ({
    page,
    context,
    browser,
  }) => {
    await founderWithRoadmap(page, context);
    await openProof(page);

    const other = await browser.newContext();
    const otherPage = await other.newPage();
    const { createUser, signIn } = await import("./helpers/stack");
    const stranger = await createUser({ fullName: "Someone Else" });
    await signIn(other, stranger);
    await otherPage.goto("/dashboard/proof");
    await expect(otherPage.getByTestId("assumption-card")).toHaveCount(0);
    await other.close();
  });
});
