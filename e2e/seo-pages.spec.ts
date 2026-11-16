import { expect, test } from "@playwright/test";

import { gotoApp } from "./helpers/page";
import { forbidRealBackends } from "./helpers/stack";

test.beforeEach(async ({ page }) => {
  forbidRealBackends(page);
});

const PAGES = [
  ["/how-it-works", "How it works — Solventia"],
  ["/ideas", "Business idea examples — Solventia"],
  ["/for-founders", "For founders — Solventia"],
  ["/about", "About — Solventia"],
  ["/faq", "Questions — Solventia"],
] as const;

test.describe("public pages for search (site name, sitelinks)", () => {
  for (const [path, title] of PAGES) {
    test(`${path}: unique title, one H1, canonical, breadcrumb, links to the others`, async ({
      page,
    }) => {
      await gotoApp(page, path);
      await expect(page).toHaveTitle(title);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        "href",
        new RegExp(`${path}$`),
      );
      await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /.{40,}/);
      const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
      expect(ld.some((s) => s.includes("BreadcrumbList"))).toBe(true);
      for (const [href] of PAGES)
        expect(await page.locator(`footer a[href="${href}"]`).count(), href).toBeGreaterThan(0);
    });
  }

  test("home: title starts with Solventia, a text summary links to the pages, robots and sitemap", async ({
    page,
    request,
  }) => {
    await gotoApp(page, "/");
    await expect(page).toHaveTitle(/^Solventia/);
    const summary = page.getByTestId("site-summary");
    for (const [href] of PAGES) await expect(summary.locator(`a[href="${href}"]`)).toHaveCount(1);
    await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute(
      "content",
      "Solventia",
    );
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /dashboard");
    expect(robots).toContain("Disallow: /admin");
    const sitemap = await (await request.get("/sitemap.xml")).text();
    for (const [href] of PAGES) expect(sitemap).toContain(`https://solventia.in${href}</loc>`);
    expect(sitemap).toContain("<lastmod>");
  });
});
