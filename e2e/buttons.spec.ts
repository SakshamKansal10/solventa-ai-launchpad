import { expect, test } from "@playwright/test";

import {
  completeAllMissions,
  founderWithDirections,
  founderWithRoadmap,
  skipRevealIntro,
} from "./helpers/flows";
import { gotoApp } from "./helpers/page";
import { forbidRealBackends, resetStack } from "./helpers/stack";

/**
 * A button audit: every primary control a visitor or founder meets does what its
 * label says. (Google sign-in and avatar upload are covered in auth.spec.ts and
 * settings.spec.ts; this file covers the rest of the list.)
 */
test.beforeEach(async ({ page }) => {
  forbidRealBackends(page);
  await resetStack();
});

test.describe("public buttons", () => {
  // `/` is the cinematic homepage (its own navigation; the film itself is covered by
  // cinematic.spec.ts). The language switch lives in the shared site header.
  test("Find My Business Idea (homepage navigation) and the language switch", async ({ page }) => {
    await gotoApp(page, "/");
    await page
      .getByRole("banner")
      .getByRole("link", { name: /Find My Business Idea/ })
      .click();
    await expect(page).toHaveURL(/\/consultation$/);

    await gotoApp(page, "/how-it-works");
    await page.getByTestId("language-switch").click();
    await expect(page.locator("html")).toHaveAttribute("lang", "hi");
    await page.getByTestId("language-switch").click();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });
});

test.describe("founder buttons", () => {
  test("Build my roadmap → Start mission → Mark complete → Review → Prepare next week", async ({
    page,
    context,
  }) => {
    await founderWithDirections(context);
    await gotoApp(page, "/dashboard");
    await skipRevealIntro(page);
    // One action chooses the direction and builds its roadmap.
    await page.getByTestId("flagship-choose").click();
    await expect(page.getByTestId("roadmap-page")).toBeVisible({ timeout: 90_000 });

    const first = page.getByTestId("mission-card").first();
    await first.getByTestId("mission-primary").click();
    await expect(first).toHaveAttribute("data-state", "in_progress");
    await first.getByTestId("mission-complete").click();
    await expect(first).toHaveAttribute("data-state", "completed");

    await completeAllMissions(page);
    await page.getByTestId("review-week").click();
    await page.getByTestId("outcome-as_expected").click();
    await page.getByTestId("prepare-next-week").click();
    await expect(page.getByTestId("adaptation-note")).toBeVisible({ timeout: 60_000 });
  });

  test("Command Center controls navigate: the next move, and each of this week's priorities", async ({
    page,
    context,
  }) => {
    await founderWithRoadmap(page, context);
    await gotoApp(page, "/dashboard");

    await page.getByTestId("start-mission").click();
    await expect(page).toHaveURL(/\/dashboard\/roadmap/);

    await gotoApp(page, "/dashboard");
    await page.getByTestId("why-this").click();
    await expect(page.getByTestId("why-this")).toHaveAttribute("aria-expanded", "true");

    await page.getByTestId("track-node").nth(1).click();
    await expect(page).toHaveURL(/\/dashboard\/roadmap/);
    await expect(page.getByTestId("mission-card").nth(1)).toHaveAttribute("data-open", "true");
  });

  test("Add evidence (page button) saves; a contradiction gets 'Ask Sol what this changes', which sends the question", async ({
    page,
    context,
  }) => {
    await founderWithRoadmap(page, context);
    await gotoApp(page, "/dashboard/proof");
    await page.getByTestId("add-evidence-global").click();
    await expect(page.getByTestId("evidence-dialog")).toBeVisible({ timeout: 45_000 });
    await page.getByTestId("ev-person").fill("Clinic owner");
    await page.getByTestId("ev-summary").fill("I wouldn't pay for reminders.");

    // Ask Sol to interpret: it suggests, the founder confirms.
    await page.getByTestId("ev-interpret").click();
    await expect(page.getByTestId("ev-suggestion")).toHaveAttribute("data-signal", "contradicts");
    await page.getByTestId("ev-use-suggestion").click();
    await expect(page.getByTestId("ev-signal-contradicts")).toHaveAttribute("aria-checked", "true");
    await page.getByTestId("ev-save").click();
    await expect(page.getByTestId("evidence-dialog")).toBeHidden();

    const item = page.getByTestId("stream-item").first();
    await expect(item).toHaveAttribute("data-signal", "contradicts");
    await item.getByTestId("stream-ask-sol").click();
    await expect(
      page.getByTestId("ask-sol-panel").or(page.getByTestId("ask-sol-drawer")),
    ).toBeVisible();
    await expect(page.getByTestId("ask-sol-panel")).toContainText("wouldn't pay", {
      timeout: 30_000,
    });
  });
});
