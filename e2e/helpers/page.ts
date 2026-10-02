import type { Page } from "@playwright/test";

/**
 * `page.goto` resolves when the document has loaded, which is BEFORE React has
 * hydrated it: a click in that window lands on server-rendered markup with no
 * handlers and is silently lost. Waiting for React's own bookkeeping on a real
 * control removes that whole class of flaky test.
 */
export async function waitHydrated(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const controls = Array.from(document.querySelectorAll("button, a"));
    return controls.some((el) => Object.keys(el).some((k) => k.startsWith("__reactProps$")));
  });
}

export async function gotoApp(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await waitHydrated(page);
}
