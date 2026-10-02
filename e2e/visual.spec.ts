import { mkdirSync } from "node:fs";
import path from "node:path";

import { expect, test, type BrowserContext, type Page } from "@playwright/test";

import { completeAllMissions, founderWithDirections } from "./helpers/flows";
import { gotoApp } from "./helpers/page";
import { appUrl, forbidRealBackends, resetStack, sql } from "./helpers/stack";

/**
 * Screenshots of every key screen at the three reference sizes, for a human to
 * look at (`.e2e-tmp/screens/<size>/<name>.png`), plus the mechanical checks
 * that do not need eyes: no horizontal overflow, nothing wider than the
 * viewport, and no unreadably small text.
 */

const SIZES = [
  { name: "1440x900", width: 1440, height: 900 },
  { name: "1024x768", width: 1024, height: 768 },
  { name: "390x844", width: 390, height: 844 },
];

const OUT = path.resolve(process.cwd(), ".e2e-tmp/screens");

test.beforeEach(async ({ page }) => {
  forbidRealBackends(page);
  await resetStack();
});

async function overflow(page: Page) {
  return page.evaluate(() => {
    const doc = document.documentElement.scrollWidth - window.innerWidth;
    const wide: string[] = [];
    document.querySelectorAll("body *").forEach((el) => {
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      if (style.position === "fixed" || style.display === "none" || r.width === 0) return;
      // Inside an intentionally scrolling strip (e.g. the phase strip) is fine.
      if (el.closest("[class*='overflow-x-auto'], [class*='overflow-hidden']")) return;
      if (r.right > window.innerWidth + 1 && r.left < window.innerWidth) {
        wide.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)}`);
      }
    });
    return { doc, wide: wide.slice(0, 5) };
  });
}

async function shoot(page: Page, size: string, name: string, opts: { tall?: boolean } = {}) {
  const dir = path.join(OUT, size);
  mkdirSync(dir, { recursive: true });
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(400);
  const o = await overflow(page);
  expect(o.doc, `${size}/${name} horizontal overflow`).toBeLessThanOrEqual(1);
  expect(o.wide, `${size}/${name} elements past the right edge`).toEqual([]);
  await page.screenshot({ path: path.join(dir, `${name}.png`), animations: "disabled" });
  if (opts.tall) {
    const vp = page.viewportSize()!;
    const height = await page.evaluate(() => {
      const area = document.querySelector("[data-testid=scroll-area]");
      return area ? area.scrollHeight + 72 : document.documentElement.scrollHeight;
    });
    await page.setViewportSize({
      width: vp.width,
      height: Math.min(Math.max(height, vp.height), 3600),
    });
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(dir, `${name}-tall.png`), animations: "disabled" });
    await page.setViewportSize(vp);
  }
}

async function useHindi(context: BrowserContext) {
  await context.addCookies([{ name: "solventia-locale", value: "hi", url: appUrl() }]);
}

for (const size of SIZES) {
  test.describe(`visual — ${size.name}`, () => {
    test.use({ viewport: { width: size.width, height: size.height } });

    test("public pages", async ({ page }) => {
      test.setTimeout(240_000);
      for (const [name, route] of [
        ["home", "/"],
        ["about", "/about"],
        ["for-organizations", "/for-organizations"],
        ["how-it-works", "/how-it-works"],
        ["find-my-business-idea", "/find-my-business-idea"],
        ["sign-in", "/sign-in"],
        ["privacy", "/privacy"],
        ["terms", "/terms"],
      ] as const) {
        await gotoApp(page, route);
        if (name === "home") {
          // Scroll through so lazy/animated sections have played before the full-page shot.
          await page.evaluate(async () => {
            for (let y = 0; y < document.body.scrollHeight; y += 600) {
              window.scrollTo(0, y);
              await new Promise((r) => setTimeout(r, 120));
            }
            window.scrollTo(0, 0);
          });
          await page.waitForTimeout(3500);
          const dir = path.join(OUT, size.name);
          mkdirSync(dir, { recursive: true });
          await page.screenshot({ path: path.join(dir, "home-full.png"), fullPage: true });
        }
        await shoot(page, size.name, name);
      }
    });

    test("consultation", async ({ page }) => {
      await gotoApp(page, "/consultation");
      await page.evaluate(() => window.localStorage.clear());
      await gotoApp(page, "/consultation");
      await shoot(page, size.name, "consultation-basics");
      await page.getByTestId("input-age").fill("21");
      await page.getByTestId("opt-status-college_student").click();
      await page.getByTestId("btn-continue").click();
      await expect(page.getByTestId("screen-location")).toBeVisible();
      await shoot(page, size.name, "consultation-location");
    });

    test("founder workspace", async ({ page, context }) => {
      test.setTimeout(900_000);
      const { user, seeded } = await founderWithDirections(context);
      await gotoApp(page, "/dashboard");
      await shoot(page, size.name, "command-center-a", { tall: true });

      await page.getByTestId("flagship-choose").click();
      await expect(page.getByTestId("build-roadmap")).toBeVisible();
      await shoot(page, size.name, "command-center-b");

      await page.getByTestId("build-roadmap").click();
      await expect(
        page.getByTestId("build-status").or(page.getByTestId("roadmap-page")),
      ).toBeVisible({ timeout: 60_000 });
      await expect(page.getByTestId("roadmap-page")).toBeVisible({ timeout: 60_000 });
      await shoot(page, size.name, "roadmap-week", { tall: true });
      await page.getByTestId("mission-card").nth(1).getByTestId("mission-toggle").click();
      await shoot(page, size.name, "roadmap-week-mission-open");

      await gotoApp(page, "/dashboard/roadmap?tab=plan");
      await shoot(page, size.name, "roadmap-plan", { tall: true });
      await gotoApp(page, "/dashboard/roadmap?tab=progress");
      await shoot(page, size.name, "roadmap-progress");

      await gotoApp(page, "/dashboard");
      await shoot(page, size.name, "command-center-c", { tall: true });

      const opp = seeded.opportunityIds[0];
      for (const tab of ["overview", "fit", "market", "economics", "proof"]) {
        await gotoApp(page, `/dashboard/opportunities/${opp}?tab=${tab}`);
        await shoot(page, size.name, `opportunity-${tab}`, {
          tall: tab === "overview" || tab === "fit",
        });
      }
      await gotoApp(page, "/dashboard/opportunities");
      await shoot(page, size.name, "opportunities-list");

      await gotoApp(page, "/dashboard/proof");
      await expect(page.getByTestId("assumption-card").first()).toBeVisible({ timeout: 60_000 });
      await shoot(page, size.name, "proof", { tall: true });
      await page.getByTestId("assumption-card").first().getByTestId("add-evidence").click();
      await expect(page.getByTestId("evidence-dialog")).toBeVisible();
      await shoot(page, size.name, "proof-add-evidence");
      await page.getByTestId("ev-person").fill("Clinic owner");
      await page.getByTestId("ev-summary").fill("Said follow-ups are dropped every week.");
      await page.getByTestId("ev-save").click();
      await expect(page.getByTestId("evidence-dialog")).toBeHidden();
      await page
        .getByTestId("assumption-card")
        .first()
        .getByRole("button", { name: /details/i })
        .first()
        .click();
      await expect(page.getByTestId("assumption-sheet")).toBeVisible();
      await shoot(page, size.name, "proof-assumption-detail");
      await page.keyboard.press("Escape");

      await gotoApp(page, "/dashboard/history");
      await shoot(page, size.name, "history");

      await gotoApp(page, "/dashboard/settings");
      await shoot(page, size.name, "settings", { tall: true });
      await page.getByTestId("edit-skills").click();
      await expect(page.getByTestId("founder-edit-sheet")).toBeVisible();
      await shoot(page, size.name, "settings-edit-skills");
      await page.keyboard.press("Escape");

      await gotoApp(page, "/dashboard");
      await page.getByTestId("notification-bell").click();
      await shoot(page, size.name, "notifications");
      await page.keyboard.press("Escape");
      await page.getByTestId("ask-sol-launcher").click();
      await expect(page.getByTestId("ask-sol-panel")).toBeVisible();
      await page.waitForTimeout(500);
      await shoot(page, size.name, "ask-sol");

      // Finish the week to see the review dialog and the generated Week 02.
      await gotoApp(page, "/dashboard/roadmap");
      await completeAllMissions(page);
      await shoot(page, size.name, "roadmap-ready-to-review");
      await page.getByTestId("review-week").click();
      await shoot(page, size.name, "roadmap-review-dialog");
      await page.getByTestId("outcome-stronger").click();
      await page.getByTestId("prepare-next-week").click();
      await expect(page.getByTestId("adaptation-note")).toBeVisible({ timeout: 60_000 });
      await shoot(page, size.name, "roadmap-week-2", { tall: true });
      void user;
      void sql;
    });

    test("Hindi", async ({ page, context }) => {
      test.setTimeout(240_000);
      await useHindi(context);
      const { seeded } = await founderWithDirections(context);
      await gotoApp(page, "/");
      await shoot(page, size.name, "hi-home");
      await gotoApp(page, "/consultation");
      await shoot(page, size.name, "hi-consultation");
      await gotoApp(page, "/dashboard");
      await shoot(page, size.name, "hi-command-center", { tall: true });
      await page.getByTestId("flagship-choose").click();
      await page.getByTestId("build-roadmap").click();
      await expect(page.getByTestId("roadmap-page")).toBeVisible({ timeout: 60_000 });
      await shoot(page, size.name, "hi-roadmap", { tall: true });
      await gotoApp(page, `/dashboard/opportunities/${seeded.opportunityIds[0]}?tab=fit`);
      await shoot(page, size.name, "hi-opportunity-fit", { tall: true });
      await gotoApp(page, "/dashboard/settings");
      await shoot(page, size.name, "hi-settings", { tall: true });
    });
  });
}

test.describe("text is never unreadably small", () => {
  test("no visible body/interface text under 14px on the main screens (brand lockup excepted)", async ({
    page,
    context,
  }) => {
    test.setTimeout(240_000);
    await founderWithDirections(context);
    const tiny: string[] = [];
    const scan = async (label: string) => {
      const found = await page.evaluate(() => {
        const out: string[] = [];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let node: Node | null;
        while ((node = walker.nextNode())) {
          const text = (node.textContent ?? "").trim();
          const el = node.parentElement;
          if (!text || !el || el.closest("script, style, .sr-only, [aria-hidden=true]")) continue;
          const cs = getComputedStyle(el);
          if (cs.visibility === "hidden" || cs.display === "none") continue;
          const px = parseFloat(cs.fontSize);
          if (px < 13.5 && !/VALIDATE|SOLVENTIA/.test(text))
            out.push(`${px}px "${text.slice(0, 40)}"`);
        }
        return [...new Set(out)].slice(0, 8);
      });
      found.forEach((f) => tiny.push(`${label}: ${f}`));
    };
    for (const route of [
      "/",
      "/about",
      "/consultation",
      "/dashboard",
      "/dashboard/opportunities",
      "/dashboard/roadmap",
      "/dashboard/proof",
      "/dashboard/history",
      "/dashboard/settings",
      "/privacy",
    ]) {
      await gotoApp(page, route);
      await page.waitForLoadState("networkidle");
      await scan(route);
    }
    expect(tiny).toEqual([]);
  });
});
