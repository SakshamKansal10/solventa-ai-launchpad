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

test.describe("Evidence — assumptions, missions and recorded results", () => {
  test("evidence is recorded from the first mission, and only evidence moves an assumption", async ({
    page,
    context,
  }) => {
    test.setTimeout(180_000);
    await founderWithRoadmap(page, context);

    // This Week writes the assumptions too, so the first mission names the one it tests.
    const first = page.getByTestId("mission-card").first();
    await expect(first.getByTestId("mission-assumption")).toBeVisible({ timeout: 45_000 });
    await expect(first.getByTestId("mission-assumption")).toContainText("Not tested");

    // Finishing the mission is not evidence: the assumption is only "Testing".
    if ((await first.getAttribute("data-state")) === "not_started") {
      await first.getByTestId("mission-primary").click();
      await expect(first).toHaveAttribute("data-state", "in_progress");
    }
    await first.getByTestId("mission-complete").click();
    await expect(first).toHaveAttribute("data-state", "completed");
    if ((await first.getAttribute("data-open")) !== "true") {
      await first.getByTestId("mission-toggle").click();
    }
    await expect(first.getByTestId("mission-assumption")).toContainText("Testing");

    // A negative result is recorded from the mission itself.
    await first.getByTestId("mission-record-evidence").click();
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
    await expect(first).toHaveAttribute("data-evidence", "1");

    // Evidence lists the assumption with its mission and the recorded result.
    await gotoApp(page, "/dashboard/proof");
    const card = page.getByTestId("assumption-card").first();
    await expect(card).toHaveAttribute("data-status", "testing");
    await card.getByTestId("view-details").click();
    await expect(card.getByTestId("linked-mission").first()).toContainText("Week 1");
    await expect(card.getByTestId("evidence-item")).toHaveCount(1);
    await expect(card.getByTestId("evidence-item")).toHaveAttribute("data-signal", "contradicts");
    await expect(page.getByTestId("count-testing")).toHaveText("1");

    // It persists, and it can be removed.
    await page.reload();
    const again = page.getByTestId("assumption-card").first();
    await again.getByTestId("view-details").click();
    await expect(again.getByTestId("evidence-item")).toHaveCount(1);
    await again.getByTestId("delete-evidence").click();
    await page.getByTestId("confirm-delete-evidence").click();
    await expect(again.getByTestId("evidence-item")).toHaveCount(0);
    await expect(again).toHaveAttribute("data-status", "testing");
    await expect(again.getByTestId("next-action")).toContainText("Record what it showed");
  });

  test("evidence recorded on the Evidence page settles an assumption only at its threshold", async ({
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
    await expect(card.getByTestId("next-action")).toContainText("build on it");
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
