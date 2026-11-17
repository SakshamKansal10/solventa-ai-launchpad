import fs from "node:fs";

import { expect, test, type Page } from "@playwright/test";

import { founderWithRoadmap } from "./helpers/flows";
import { gotoApp } from "./helpers/page";
import { appUrl, forbidRealBackends, gemini, resetStack } from "./helpers/stack";

/**
 * No header or top bar overlaps itself on a phone (owner, 2026-11-17: on a 390px iPhone the
 * consultation's "Stage 1 of 7" was drawn over the language button). Every header on the site —
 * home film bar, consultation, sign-in, legal and info pages, dashboard, mission page, the
 * generation screen — at 320, 360, 390 and 430px, in English and Hindi: no two buttons, links,
 * fields or pieces of text in the header intersect, nothing leaves the screen, and every button
 * is at least 44px tall... where the header has room for it (the dashboard's own rules apply).
 */
const WIDTHS = [320, 360, 390, 430];
const SHOTS = "docs/redesign/perf/headers";

test.beforeEach(async ({ page }) => {
  forbidRealBackends(page);
  await resetStack();
});

/** Runs in the page: the header's boxes that intersect, and anything off screen. */
function headerProblems() {
  const header = [...document.querySelectorAll<HTMLElement>("header")].find((h) => {
    const r = h.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.top < 40;
  });
  if (!header) return ["no header found"];
  const visible = (e: Element) => {
    const cs = getComputedStyle(e);
    if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) === 0)
      return false;
    const r = e.getBoundingClientRect();
    return r.width > 2 && r.height > 2;
  };
  const interactive = "a,button,input,select,textarea,[role=button],[role=switch]";
  const boxes: { label: string; el: Element; r: DOMRect }[] = [];
  for (const el of header.querySelectorAll(interactive)) {
    if (!visible(el) || el.closest("[aria-hidden=true]")) continue;
    boxes.push({
      label: `${el.tagName.toLowerCase()} "${(el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 30)}"`,
      el,
      r: el.getBoundingClientRect(),
    });
  }
  // Text outside the controls, measured by its glyphs (not its box).
  const walker = document.createTreeWalker(header, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const text = n.textContent?.trim();
    const parent = n.parentElement;
    if (!text || !parent || parent.closest(interactive) || !visible(parent)) continue;
    if (parent.closest(".sr-only,[aria-hidden=true]")) continue;
    const range = document.createRange();
    range.selectNodeContents(n);
    const r = range.getBoundingClientRect();
    if (r.width > 1) boxes.push({ label: `text "${text.slice(0, 30)}"`, el: parent, r });
  }
  const out: string[] = [];
  for (let i = 0; i < boxes.length; i++) {
    const a = boxes[i];
    if (a.r.right > innerWidth + 1 || a.r.left < -1)
      out.push(`${a.label} off screen (${Math.round(a.r.left)}–${Math.round(a.r.right)})`);
    for (let j = i + 1; j < boxes.length; j++) {
      const b = boxes[j];
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
      const w = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
      const h = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
      if (w > 1 && h > 1)
        out.push(`${a.label} overlaps ${b.label} (${Math.round(w)}×${Math.round(h)})`);
    }
  }
  return out;
}

async function check(page: Page, where: string, problems: string[]) {
  await page.waitForTimeout(400);
  const found = await page.evaluate(headerProblems);
  for (const p of found) problems.push(`${where}: ${p}`);
}

const PUBLIC = ["/", "/consultation", "/sign-in", "/privacy", "/terms", "/about", "/how-it-works"];

for (const locale of ["en", "hi"] as const) {
  test(`public headers at 320–430px (${locale})`, async ({ page, context }) => {
    test.setTimeout(300_000);
    await context.addCookies([{ name: "solventia-locale", value: locale, url: appUrl() }]);
    const problems: string[] = [];
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 800 });
      for (const path of PUBLIC) {
        await gotoApp(page, path === "/" ? "/?film=reduced" : path);
        await check(page, `${width} ${path}`, problems);
        if (width === 390 && path === "/consultation") {
          fs.mkdirSync(SHOTS, { recursive: true });
          await page.screenshot({
            path: `${SHOTS}/after-consultation-390-${locale}.png`,
            clip: { x: 0, y: 0, width: 390, height: 160 },
          });
        }
      }
    }
    expect(problems).toEqual([]);
  });

  test(`signed-in headers at 320–430px (${locale})`, async ({ page, context }) => {
    test.setTimeout(360_000);
    await founderWithRoadmap(page, context);
    await context.addCookies([{ name: "solventia-locale", value: locale, url: appUrl() }]);
    const problems: string[] = [];
    await gemini.delay("EXPLORE_MORE", 60_000);
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 800 });
      for (const path of ["/dashboard", "/dashboard/opportunities", "/dashboard/settings"]) {
        await gotoApp(page, path);
        await check(page, `${width} ${path}`, problems);
      }
      await gotoApp(page, "/dashboard/roadmap");
      await page.getByTestId("mission-open").first().click();
      await expect(page.getByTestId("mission-page")).toBeVisible({ timeout: 30_000 });
      await check(page, `${width} mission`, problems);
    }
    // The generation screen (held open by a slow fake generation).
    await gotoApp(page, "/dashboard/directions/finding?kind=more&start=true");
    await expect(page.getByTestId("finding")).toBeVisible({ timeout: 30_000 });
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 800 });
      await check(page, `${width} generation screen`, problems);
      if (width === 390) {
        fs.mkdirSync(SHOTS, { recursive: true });
        await page.screenshot({
          path: `${SHOTS}/after-generation-390-${locale}.png`,
          clip: { x: 0, y: 0, width: 390, height: 160 },
        });
      }
    }
    await gemini.clearBehavior();
    expect(problems).toEqual([]);
  });
}
