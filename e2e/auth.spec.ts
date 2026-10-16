import { expect, test } from "@playwright/test";

import { cont, walkConsultation } from "./helpers/consultation";
import { gotoApp } from "./helpers/page";
import { createUser, forbidRealBackends, gemini, resetStack, signIn, sql } from "./helpers/stack";

test.beforeEach(async ({ page }) => {
  forbidRealBackends(page);
  await resetStack();
});

test.describe("sign in", () => {
  test("email and password from the homepage dialog lands on the dashboard — on localhost, not production", async ({
    page,
  }) => {
    const user = await createUser({ fullName: "Asha Verma" });
    await gotoApp(page, "/");
    await page.getByRole("button", { name: "Sign In" }).first().click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Email").fill(user.email);
    await dialog.getByLabel("Password").fill(user.password);
    await dialog.getByRole("button", { name: "Sign In", exact: true }).click();
    await expect(page).toHaveURL(/localhost:\d+\/dashboard$/, { timeout: 30_000 });
    await expect(page.getByTestId("sidebar-account")).toContainText("Asha Verma");
  });

  test("a wrong password shows a calm error and no session", async ({ page }) => {
    const user = await createUser();
    await gotoApp(page, "/");
    await page.getByRole("button", { name: "Sign In" }).first().click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Email").fill(user.email);
    await dialog.getByLabel("Password").fill("not-the-password");
    await dialog.getByRole("button", { name: "Sign In", exact: true }).click();
    await expect(dialog.getByRole("alert")).toHaveText("Invalid email or password.");
    await expect(page).toHaveURL(/localhost:\d+\/$/);
  });

  test("signing in with an emailed code works and returns to the same origin", async ({ page }) => {
    const user = await createUser();
    await gotoApp(page, "/sign-in");
    await page.getByLabel("Email").fill(user.email);
    await page.getByRole("button", { name: /Sign in with a code instead/ }).click();
    await page.getByLabel("Verification code").fill("123456");
    await page.getByRole("button", { name: /Verify/ }).click();
    await expect(page).toHaveURL(/localhost:\d+\/dashboard$/, { timeout: 30_000 });
  });

  test("a bad code is refused", async ({ page }) => {
    const user = await createUser();
    await gotoApp(page, "/sign-in");
    await page.getByLabel("Email").fill(user.email);
    await page.getByRole("button", { name: /Sign in with a code instead/ }).click();
    await page.getByLabel("Verification code").fill("000000");
    await page.getByRole("button", { name: /Verify/ }).click();
    await expect(page.getByRole("alert")).toHaveText("That code is incorrect or has expired.");
  });

  test("a signed-out visit to a deep link is bounced to sign-in and returns there afterwards", async ({
    page,
  }) => {
    const user = await createUser({ fullName: "Asha Verma" });
    await page.goto("/dashboard/settings");
    // The homepage opens sign-in itself and then tidies `?next=` out of the address bar.
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Email").fill(user.email);
    await dialog.getByLabel("Password").fill(user.password);
    await dialog.getByRole("button", { name: "Sign In", exact: true }).click();
    await expect(page).toHaveURL(/localhost:\d+\/dashboard\/settings$/, { timeout: 30_000 });
  });

  test("Google sign-in returns to localhost, shows the Google photo, and never leaves the origin", async ({
    page,
  }) => {
    await gotoApp(page, "/sign-in");
    await page.getByRole("button", { name: /Continue with Google/ }).click();
    await expect(page).toHaveURL(/localhost:\d+\/dashboard$/, { timeout: 45_000 });
    await expect(page.getByTestId("topbar-avatar").getByTestId("avatar")).toHaveAttribute(
      "data-source",
      "image",
    );
    const rows = await sql<{ email: string }>("select email from auth.users");
    expect(rows.map((r) => r.email)).toContain("google.tester@example.com");
  });

  test("the OAuth callback refuses to redirect off-site, whatever `next` says", async ({
    page,
  }) => {
    await gotoApp(page, "/sign-in");
    // Start Google sign-in, then rewrite the callback URL's `next` to an off-site target.
    await page.route("**/auth/callback**", async (route) => {
      const url = new URL(route.request().url());
      if (!url.searchParams.has("next")) {
        url.searchParams.set("next", "//evil.example/steal");
        await route.fulfill({ status: 302, headers: { location: url.toString() } });
      } else {
        await route.continue();
      }
    });
    await page.getByRole("button", { name: /Continue with Google/ }).click();
    await expect(page).toHaveURL(/localhost:\d+\/dashboard$/, { timeout: 45_000 });
  });

  test("provider error text in the callback URL is never shown to the founder", async ({
    page,
  }) => {
    await page.goto(
      "/auth/callback?error_description=Visit%20evil.example%20to%20fix%20your%20account",
    );
    await expect(page.getByText("evil.example")).toHaveCount(0);
    await expect(page.getByRole("alert")).toBeVisible();
  });
});

