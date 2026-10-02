import { expect, test, type BrowserContext, type Page } from "@playwright/test";

import { chooseAndBuildRoadmap, founderWithDirections, founderWithRoadmap } from "./helpers/flows";
import { gotoApp } from "./helpers/page";
import { appUrl, forbidRealBackends, gemini, resetStack, sql } from "./helpers/stack";

test.beforeEach(async ({ page }) => {
  forbidRealBackends(page);
  await resetStack();
});

async function useHindi(context: BrowserContext) {
  await context.addCookies([{ name: "solventia-locale", value: "hi", url: appUrl() }]);
}

/** Interface text (buttons, links, labels, headings, paragraphs) that is still
 * plain English in Hindi mode. Brand and common technical terms are allowed. */
async function englishLeaks(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const allowed = new Set([
      "Solventia",
      "SOLVENTIA",
      "Sol",
      "AI",
      "SaaS",
      "B2B",
      "B2C",
      "API",
      "MVP",
      "CRM",
      "ROI",
      "KPI",
      "English",
      "Google",
      "VS",
      "PDF",
      "JPG",
      "PNG",
      "WEBP",
      "MB",
      "OTP",
      "SEO",
      "WhatsApp",
      "LinkedIn",
      "Instagram",
      "Excel",
      "NGO",
      "GB",
      "UI",
      "URL",
      "hrs",
      "lakh",
      "crore",
      "Ask",
    ]);
    const out: string[] = [];
    const nodes = document.querySelectorAll(
      "button, a, label, legend, h1, h2, h3, h4, summary, th, [role=tab], [role=radio], p, li, dt, dd",
    );
    nodes.forEach((el) => {
      if (el.closest("[data-ai], [lang=en], footer")) return;
      if (el.children.length > 0 && el.tagName !== "LI") return;
      const text = (el.textContent ?? "").trim();
      // An account's e-mail address is data, not interface text.
      if (!text || text.includes("@") || /[ऀ-ॿ]/.test(text)) return;
      const foreign = (text.match(/[A-Za-z]{2,}/g) ?? []).filter((w) => !allowed.has(w));
      if (foreign.length >= 3) out.push(text.slice(0, 90));
    });
    return out;
  });
}

const RAW_KEY =
  /\b(cc|opp|fit|pf|rm|hist|set|nav|hero|faq|about|orgs|shell|notif|askSol|consult|auth|common|mv|story|fmbi|hiwPage|howItWorks|adaptiveRoadmap|whySolventia|founderSignal|finalCta|signin)\.[A-Za-z_]+/;

