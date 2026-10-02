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
  test("Find My Business Idea (hero and header), See How It Works and the language switch", async ({
    page,
  }) => {
    await gotoApp(page, "/");
    const hero = page.locator("main section").first();

    await hero.getByRole("button", { name: "See How It Works" }).click();
    await expect(page.locator("#how-it-works")).toBeInViewport();

    await gotoApp(page, "/");
    await page
      .getByRole("banner")
      .getByRole("button", { name: /Find My Business Idea/ })
      .click();
    await expect(page).toHaveURL(/\/consultation$/);

    await gotoApp(page, "/");
    await page
      .locator("main section")
      .first()
      .getByRole("button", { name: /Find My Business Idea/ })
      .click();
    await expect(page).toHaveURL(/\/consultation$/);

    await gotoApp(page, "/");
    await page.getByTestId("language-switch").click();
    await expect(page.locator("html")).toHaveAttribute("lang", "hi");
    await page.getByTestId("language-switch").click();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });

  test("the story demos respond: scenario, opportunity focus, Ask Sol context chip, proof button", async ({
    page,
  }) => {
    await gotoApp(page, "/");
    await page.getByTestId("scenario-c").click();
    await expect(page.getByTestId("demo-directions")).toHaveAttribute("data-scenario", "c");
    await page.getByTestId("opp-option-c").click();
    await expect(page.getByTestId("opportunity-demo")).toHaveAttribute("data-focus", "c");
    await page.getByTestId("asksol-chip-week").click();
    await expect(page.getByTestId("asksol-answer")).toHaveAttribute("data-context", "partial");
    // The proof demo's "Ask Sol what this changes" appears once a contradiction lands and
    // scrolls to the Ask Sol demonstration.
    await page.getByTestId("proof-demo").scrollIntoViewIfNeeded();
    await expect(page.getByTestId("proof-ask-sol")).toBeVisible({ timeout: 20_000 });
    await page.getByTestId("proof-ask-sol").click();
    await expect(page.locator("#ask-sol-demo")).toBeInViewport();
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
