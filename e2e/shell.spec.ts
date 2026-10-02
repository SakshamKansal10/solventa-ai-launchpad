import { expect, test, type Page } from "@playwright/test";
import { gotoApp } from "./helpers/page";

import {
  chooseAndBuildRoadmap,
  completeAllMissions,
  founderWithDirections,
  founderWithRoadmap,
} from "./helpers/flows";
import { createUser, forbidRealBackends, gemini, resetStack, signIn, sql } from "./helpers/stack";

test.beforeEach(async ({ page }) => {
  forbidRealBackends(page);
  await resetStack();
});

async function box(page: Page, testId: string) {
  const b = await page.getByTestId(testId).boundingBox();
  if (!b) throw new Error(`${testId} has no box`);
  return b;
}

async function noHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

test.describe("dashboard shell — geometry", () => {
  test("desktop: 244px sidebar, 72px top bar", async ({ page, context }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await founderWithDirections(context);
    await gotoApp(page, "/dashboard");
    const sidebar = await box(page, "sidebar");
    const topbar = await box(page, "topbar");
    expect(Math.round(sidebar.width)).toBe(244);
    expect(Math.round(topbar.height)).toBe(72);
    await noHorizontalOverflow(page);
  });

  for (const width of [1280, 1440, 1920]) {
    test(`Ask Sol docks at ${width}px, is 420px wide and RESIZES the page instead of covering it`, async ({
      page,
      context,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await founderWithDirections(context);
      await gotoApp(page, "/dashboard");
      const before = await box(page, "main-column");

      await page.getByTestId("ask-sol-launcher").click();
      const dock = page.getByTestId("ask-sol-dock");
      await expect(dock).toBeVisible();
      await expect(page.getByTestId("ask-sol-drawer")).toHaveCount(0);
      // The dock animates open (260ms); wait for its final width.
      await expect.poll(async () => Math.round((await box(page, "ask-sol-dock")).width)).toBe(420);
      const dockBox = await box(page, "ask-sol-dock");

      const after = await box(page, "main-column");
      // The main column ends where the dock begins — no overlap — and got narrower.
      expect(after.x + after.width).toBeLessThanOrEqual(dockBox.x + 1);
      expect(after.width).toBeLessThan(before.width - 300);
      // The topbar avatar and the launcher never sit on top of the dock's content.
      await noHorizontalOverflow(page);

      await page.getByTestId("ask-sol-close").click();
      await expect(dock).toBeHidden();
      const restored = await box(page, "main-column");
      expect(Math.abs(restored.width - before.width)).toBeLessThanOrEqual(1);
    });
  }

  test("below 1280px Ask Sol is a drawer, not a docked column", async ({ page, context }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await founderWithDirections(context);
    await gotoApp(page, "/dashboard");
    await page.getByTestId("ask-sol-launcher").click();
    await expect(page.getByTestId("ask-sol-drawer")).toBeVisible();
    await expect(page.getByTestId("ask-sol-dock")).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("ask-sol-drawer")).toBeHidden();
  });

  test("phone: navigation lives in a drawer and nothing overflows horizontally", async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await founderWithDirections(context);
    await gotoApp(page, "/dashboard");
    await expect(page.getByTestId("sidebar")).toBeHidden();
    await noHorizontalOverflow(page);
    await page.getByRole("button", { name: /open navigation/i }).click();
    await expect(page.getByRole("link", { name: "Opportunities" }).first()).toBeVisible();
    await page.getByRole("link", { name: "Opportunities" }).first().click();
    await expect(page).toHaveURL(/\/dashboard\/opportunities/);
    await noHorizontalOverflow(page);
    for (const route of ["/dashboard/history", "/dashboard/settings", "/dashboard/proof"]) {
      await gotoApp(page, route);
      await noHorizontalOverflow(page);
    }
  });
});