test.describe("first consultation as a guest", () => {
  test("completing the questions signed-out, then creating an account with a code, ends on ready directions", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    await gotoApp(page, "/consultation");
    await page.evaluate(() => window.localStorage.clear());
    await gotoApp(page, "/consultation");
    await walkConsultation(page);

    const gate = page.getByTestId("account-gate");
    await expect(gate).toBeVisible();
    await gate.getByLabel("Name (optional)").fill("Riya Sharma");
    await page.getByTestId("input-email").fill("riya@example.test");
    await page.getByTestId("gate-submit").click();
    await page.getByTestId("input-otp").fill("123456");
    await page.getByRole("button", { name: /Verify/ }).click();

    await expect(page).toHaveURL(/localhost:\d+\/dashboard$/, { timeout: 90_000 });
    await expect(page.locator("h1")).toHaveText("Your directions are ready", { timeout: 60_000 });
    expect(await gemini.countOf("INITIAL_INTELLIGENCE")).toBe(1);

    const rows = await sql<{ full_name: string; n: string }>(
      `select p.full_name, (select count(*)::text from opportunities o where o.user_id = p.id) as n
       from profiles p join auth.users u on u.id = p.id where u.email = 'riya@example.test'`,
    );
    expect(rows[0].full_name).toBe("Riya Sharma");
    expect(Number(rows[0].n)).toBe(3);
    // The finished answers are cleared locally so a new visit starts fresh.
    expect(
      await page.evaluate(() => window.localStorage.getItem("solventia-consultation-v2")),
    ).toBeNull();
  });

  test("submitting twice quickly never creates two consultations", async ({ page, context }) => {
    test.setTimeout(240_000);
    const user = await createUser({ fullName: "Asha Verma" });
    await signIn(context, user);
    await gotoApp(page, "/consultation");
    await page.evaluate(() => window.localStorage.clear());
    await gotoApp(page, "/consultation");
    await walkConsultation(page);
    const go = page.getByTestId("find-directions");
    await go.dblclick();
    await expect(page).toHaveURL(/localhost:\d+\/dashboard$/, { timeout: 90_000 });
    const rows = await sql<{ n: string }>(
      "select count(*)::text as n from business_dna where user_id = $1",
      [user.id],
    );
    expect(Number(rows[0].n)).toBe(1);
    expect(await gemini.countOf("INITIAL_INTELLIGENCE")).toBe(1);
  });

  test("a failed analysis keeps every answer and offers a retry", async ({ page, context }) => {
    test.setTimeout(240_000);
    const user = await createUser();
    await signIn(context, user);
    await gemini.failNext("INITIAL_INTELLIGENCE", 3);
    await gotoApp(page, "/consultation");
    await page.evaluate(() => window.localStorage.clear());
    await gotoApp(page, "/consultation");
    await walkConsultation(page);
    await page.getByTestId("find-directions").click();
    await expect(page.getByTestId("generate-error")).toBeVisible({ timeout: 90_000 });
    await gemini.clearBehavior();
    await page.getByRole("button", { name: /try again/i }).click();
    await expect(page).toHaveURL(/localhost:\d+\/dashboard$/, { timeout: 90_000 });
    const rows = await sql<{ n: string }>(
      "select count(*)::text as n from business_dna where user_id = $1",
      [user.id],
    );
    expect(Number(rows[0].n)).toBe(1);
  });
});

test.describe("consultation autosave for signed-in founders", () => {
  test("progress is saved on the server and resumes on the exact question in a fresh browser", async ({
    page,
    context,
    browser,
  }) => {
    const user = await createUser();
    await signIn(context, user);
    await gotoApp(page, "/consultation");
    await page.evaluate(() => window.localStorage.clear());
    await gotoApp(page, "/consultation");
    await page.getByTestId("input-age").fill("24");
    await page.getByTestId("opt-status-working_professional").click();
    await cont(page);
    await expect(page.getByTestId("screen-location")).toBeVisible();

    await expect
      .poll(
        async () =>
          (
            await sql<{ screen_key: string }>(
              "select screen_key from consultation_drafts where user_id = $1",
              [user.id],
            )
          )[0]?.screen_key,
      )
      .toBe("location");

    // A different device: no local storage at all.
    const other = await browser.newContext();
    await signIn(other, user);
    const otherPage = await other.newPage();
    await gotoApp(otherPage, "/consultation");
    await expect(otherPage.getByTestId("screen-location")).toBeVisible({ timeout: 30_000 });
    await otherPage.getByTestId("btn-back").click();
    await expect(otherPage.getByTestId("input-age")).toHaveValue("24");
    await other.close();
  });
});
