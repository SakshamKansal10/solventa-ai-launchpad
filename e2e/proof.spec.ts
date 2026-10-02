import { expect, test, type Page } from "@playwright/test";
import { gotoApp } from "./helpers/page";

import { founderWithRoadmap } from "./helpers/flows";
import { forbidRealBackends, gemini, resetStack, sql } from "./helpers/stack";

test.beforeEach(async ({ page }) => {
  forbidRealBackends(page);
  await resetStack();
});

const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

async function openProof(page: Page) {
  await gotoApp(page, "/dashboard/proof");
  await expect(page.getByTestId("assumption-card").first()).toBeVisible({ timeout: 45_000 });
}

/** Adds one piece of evidence from the first assumption card's own button. */
async function addEvidence(
  page: Page,
  opts: {
    card?: number;
    summary: string;
    person: string;
    signal: "supports" | "neutral" | "contradicts";
  },
) {
  await page
    .getByTestId("assumption-card")
    .nth(opts.card ?? 0)
    .getByTestId("add-evidence")
    .click();
  await expect(page.getByTestId("evidence-dialog")).toBeVisible();
  await page.getByTestId("ev-person").fill(opts.person);
  await page.getByTestId("ev-summary").fill(opts.summary);
  await page.getByTestId(`ev-signal-${opts.signal}`).click();
  await page.getByTestId("ev-save").click();
  await expect(page.getByTestId("evidence-dialog")).toBeHidden();
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

  test("evidence moves an assumption through Weak signal to Supported, from independent sources only", async ({
    page,
    context,
  }) => {
    await founderWithRoadmap(page, context);
    await openProof(page);

    await addEvidence(page, {
      summary: "Owner said follow-ups are dropped every week.",
      person: "Clinic owner A",
      signal: "neutral",
    });
    await expect(page.getByTestId("assumption-card").first()).toHaveAttribute("data-state", "weak");

    await addEvidence(page, {
      summary: "Owner B loses patients after the first visit.",
      person: "Clinic owner B",
      signal: "supports",
    });
    await addEvidence(page, {
      summary: "Owner C tracks follow-ups on paper and misses many.",
      person: "Clinic owner C",
      signal: "supports",
    });
    // Three supporting notes from the SAME person are still one source.
    await addEvidence(page, {
      summary: "Owner C again, confirming.",
      person: "Clinic owner C",
      signal: "supports",
    });
    await expect(page.getByTestId("assumption-card").first()).not.toHaveAttribute(
      "data-state",
      "supported",
    );

    await addEvidence(page, {
      summary: "Owner D says the same thing.",
      person: "Clinic owner D",
      signal: "supports",
    });
    await expect(page.getByTestId("assumption-card").first()).toHaveAttribute(
      "data-state",
      "supported",
    );
  });

  test("contradicting evidence is honoured, and the detail sheet explains the state and its history", async ({
    page,
    context,
  }) => {
    await founderWithRoadmap(page, context);
    await openProof(page);
    await addEvidence(page, {
      summary: "Nobody I asked felt this was a problem.",
      person: "Interviewee 1",
      signal: "contradicts",
    });
    await addEvidence(page, {
      summary: "They already have a system that works.",
      person: "Interviewee 2",
      signal: "contradicts",
    });
    // Two contradicting sources are a warning, not yet a verdict (the bar is three).
    await expect(page.getByTestId("assumption-card").first()).toHaveAttribute("data-state", "weak");
    await addEvidence(page, {
      summary: "It is not on their list of problems.",
      person: "Interviewee 3",
      signal: "contradicts",
    });
    await expect(page.getByTestId("assumption-card").first()).toHaveAttribute(
      "data-state",
      "contradicted",
    );

    await page
      .getByTestId("assumption-card")
      .first()
      .getByRole("button", { name: /view details|details/i })
      .first()
      .click();
    const sheet = page.getByTestId("assumption-sheet");
    await expect(sheet).toBeVisible();
    await expect(page.getByTestId("state-reason")).toBeVisible();
    await expect(page.getByTestId("state-history")).toBeVisible();
    await expect(page.getByTestId("evidence-item")).toHaveCount(3);
  });

  test("filters narrow the list by state", async ({ page, context }) => {
    await founderWithRoadmap(page, context);
    await openProof(page);
    await addEvidence(page, { summary: "A quote", person: "P1", signal: "contradicts" });
    await addEvidence(page, { summary: "Another quote", person: "P2", signal: "contradicts" });
    await addEvidence(page, { summary: "A third quote", person: "P3", signal: "contradicts" });

    await page.getByTestId("filter-contradicted").click();
    await expect(page.getByTestId("assumption-card")).toHaveCount(1);
    await page.getByTestId("filter-untested").click();
    await expect(page.getByTestId("assumption-card")).toHaveCount(2);
    await page.getByTestId("filter-supported").click();
    await expect(page.getByTestId("assumption-card")).toHaveCount(0);
    await page.getByTestId("filter-all").click();
    await expect(page.getByTestId("assumption-card")).toHaveCount(3);
  });

  test("deleting evidence asks for confirmation and recalculates the state", async ({
    page,
    context,
  }) => {
    await founderWithRoadmap(page, context);
    await openProof(page);
    await addEvidence(page, { summary: "First quote", person: "P1", signal: "contradicts" });
    await addEvidence(page, { summary: "Second quote", person: "P2", signal: "contradicts" });
    await addEvidence(page, { summary: "Third quote", person: "P3", signal: "contradicts" });
    await expect(page.getByTestId("assumption-card").first()).toHaveAttribute(
      "data-state",
      "contradicted",
    );

    await page
      .getByTestId("assumption-card")
      .first()
      .getByRole("button", { name: /view details|details/i })
      .first()
      .click();
    await page.getByTestId("evidence-delete").first().click();
    await page.getByTestId("confirm-delete-evidence").click();
    await expect(page.getByTestId("evidence-item")).toHaveCount(2);
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("assumption-card").first()).not.toHaveAttribute(
      "data-state",
      "contradicted",
    );
  });

  test("Add Proof on a mission opens the evidence dialog with that mission's assumption preselected", async ({
    page,
    context,
  }) => {
    await founderWithRoadmap(page, context);
    // Missions that require evidence expose Add Proof.
    const link = page.getByTestId("mission-add-proof").first();
    await expect(link).toBeVisible();
    await link.click();

    await expect(page).toHaveURL(/\/dashboard\/proof/);
    await expect(page.getByTestId("evidence-dialog")).toBeVisible({ timeout: 45_000 });
    const chosen = await page.getByTestId("ev-assumption").inputValue();
    expect(chosen).not.toBe("");
    // The evidence saved from here is tied to the mission.
    await page.getByTestId("ev-person").fill("Customer 1");
    await page.getByTestId("ev-summary").fill("Said the follow-up problem costs them patients.");
    await page.getByTestId("ev-save").click();
    await expect(page.getByTestId("evidence-dialog")).toBeHidden();
    const rows = await sql<{ task_id: string | null }>("select task_id from proof_evidence");
    expect(rows).toHaveLength(1);
    expect(rows[0].task_id).not.toBeNull();
  });

  test("a file can be attached, is stored under the founder's own folder, and only that founder can read it", async ({
    page,
    context,
  }) => {
    const { user } = await founderWithRoadmap(page, context);
    await openProof(page);
    await page.getByTestId("assumption-card").first().getByTestId("add-evidence").click();
    await page.getByTestId("ev-person").fill("Customer 9");
    await page.getByTestId("ev-summary").fill("Screenshot of their spreadsheet.");
    await page
      .getByTestId("ev-file")
      .setInputFiles({ name: "sheet.png", mimeType: "image/png", buffer: TINY_PNG });
    await page.getByTestId("ev-save").click();
    await expect(page.getByTestId("evidence-dialog")).toBeHidden();

    const objects = await sql<{ name: string; owner: string }>(
      "select name, owner::text as owner from storage.objects where bucket_id = 'proof-files'",
    );
    expect(objects).toHaveLength(1);
    expect(objects[0].name.startsWith(`${user.id}/`)).toBe(true);
    expect(objects[0].owner).toBe(user.id);
  });

  test("an unsupported or oversized file is refused before it is uploaded", async ({
    page,
    context,
  }) => {
    await founderWithRoadmap(page, context);
    await openProof(page);
    await page.getByTestId("assumption-card").first().getByTestId("add-evidence").click();
    await page.getByTestId("ev-file").setInputFiles({
      name: "run.exe",
      mimeType: "application/x-msdownload",
      buffer: Buffer.from("MZ"),
    });
    await expect(page.getByRole("alert").filter({ hasText: /supported/i })).toBeVisible();
  });
});

test.describe("Proof is private to its founder", () => {
  test("another account sees none of the first founder's assumptions or evidence", async ({
    page,
    context,
    browser,
  }) => {
    await founderWithRoadmap(page, context);
    await openProof(page);
    await addEvidence(page, { summary: "Private note", person: "P1", signal: "supports" });

    const other = await browser.newContext();
    const otherPage = await other.newPage();
    const { createUser, signIn } = await import("./helpers/stack");
    const stranger = await createUser({ fullName: "Someone Else" });
    await signIn(other, stranger);
    await otherPage.goto("/dashboard/proof");
    await expect(otherPage.getByTestId("assumption-card")).toHaveCount(0);
    await expect(otherPage.getByText("Private note")).toHaveCount(0);
    await other.close();
  });
});
