import { expect, test } from "@playwright/test";

import { gotoApp } from "./helpers/page";
import { appUrl, forbidRealBackends } from "./helpers/stack";

/**
 * One address (owner, 2026-11-17): the site and the legal pages show only sol@solventia.in, as
 * text and as every mailto link, in English and Hindi. (Emails: src/lib/contact.test.ts.)
 */
const PAGES = ["/", "/privacy", "/terms", "/data-deletion", "/for-organizations", "/about", "/faq"];
const ADDRESS = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[a-z]{2,}/g;

for (const locale of ["en", "hi"] as const) {
  test(`only sol@solventia.in on the site and legal pages (${locale})`, async ({
    page,
    context,
  }) => {
    test.setTimeout(120_000);
    forbidRealBackends(page);
    await context.addCookies([{ name: "solventia-locale", value: locale, url: appUrl() }]);
    let mailtos = 0;
    for (const path of PAGES) {
      await gotoApp(page, path);
      const hrefs = await page
        .locator('a[href^="mailto:"]')
        .evaluateAll((as) => as.map((a) => a.getAttribute("href")!));
      for (const h of hrefs) expect(h, `${path}: ${h}`).toMatch(/^mailto:sol@solventia\.in(\?|$)/);
      mailtos += hrefs.length;
      // The whole served page — visible text, hidden text and structured data.
      const html = await page.content();
      const others = [...new Set(html.match(ADDRESS) ?? [])].filter(
        (a) => a !== "sol@solventia.in" && !/@example\.(com|test)$/.test(a) && !/@\d/.test(a),
      );
      expect(others, path).toEqual([]);
      expect(html, path).not.toMatch(/gmail\.com/i);
    }
    // The address is actually offered (footer, legal pages, data deletion, organisations).
    expect(mailtos).toBeGreaterThanOrEqual(PAGES.length - 2);
  });
}