test.describe("Ask Sol", () => {
  test("answers from the current context, keeps the conversation, and can be reopened", async ({
    page,
    context,
  }) => {
    const { user } = await founderWithRoadmap(page, context);
    await page.getByTestId("ask-sol-launcher").click();
    await page.getByTestId("ask-sol-input").fill("How do I find eight customers?");
    await page.getByTestId("ask-sol-send").click();
    await expect(page.getByTestId("ask-sol-panel")).toContainText(
      "focus on the current mission first",
      { timeout: 45_000 },
    );
    expect(await gemini.countOf("SOL_MESSAGE")).toBe(1);

    await page.reload();
    await page.getByTestId("ask-sol-launcher").click();
    await expect(page.getByTestId("ask-sol-panel")).toContainText("How do I find eight customers?");
    const rows = await sql<{ role: string }>(
      "select role from mentor_messages where user_id = $1 order by created_at",
      [user.id],
    );
    expect(rows.map((r) => r.role)).toEqual(["user", "assistant"]);
  });

  test("a failing Sol reply is reported honestly and the message can be sent again", async ({
    page,
    context,
  }) => {
    await founderWithRoadmap(page, context);
    await gemini.failNext("SOL_MESSAGE", 4);
    await page.getByTestId("ask-sol-launcher").click();
    await page.getByTestId("ask-sol-input").fill("Help");
    await page.getByTestId("ask-sol-send").click();
    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: /couldn't|try again/i })
        .first(),
    ).toBeVisible({ timeout: 45_000 });
    await gemini.clearBehavior();
    // The failed message offers a one-click retry (the composer itself is empty).
    await page.getByTestId("ask-sol-panel").getByRole("button", { name: "Try again" }).click();
    await expect(page.getByTestId("ask-sol-panel")).toContainText(
      "focus on the current mission first",
      { timeout: 45_000 },
    );
  });

  test("the Ask Sol button on the roadmap rail opens the panel", async ({ page, context }) => {
    await founderWithRoadmap(page, context);
    await page.getByTestId("rail-ask-sol").click();
    await expect(page.getByTestId("ask-sol-panel")).toBeVisible();
  });
});

test.describe("notifications", () => {
  test("real events create notifications that deep-link to the exact screen and can be marked read", async ({
    page,
    context,
  }) => {
    const { user } = await founderWithDirections(context);
    await chooseAndBuildRoadmap(page);

    const bell = page.getByTestId("notification-bell");
    await expect(page.getByTestId("notification-count")).toHaveText("1", { timeout: 30_000 });
    await bell.click();
    const panel = page.getByTestId("notification-panel");
    await expect(panel).toContainText("Your roadmap is ready");

    // Finish and review Week 01 → a second notification: Week 02 is unlocked.
    await page.keyboard.press("Escape");
    await completeAllMissions(page);
    await page.getByTestId("review-week").click();
    await page.getByTestId("outcome-as_expected").click();
    await page.getByTestId("prepare-next-week").click();
    await expect(page.getByTestId("adaptation-note")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("notification-count")).toHaveText("2", { timeout: 30_000 });

    // Open the roadmap-ready notification from somewhere else: it lands on Week 1.
    await gotoApp(page, "/dashboard/settings");
    await bell.click();
    await panel
      .getByTestId("notification-item")
      .filter({ hasText: "Your roadmap is ready" })
      .click();
    await expect(page).toHaveURL(/\/dashboard\/roadmap\?.*week=1/);
    await expect(page.getByTestId("notification-count")).toHaveText("1");

    await bell.click();
    await panel.getByTestId("notification-mark-all").click();
    await expect(page.getByTestId("notification-count")).toHaveCount(0);
    const unread = await sql<{ n: string }>(
      "select count(*)::text as n from founder_notifications where user_id = $1 and read_at is null",
      [user.id],
    );
    expect(Number(unread[0].n)).toBe(0);
  });

  test("an account with nothing new shows an empty state and no count", async ({
    page,
    context,
  }) => {
    const user = await createUser();
    await signIn(context, user);
    await gotoApp(page, "/dashboard");
    await expect(page.getByTestId("notification-count")).toHaveCount(0);
    await page.getByTestId("notification-bell").click();
    await expect(page.getByTestId("notification-panel")).toContainText("Nothing new");
  });
});
