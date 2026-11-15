import { expect, test } from "@playwright/test";

import { founderWithRoadmap } from "./helpers/flows";
import { gotoApp } from "./helpers/page";
import { forbidRealBackends, resetStack, sql } from "./helpers/stack";

test.beforeEach(async ({ page }) => {
  forbidRealBackends(page);
  await resetStack();
});

const prefs = async (userId: string) =>
  (
    await sql<{ on: boolean; day: number | null; asked: boolean }>(
      `select weekly_reminder as on, reminder_weekday as day, reminder_asked_at is not null as asked
       from profiles where id = $1`,
      [userId],
    )
  )[0];

test.describe("one weekly reminder (part 4, feature 8)", () => {
  test("off by default, asked once after the roadmap is built, and changeable in Settings", async ({
    page,
    context,
  }) => {
    const { user } = await founderWithRoadmap(page, context);
    expect(await prefs(user.id)).toEqual({ on: false, day: null, asked: false });

    const ask = page.getByTestId("reminder-ask");
    await expect(ask).toBeVisible();
    await page.getByTestId("reminder-ask-day").selectOption("4");
    await page.getByTestId("reminder-ask-yes").click();
    await expect(ask).toHaveCount(0);
    await expect.poll(() => prefs(user.id)).toEqual({ on: true, day: 4, asked: true });

    // Asked once: it does not come back.
    await page.reload();
    await expect(page.getByTestId("roadmap-page")).toBeVisible();
    await expect(page.getByTestId("reminder-ask")).toHaveCount(0);

    await gotoApp(page, "/dashboard/settings");
    const section = page.getByTestId("reminder-section");
    await expect(page.getByTestId("reminder-switch")).toHaveAttribute("data-state", "checked");
    await page.getByTestId("reminder-day").selectOption("1");
    await expect.poll(async () => (await prefs(user.id)).day).toBe(1);
    await page.getByTestId("reminder-switch").click();
    await expect.poll(async () => (await prefs(user.id)).on).toBe(false);
    await expect(section.getByTestId("reminder-day")).toBeDisabled();
  });

  test("No thanks is remembered and sends nothing", async ({ page, context }) => {
    const { user } = await founderWithRoadmap(page, context);
    await page.getByTestId("reminder-ask-no").click();
    await expect(page.getByTestId("reminder-ask")).toHaveCount(0);
    await expect.poll(() => prefs(user.id)).toEqual({ on: false, day: null, asked: true });
  });

  test("the cron endpoint does nothing until it is configured", async ({ request }) => {
    const res = await request.get("/api/cron/weekly-reminders");
    expect(res.status()).toBe(503);
  });
});
