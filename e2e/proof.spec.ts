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

test.describe("Proof — assumptions become evidence", () => {
  test("opens with generated, untested assumptions — written once — and no numeric score", async ({
    page,
    context,
  }) => {
    await founderWithRoadmap(page, context);
    await openProof(page);

    const cards = page.getByTestId("assumption-card");
    await expect(cards).toHaveCount(3);
    for (let i = 0; i < 3; i++)
      await expect(cards.nth(i)).toHaveAttribute("data-state", "untested");
    const text = await page.getByTestId("proof-page").innerText();
    expect(text).not.toMatch(/\d+\s?%/);
    expect(text).not.toMatch(/\bscore\b/i);

    await page.reload();
    await expect(page.getByTestId("assumption-card")).toHaveCount(3);
    expect(await gemini.countOf("PROOF_ASSUMPTIONS")).toBe(1);
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
