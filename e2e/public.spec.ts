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

test.describe("homepage", () => {
  test("is one continuous story in the intended order with no filler sections", async ({
    page,
  }) => {
    await gotoApp(page, "/");
    const order = await page.evaluate(() => {
      const top = (sel: string) => {
        const el = document.querySelector(sel);
        return el ? el.getBoundingClientRect().top + window.scrollY : Number.POSITIVE_INFINITY;
      };
      return {
        hero: top("main section:first-of-type"),
        signal: top("#founder-signal"),
        opportunity: top("#opportunity-demo"),
        how: top("#how-it-works"),
        adaptive: top("#adaptive-roadmap"),
        proof: top("#proof-demo"),
        why: top("#ask-sol-demo"),
        faq: top("#faq"),
        cta: top("main section:has(a[href='/for-organizations'])"),
      };
    });
    expect(order.hero).toBeLessThan(order.signal);
    expect(order.signal).toBeLessThan(order.opportunity);
    expect(order.opportunity).toBeLessThan(order.how);
    expect(order.how).toBeLessThan(order.adaptive);
    expect(order.adaptive).toBeLessThan(order.proof);
    expect(order.proof).toBeLessThan(order.why);
    expect(order.why).toBeLessThan(order.cta);
    expect(order.cta).toBeLessThan(order.faq);

    // Exactly the intended nine blocks: hero, the six product demonstrations, closing CTA, FAQ
    // (footer is outside main; the connectors between sections are not sections).
    await expect(page.locator("main > section")).toHaveCount(9);
    const text = await page.locator("main").innerText();
    expect(text).not.toMatch(/Business DNA/i);
    expect(text).not.toMatch(/Founder Genome/i);
  });

  test("the navbar is 76px tall and its four links work", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoApp(page, "/");
    const header = await page.locator("header").first().boundingBox();
    expect(Math.round(header!.height)).toBe(76);

    const nav = page.getByRole("banner");
    await nav.getByRole("button", { name: "Product" }).click();
    await expect(page.locator("#founder-signal")).toBeInViewport();
    await nav.getByRole("button", { name: "How It Works" }).click();
    await expect(page.locator("#how-it-works")).toBeInViewport();
    await nav.getByRole("link", { name: "For Organizations" }).click();
    await expect(page).toHaveURL(/\/for-organizations$/);
    await page.getByRole("banner").getByRole("link", { name: "About" }).click();
    await expect(page).toHaveURL(/\/about$/);
  });

  test("hero shows plain-word signals — no fake numeric score — and both calls to action work", async ({
    page,
  }) => {
    await gotoApp(page, "/");
    const hero = page.locator("main section").first();
    await expect(hero).toContainText("Founder Fit");
    await expect(hero).toContainText("Strong");
    // "Week 01" is a label; any other 2–3 digit number would be a made-up score.
    expect((await hero.innerText()).replace("Week 01", "")).not.toMatch(/\b\d{2,3}\b/);
    await hero.getByRole("button", { name: "See How It Works" }).click();
    await expect(page.locator("#how-it-works")).toBeInViewport();
    await gotoApp(page, "/");
    await page
      .locator("main section")
      .first()
      .getByRole("button", { name: "Find My Business Idea" })
      .click();
    await expect(page).toHaveURL(/\/consultation$/);
  });

  test("the Founder Intelligence demonstration is labelled, shows nine signals flowing to three directions, and reacts", async ({
    page,
  }) => {
    await gotoApp(page, "/");
    const demo = page.getByTestId("founder-signal-demo");
    await demo.scrollIntoViewIfNeeded();
    await expect(page.getByTestId("demo-label")).toHaveText("PRODUCT DEMONSTRATION");
    for (const sig of [
      "education",
      "skills",
      "experience",
      "capital",
      "time",
      "location",
      "access",
      "risk",
      "ambition",
    ])
      await expect(page.getByTestId(`signal-${sig}`)).toBeVisible();
    await expect(page.getByTestId("signal-node")).toBeVisible();
    await expect(
      page.getByTestId("demo-directions").locator("[data-testid^=direction-]"),
    ).toHaveCount(3);
    // The sequence plays through: the node pulses, then the strongest direction settles.
    await expect(demo).toHaveAttribute("data-phase", "4", { timeout: 10_000 });
    await expect(page.getByTestId("direction-1")).toHaveAttribute("data-strongest", "true");
    await expect(page.getByTestId("direction-1")).toContainText("Strongest direction");

    const first = await page.getByTestId("demo-directions").innerText();
    await page.getByTestId("scenario-b").click();
    await expect(page.getByTestId("demo-directions")).toHaveAttribute("data-scenario", "b");
    expect(await page.getByTestId("demo-directions").innerText()).not.toBe(first);
    await expect(page.getByTestId("scenario-b")).toHaveAttribute("aria-checked", "true");
    // Illustrative only: no percentage or score anywhere in it.
    const text = await demo.innerText();
    expect(text).not.toMatch(/\d+\s?%/);
    expect(text).not.toMatch(/\b\d{2,3}\s*\/\s*100\b/);
  });

  test("How Solventia Works has five steps and lights them up as the page scrolls", async ({
    page,
  }) => {
    await gotoApp(page, "/");
    const steps = page.getByTestId("how-it-works-steps");
    await expect(steps.locator("[data-testid^=how-step-]")).toHaveCount(5);
    for (const [n, word] of [
      [1, "Understand"],
      [2, "Discover"],
      [3, "Validate"],
      [4, "Execute"],
      [5, "Adapt"],
    ] as const)
      await expect(page.getByTestId(`how-step-${n}`)).toContainText(word);
    // Scrolling the section through the viewport advances the current step.
    await steps.scrollIntoViewIfNeeded();
    await page.mouse.wheel(0, 700);
    await expect
      .poll(async () => Number(await steps.getAttribute("data-active")), { timeout: 8_000 })
      .toBeGreaterThanOrEqual(2);
  });

  test("the Opportunity demonstration brings one direction into focus and switches smoothly", async ({
    page,
  }) => {
    await gotoApp(page, "/");
    const demo = page.getByTestId("opportunity-demo");
    await demo.scrollIntoViewIfNeeded();
    await page.getByTestId("opp-option-b").click();
    await expect(demo).toHaveAttribute("data-focus", "b");
    await expect(page.getByTestId("opp-option-b")).toHaveAttribute("aria-checked", "true");
    await expect(page.getByTestId("opp-focus-panel")).toContainText("Independent clinic owners");
    await expect(page.getByTestId("opp-focus-panel")).toContainText("Founder fit");
    expect(await demo.innerText()).not.toMatch(/\d+\s?%/);
  });

  test("the Proof demonstration moves an assumption to Supported and another to Contradicted", async ({
    page,
  }) => {
    await gotoApp(page, "/");
    const demo = page.getByTestId("proof-demo");
    await demo.scrollIntoViewIfNeeded();
    await expect(page.getByTestId("proof-node-problem")).toHaveAttribute(
      "data-state",
      "supported",
      { timeout: 15_000 },
    );
    await expect(page.getByTestId("proof-node-payment")).toHaveAttribute(
      "data-state",
      "contradicted",
      { timeout: 15_000 },
    );
    expect(await demo.innerText()).not.toMatch(/\d+\s?%/);
  });

  test("the Ask Sol demonstration answers from context, and degrades to generic advice without it", async ({
    page,
  }) => {
    await gotoApp(page, "/");
    await page.getByTestId("asksol-demo").scrollIntoViewIfNeeded();
    const answer = page.getByTestId("asksol-answer");
    await expect(answer).toContainText("clinic owners", { timeout: 8_000 });
    await expect(answer).toHaveAttribute("data-context", "full");
    await page.getByTestId("asksol-chip-interviews").click();
    await expect(answer).toHaveAttribute("data-context", "partial");
    await expect(answer).toContainText("common themes", { timeout: 8_000 });
    await page.getByTestId("asksol-chip-interviews").click();
    await expect(answer).toContainText("clinic owners", { timeout: 8_000 });
  });

  test("the story is connected: a labelled connector sits between each pair of demonstrations", async ({
    page,
  }) => {
    await gotoApp(page, "/");
    await expect(page.getByTestId("story-connector")).toHaveCount(5);
    await expect(page.getByTestId("story-connector").first()).toContainText(
      "Signals become opportunities",
    );
  });

  test("the Adaptive Roadmap demonstration plays through to Week 02 unlocking, and never shows a percentage", async ({
    page,
  }) => {
    await gotoApp(page, "/");
    await page.getByTestId("adaptive-demo").scrollIntoViewIfNeeded();
    await expect(page.getByTestId("demo-week2")).toHaveAttribute("data-unlocked", "true", {
      timeout: 15_000,
    });
    const text = await page.getByTestId("adaptive-demo").innerText();
    expect(text).toContain("PRODUCT DEMONSTRATION");
    expect(text).not.toMatch(/\d+\s?%/);
  });

  test("the comparison lists what a chatbot lacks and what Solventia keeps, four each", async ({
    page,
  }) => {
    await gotoApp(page, "/");
    const cmp = page.getByTestId("why-comparison");
    await expect(cmp.locator("li")).toHaveCount(8);
  });

  test("the FAQ has five questions that open and close", async ({ page }) => {
    await gotoApp(page, "/");
    const faq = page.locator("#faq");
    await expect(faq.getByRole("button")).toHaveCount(5);
    const first = faq.getByRole("button").first();
    await first.click();
    await expect(first).toHaveAttribute("aria-expanded", "true");
    await first.click();
    await expect(first).toHaveAttribute("aria-expanded", "false");
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
