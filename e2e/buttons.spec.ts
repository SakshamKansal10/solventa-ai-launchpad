import { expect, test } from "@playwright/test";

import { completeAllMissions, founderWithDirections, founderWithRoadmap } from "./helpers/flows";
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
  test("Choose direction → Build my roadmap → Start mission → Mark complete → Review → Prepare next week", async ({
    page,
    context,
  }) => {
    await founderWithDirections(context);
    await gotoApp(page, "/dashboard");
    await page.getByTestId("flagship-choose").click();
    await expect(page.getByTestId("build-roadmap")).toBeEnabled();
    await page.getByTestId("build-roadmap").click();
    await expect(page.getByTestId("roadmap-page")).toBeVisible({ timeout: 60_000 });

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

  test("dashboard graphics are controls: path stop, mission node, evidence map and Today's Move all navigate", async ({
    page,
    context,
  }) => {
    await founderWithRoadmap(page, context);
    await gotoApp(page, "/dashboard");

    await page.getByTestId("start-mission").click();
    await expect(page).toHaveURL(/\/dashboard\/roadmap/);

    await gotoApp(page, "/dashboard");
    await page.getByTestId("path-node-problem").getByRole("button").click();
    await expect(page).toHaveURL(/\/dashboard\/proof/);

    await gotoApp(page, "/dashboard");
    await page.getByTestId("track-node").first().click();
    await expect(page).toHaveURL(/\/dashboard\/roadmap/);

    await gotoApp(page, "/dashboard");
    await page.getByTestId("evidence-map-node").first().hover();
    await expect(page.getByTestId("evidence-map-summary")).not.toContainText("Hover, focus");
    await page.getByTestId("evidence-map-node").first().click();
    await expect(page).toHaveURL(/\/dashboard\/proof/);
  });
});