test.describe("Hindi — public pages", () => {
  test("the homepage switches to Hindi, keeps the brand, and the choice survives a reload (server-rendered)", async ({
    page,
  }) => {
    await gotoApp(page, "/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Your Dream.");
    await page.getByTestId("language-switch").click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("आपका सपना");
    await expect(page.locator("html")).toHaveAttribute("lang", "hi");
    await expect(page.locator("header")).toContainText("SOLVENTIA");

    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("आपका सपना");
    // The very first HTML (no JavaScript) is already Hindi — no English flash.
    const html = await page.request.get("/", { headers: { cookie: "solventia-locale=hi" } });
    expect(await html.text()).toContain("आपका सपना");
  });

  for (const route of [
    "/",
    "/about",
    "/for-organizations",
    "/how-it-works",
    "/find-my-business-idea",
    "/sign-in",
  ]) {
    test(`${route} has no raw message keys and no untranslated interface text in Hindi`, async ({
      page,
      context,
    }) => {
      await useHindi(context);
      await gotoApp(page, route);
      const body = await page.locator("body").innerText();
      expect(body).not.toMatch(RAW_KEY);
      expect(body).not.toMatch(/undefined|\[object/);
      await expect.poll(() => englishLeaks(page)).toEqual([]);
    });
  }

  test("the consultation opens in Hindi with Hindi questions and Hindi option labels", async ({
    page,
    context,
  }) => {
    await useHindi(context);
    await gotoApp(page, "/consultation");
    await expect(page.getByTestId("stage-label")).toContainText("7");
    await expect(page.getByTestId("stage-label")).toContainText("चरण");
    const body = await page.locator("body").innerText();
    expect(body).not.toMatch(RAW_KEY);
    await expect.poll(() => englishLeaks(page)).toEqual([]);
  });
});

test.describe("Hindi — the founder workspace", () => {
  test("every dashboard screen is fully Hindi", async ({ page, context }) => {
    await useHindi(context);
    const { seeded } = await founderWithDirections(context);
    await gotoApp(page, "/dashboard");
    await page.getByTestId("flagship-choose").click();
    await page.getByTestId("build-roadmap").click();
    await expect(page.getByTestId("roadmap-page")).toBeVisible({ timeout: 60_000 });

    const routes = [
      "/dashboard",
      "/dashboard/opportunities",
      `/dashboard/opportunities/${seeded.opportunityIds[0]}`,
      `/dashboard/opportunities/${seeded.opportunityIds[0]}?tab=fit`,
      `/dashboard/opportunities/${seeded.opportunityIds[0]}?tab=market`,
      `/dashboard/opportunities/${seeded.opportunityIds[0]}?tab=economics`,
      "/dashboard/roadmap",
      "/dashboard/roadmap?tab=plan",
      "/dashboard/roadmap?tab=progress",
      "/dashboard/proof",
      "/dashboard/history",
      "/dashboard/settings",
    ];
    for (const route of routes) {
      await gotoApp(page, route);
      await page.waitForLoadState("networkidle");
      const body = await page.locator("body").innerText();
      expect(body, route).not.toMatch(RAW_KEY);
      expect(body, route).not.toMatch(/undefined|\[object|NaN/);
      await expect.poll(() => englishLeaks(page), { message: route, timeout: 30_000 }).toEqual([]);
    }
  });

  test("AI content is translated once, cached against its source, and not regenerated on later visits", async ({
    page,
    context,
  }) => {
    await useHindi(context);
    const { seeded } = await founderWithDirections(context);
    await gotoApp(page, `/dashboard/opportunities/${seeded.opportunityIds[0]}`);
    await expect(page.getByTestId("opportunity-title")).toContainText("हिंदी", { timeout: 45_000 });

    const first = await gemini.countOf("CONTENT_TRANSLATION");
    expect(first).toBeGreaterThan(0);
    const cached = await sql<{ source_hash: string; locale: string }>(
      "select source_hash, locale from content_translations",
    );
    expect(cached.length).toBeGreaterThan(0);
    expect(cached.every((r) => r.locale === "hi" && r.source_hash.length > 8)).toBe(true);

    await page.reload();
    await expect(page.getByTestId("opportunity-title")).toContainText("हिंदी", { timeout: 45_000 });
    expect(await gemini.countOf("CONTENT_TRANSLATION")).toBe(first);
    // Nothing new was generated either — translating is not regenerating.
    expect(await gemini.countOf("INITIAL_INTELLIGENCE")).toBe(0);
    expect(await gemini.countOf("EXPLORE_MORE")).toBe(0);
  });

  test("English content already stored is translated on demand, and switching back shows the original", async ({
    page,
    context,
  }) => {
    const { seeded } = await founderWithDirections(context);
    await gotoApp(page, `/dashboard/opportunities/${seeded.opportunityIds[0]}`);
    const english = (await page.getByTestId("opportunity-title").innerText()).trim();
    expect(english).not.toContain("हिंदी");

    await gotoApp(page, "/dashboard/settings");
    await page.getByTestId("lang-hi").click();
    await gotoApp(page, `/dashboard/opportunities/${seeded.opportunityIds[0]}`);
    await expect(page.getByTestId("opportunity-title")).toContainText("हिंदी", { timeout: 45_000 });

    await gotoApp(page, "/dashboard/settings");
    await page.getByTestId("lang-en").click();
    await gotoApp(page, `/dashboard/opportunities/${seeded.opportunityIds[0]}`);
    await expect(page.getByTestId("opportunity-title")).toHaveText(english);
  });

  test("a roadmap built while Hindi is active is written in Hindi, and reads in English after switching", async ({
    page,
    context,
  }) => {
    await useHindi(context);
    await founderWithDirections(context);
    await chooseAndBuildRoadmap(page);
    expect(
      (await gemini.calls()).filter((c) => c.purpose === "WEEK_DETAIL").every((c) => c.hindi),
    ).toBe(true);
    await expect(page.getByTestId("week-title")).toContainText("हिंदी");

    await gotoApp(page, "/dashboard/settings");
    await page.getByTestId("lang-en").click();
    await gotoApp(page, "/dashboard/roadmap");
    await expect(page.getByTestId("week-title")).not.toContainText("हिंदी", { timeout: 45_000 });
    const translationCalls = await gemini.countOf("CONTENT_TRANSLATION");
    await page.reload();
    await expect(page.getByTestId("week-title")).not.toContainText("हिंदी", { timeout: 45_000 });
    expect(await gemini.countOf("CONTENT_TRANSLATION")).toBe(translationCalls);
  });

  test("Proof assumptions and Ask Sol answer in Hindi when Hindi is active", async ({
    page,
    context,
  }) => {
    await useHindi(context);
    await founderWithDirections(context);
    await chooseAndBuildRoadmap(page);
    await gotoApp(page, "/dashboard/proof");
    await expect(page.getByTestId("assumption-card").first()).toBeVisible({ timeout: 60_000 });
    expect((await gemini.calls()).find((c) => c.purpose === "PROOF_ASSUMPTIONS")?.hindi).toBe(true);

    await page.getByTestId("ask-sol-launcher").click();
    await page.getByTestId("ask-sol-input").fill("मैं कहां से शुरू करूं?");
    await page.getByTestId("ask-sol-send").click();
    await expect(page.getByTestId("ask-sol-panel")).toContainText("हिंदी", { timeout: 45_000 });
    expect(
      (await gemini.calls()).filter((c) => c.purpose === "SOL_MESSAGE").every((c) => c.hindi),
    ).toBe(true);
    void founderWithRoadmap;
  });
});
