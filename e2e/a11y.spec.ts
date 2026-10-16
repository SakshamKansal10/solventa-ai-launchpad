import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { chooseAndBuildRoadmap, founderWithDirections } from "./helpers/flows";
import { gotoApp } from "./helpers/page";
import { createUser, forbidRealBackends, resetStack, signIn } from "./helpers/stack";

test.beforeEach(async ({ page }) => {
  forbidRealBackends(page);
  await resetStack();
});

interface Finding {
  id: string;
  impact: string | null | undefined;
  nodes: number;
  sample: string;
}

async function audit(page: Page, label: string): Promise<Finding[]> {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  return results.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => ({
      id: `${label}: ${v.id}`,
      impact: v.impact,
      nodes: v.nodes.length,
      sample: v.nodes[0]?.html.slice(0, 140) ?? "",
    }));
}

test.describe("accessibility (WCAG 2.1 A/AA, serious and critical only)", () => {
  test("public pages", async ({ page }) => {
    const findings: Finding[] = [];
    for (const route of [
      "/",
      "/about",
      "/for-organizations",
      "/how-it-works",
      "/find-my-business-idea",
      "/sign-in",
      "/consultation",
      "/privacy",
      "/terms",
    ]) {
      await gotoApp(page, route);
      await page.waitForLoadState("networkidle");
      findings.push(...(await audit(page, route)));
    }
    expect(findings, JSON.stringify(findings, null, 2)).toEqual([]);
  });

  test("the empty Command Center (no consultation yet)", async ({ page, context }) => {
    const user = await createUser({ fullName: "Asha Verma" });
    await signIn(context, user);
    await gotoApp(page, "/dashboard");
    await expect(page.getByTestId("no-consultation")).toBeVisible();
    await page.waitForLoadState("networkidle");
    const findings = await audit(page, "command-center empty");
    expect(findings, JSON.stringify(findings, null, 2)).toEqual([]);
  });

  test("the founder workspace", async ({ page, context }) => {
    test.setTimeout(240_000);
    const { seeded } = await founderWithDirections(context);
    const findings: Finding[] = [];
    await gotoApp(page, "/dashboard");
    await page.waitForLoadState("networkidle");
    // The side-by-side fit table only exists once its cells have loaded.
    await expect(page.getByTestId("direction-compare")).toBeVisible();
    await expect(page.getByTestId("direction-compare").locator("[data-status]")).toHaveCount(12);
    findings.push(...(await audit(page, "command-center A")));

    // State B: the dark build surface, then on to the roadmap.
    await page.getByTestId("flagship-choose").click();
    await expect(page.getByTestId("build-roadmap")).toBeEnabled();
    await expect(page.getByTestId("chosen-fit")).toBeVisible();
    await page.waitForLoadState("networkidle");
    // The customer → problem → product chain fades in. Audit the settled frame
    // (every item fully opaque), not a mid-fade one — the rules are unchanged.
    const chainItems = page.getByTestId("chosen-direction").getByRole("listitem");
    await expect(chainItems).toHaveCount(3);
    for (let i = 0; i < 3; i++) await expect(chainItems.nth(i)).toHaveCSS("opacity", "1");
    findings.push(...(await audit(page, "command-center B")));
    await page.getByTestId("build-roadmap").click();
    await expect(page).toHaveURL(/\/dashboard\/roadmap/, { timeout: 60_000 });
    await expect(page.getByTestId("roadmap-page")).toBeVisible({ timeout: 30_000 });

    for (const route of [
      "/dashboard",
      "/dashboard/opportunities",
      `/dashboard/opportunities/${seeded.opportunityIds[0]}`,
      `/dashboard/opportunities/${seeded.opportunityIds[0]}?tab=fit`,
      `/dashboard/opportunities/${seeded.opportunityIds[0]}?tab=market`,
      "/dashboard/roadmap",
      "/dashboard/roadmap?tab=plan",
      "/dashboard/roadmap?tab=progress",
      "/dashboard/proof",
      "/dashboard/history",
      "/dashboard/settings",
    ]) {
      await gotoApp(page, route);
      await page.waitForLoadState("networkidle");
      findings.push(...(await audit(page, route)));
    }
    expect(findings, JSON.stringify(findings, null, 2)).toEqual([]);
  });

  test("dialogs, sheets and panels", async ({ page, context }) => {
    test.setTimeout(240_000);
    await founderWithDirections(context);
    await chooseAndBuildRoadmap(page);
    const findings: Finding[] = [];

    await page.getByTestId("ask-sol-launcher").click();
    await expect(page.getByTestId("ask-sol-panel")).toBeVisible();
    findings.push(...(await audit(page, "ask sol")));
    await page.getByTestId("ask-sol-close").click();

    await page.getByTestId("notification-bell").click();
    await expect(page.getByTestId("notification-panel")).toBeVisible();
    findings.push(...(await audit(page, "notifications")));
    await page.keyboard.press("Escape");

    await page.getByTestId("mission-card").nth(1).getByTestId("mission-toggle").click();
    findings.push(...(await audit(page, "mission details")));

    await gotoApp(page, "/dashboard/proof");
    await expect(page.getByTestId("assumption-card").first()).toBeVisible({ timeout: 45_000 });
    await page.getByTestId("assumption-card").first().getByTestId("add-evidence").click();
    await expect(page.getByTestId("evidence-dialog")).toBeVisible();
    findings.push(...(await audit(page, "evidence dialog")));
    await page.keyboard.press("Escape");

    await gotoApp(page, "/dashboard/settings");
    await page.getByTestId("edit-location").click();
    await expect(page.getByTestId("founder-edit-sheet")).toBeVisible();
    findings.push(...(await audit(page, "founder edit sheet")));

    expect(findings, JSON.stringify(findings, null, 2)).toEqual([]);
  });

  test("keyboard: every interactive control on the main screens shows a visible focus indicator", async ({
    page,
    context,
  }) => {
    await founderWithDirections(context);
    await gotoApp(page, "/dashboard");
    const missing: string[] = [];
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press("Tab");
      const info = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        const cs = getComputedStyle(el);
        const outline = cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0;
        const ring = cs.boxShadow !== "none" && cs.boxShadow !== "";
        return {
          label: (el.getAttribute("aria-label") ?? el.textContent ?? el.tagName)
            .trim()
            .slice(0, 40),
          visible: outline || ring,
        };
      });
      if (info && !info.visible) missing.push(info.label);
    }
    expect(missing).toEqual([]);
  });
});
