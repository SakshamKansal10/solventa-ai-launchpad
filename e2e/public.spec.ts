import { expect, test, type Page } from "@playwright/test";

import { gotoApp } from "./helpers/page";
import { forbidRealBackends, resetStack } from "./helpers/stack";

test.beforeEach(async ({ page }) => {
  forbidRealBackends(page);
  await resetStack();
});

async function noHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

/**
 * `/` is the cinematic homepage — its story, navigation, sound and still version are covered by
 * cinematic.spec.ts. Here: what every public page shares with it.
 */
test.describe("homepage", () => {
  test("is the cinematic film, with the site's own footer and a real way in", async ({ page }) => {
    await gotoApp(page, "/?tier=fallback");
    await expect(page.getByTestId("cinematic-home")).toBeVisible();
    await expect(page.locator("h1").first()).toBeVisible();
    await expect(
      page.getByRole("banner").getByRole("link", { name: /Find My Business Idea/ }),
    ).toHaveAttribute("href", "/consultation");
    await expect(page.locator("footer")).toBeVisible();
  });

  test("footer links reach the legal pages", async ({ page }) => {
    await gotoApp(page, "/");
    await page.locator("footer").getByRole("link", { name: "Privacy" }).first().click();
    await expect(page).toHaveURL(/\/privacy$/);
    await expect(page.locator("h1")).toBeVisible();
    await page.locator("footer").getByRole("link", { name: "Terms" }).first().click();
    await expect(page).toHaveURL(/\/terms$/);
  });
});

test.describe("site identity", () => {
  test("names the site Solventia in structured data, declares the official icons, and carries no Lovable branding", async ({
    page,
    request,
  }) => {
    await gotoApp(page, "/");
    const ld = await page.locator('script[type="application/ld+json"]').allInnerTexts();
    const parsed = ld.map(
      (t) => JSON.parse(t) as { "@type": string; name: string; logo?: string; url: string },
    );
    const site = parsed.find((p) => p["@type"] === "WebSite");
    const org = parsed.find((p) => p["@type"] === "Organization");
    expect(site?.name).toBe("Solventia");
    expect(org?.name).toBe("Solventia");
    expect(org?.logo).toMatch(/\/icon-512\.png$/);
    // Names the site "Solventia", never "Solventia.in".
    expect(JSON.stringify(parsed)).not.toMatch(/"name":"Solventia\.in"/);

    for (const href of [
      "/favicon.ico",
      "/favicon-48x48.png",
      "/favicon-96x96.png",
      "/apple-touch-icon.png",
      "/icon-512.png",
      "/site.webmanifest",
    ]) {
      const res = await request.get(href);
      expect(res.status(), href).toBe(200);
    }
    const html = await page.content();
    expect(html.toLowerCase()).not.toContain("lovable");
    await expect(page).toHaveTitle(/Solventia/);
  });

  test("canonical URLs follow the configured site origin (localhost stays localhost)", async ({
    page,
  }) => {
    for (const route of ["/", "/about", "/sign-in", "/how-it-works"]) {
      await gotoApp(page, route);
      const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
      expect(canonical, route).toMatch(/^http:\/\/localhost:\d+/);
    }
  });

  test("private app screens are not indexable", async ({ page }) => {
    await page.goto("/auth/callback");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });
});

test.describe("no horizontal overflow on public pages", () => {
  const sizes = [
    { width: 1440, height: 900 },
    { width: 1024, height: 768 },
    { width: 390, height: 844 },
  ];
  const routes = [
    "/",
    "/about",
    "/for-organizations",
    "/how-it-works",
    "/find-my-business-idea",
    "/sign-in",
    "/privacy",
    "/terms",
    "/data-deletion",
  ];
  for (const size of sizes) {
    test(`${size.width}px`, async ({ page }) => {
      await page.setViewportSize(size);
      for (const route of routes) {
        await gotoApp(page, route);
        await noHorizontalOverflow(page);
      }
    });
  }
});
