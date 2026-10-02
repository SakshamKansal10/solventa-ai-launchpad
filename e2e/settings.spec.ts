import { expect, test } from "@playwright/test";
import { gotoApp } from "./helpers/page";

import { pickCombo } from "./helpers/consultation";
import { FIXTURE_PROFILE_ANSWERS } from "../src/lib/ai/fixtures/intelligence-package.fixture";
import { seedDirections } from "./helpers/seed";
import { createUser, forbidRealBackends, gemini, resetStack, signIn, sql } from "./helpers/stack";

test.beforeEach(async ({ page }) => {
  forbidRealBackends(page);
  await resetStack();
});

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

test.describe("Settings — profile and photo", () => {
  test("the name can be changed and shows everywhere; the email is read-only", async ({
    page,
    context,
  }) => {
    const user = await createUser({ fullName: "Asha Verma" });
    await signIn(context, user);
    await gotoApp(page, "/dashboard/settings");
    await expect(page.getByTestId("email-value")).toHaveText(user.email);
    await expect(page.getByTestId("save-name")).toBeDisabled();

    await page.getByTestId("name-input").fill("Asha Verma Kapoor");
    await expect(page.getByTestId("save-name")).toBeEnabled();
    await page.getByTestId("save-name").click();
    await expect(page.getByTestId("sidebar-account")).toContainText("Asha Verma Kapoor");
    const rows = await sql<{ full_name: string }>("select full_name from profiles where id = $1", [
      user.id,
    ]);
    expect(rows[0].full_name).toBe("Asha Verma Kapoor");
    await expect(page.getByTestId("save-name")).toBeDisabled();
  });

  test("an empty name cannot be saved", async ({ page, context }) => {
    const user = await createUser({ fullName: "Asha Verma" });
    await signIn(context, user);
    await gotoApp(page, "/dashboard/settings");
    await page.getByTestId("name-input").fill("   ");
    await expect(page.getByTestId("save-name")).toBeDisabled();
  });

  test("photo priority is custom upload, then Google photo, then initials — with safe fallbacks", async ({
    page,
    context,
  }) => {
    const user = await createUser({ fullName: "Asha Verma" });
    await sql(
      `update auth.users set raw_user_meta_data = raw_user_meta_data || $1::jsonb where id = $2`,
      [
        JSON.stringify({ avatar_url: `${process.env.E2E_FAKE_URL}/__assets/google-avatar.png` }),
        user.id,
      ],
    );
    // A session minted before the metadata change still resolves the user from the database.
    await signIn(context, user);
    await gotoApp(page, "/dashboard/settings");

    // 1) Google photo
    await expect(page.getByTestId("photo-source")).toHaveText("Using your Google photo");
    await expect(page.getByTestId("topbar-avatar").getByTestId("avatar")).toHaveAttribute(
      "data-source",
      "image",
    );

    // 2) Uploading a custom photo overrides it
    await page
      .getByTestId("photo-input")
      .setInputFiles({ name: "me.png", mimeType: "image/png", buffer: PNG });
    await expect(page.getByTestId("photo-source")).toHaveText("Your uploaded photo", {
      timeout: 30_000,
    });
    const objects = await sql<{ name: string; owner: string }>(
      "select name, owner::text as owner from storage.objects where bucket_id = 'avatars'",
    );
    expect(objects).toHaveLength(1);
    expect(objects[0].name.startsWith(`${user.id}/`)).toBe(true);
    expect(objects[0].owner).toBe(user.id);
    const profile = await sql<{ avatar_path: string }>(
      "select avatar_path from profiles where id = $1",
      [user.id],
    );
    expect(profile[0].avatar_path).toBe(objects[0].name);

    // 3) Removing it falls back to the Google photo, and the file is deleted
    await page.getByTestId("photo-remove").click();
    await expect(page.getByTestId("photo-source")).toHaveText("Using your Google photo", {
      timeout: 30_000,
    });
    expect(await sql("select 1 from storage.objects where bucket_id = 'avatars'")).toHaveLength(0);
  });

  test("with no Google photo the fallback is initials, and a broken image never shows a broken icon", async ({
    page,
    context,
  }) => {
    const user = await createUser({ fullName: "Asha Verma" });
    await signIn(context, user);
    await gotoApp(page, "/dashboard/settings");
    await expect(page.getByTestId("photo-source")).toHaveText("Showing your initials");
    await expect(page.getByTestId("topbar-avatar").getByTestId("avatar")).toContainText("AV");

    // A Google URL that fails to load falls back to initials instead of a broken image.
    await sql(
      `update auth.users set raw_user_meta_data = raw_user_meta_data || $1::jsonb where id = $2`,
      [JSON.stringify({ avatar_url: "http://127.0.0.1:9/blocked.png" }), user.id],
    );
    await page.reload();
    await expect(page.getByTestId("topbar-avatar").getByTestId("avatar")).toHaveAttribute(
      "data-source",
      "initials",
    );
    await expect(page.getByTestId("topbar-avatar").getByTestId("avatar")).toContainText("AV");
  });

  test("unsupported types and oversized files are refused with a clear message and nothing is uploaded", async ({
    page,
    context,
  }) => {
    const user = await createUser();
    await signIn(context, user);
    await gotoApp(page, "/dashboard/settings");

    await page
      .getByTestId("photo-input")
      .setInputFiles({ name: "x.gif", mimeType: "image/gif", buffer: PNG });
    await expect(page.getByTestId("photo-error")).toHaveText("Use a JPG, PNG or WEBP image.");

    await page.getByTestId("photo-input").setInputFiles({
      name: "big.png",
      mimeType: "image/png",
      buffer: Buffer.alloc(5 * 1024 * 1024 + 1),
    });
    await expect(page.getByTestId("photo-error")).toHaveText("That photo is larger than 5 MB.");
    expect(await sql("select 1 from storage.objects")).toHaveLength(0);
  });

  test("photos are owner-only: the storage policy refuses another founder's folder", async ({
    page,
    context,
  }) => {
    const user = await createUser();
    const stranger = await createUser();
    await signIn(context, user);
    await gotoApp(page, "/dashboard/settings");
    // Try to write into someone else's folder with this founder's own credentials.
    const outcome = await page.evaluate(
      async ({ url, strangerId }) => {
        const cookie = document.cookie.split("; ").find((c) => c.startsWith("sb-"))!;
        const encoded = decodeURIComponent(cookie.split("=").slice(1).join("=")).replace(
          /^base64-/,
          "",
        );
        const session = JSON.parse(atob(encoded.replace(/-/g, "+").replace(/_/g, "/")));
        const form = new FormData();
        form.append("", new Blob(["x"], { type: "image/png" }), "x.png");
        const res = await fetch(`${url}/storage/v1/object/avatars/${strangerId}/evil.png`, {
          method: "POST",
          headers: { authorization: `Bearer ${session.access_token}` },
          body: form,
        });
        return res.status;
      },
      { url: process.env.E2E_FAKE_URL!, strangerId: stranger.id },
    );
    expect(outcome).toBe(403);
  });
});

test.describe("Settings — founder profile", () => {
  test("rows summarise the profile; editing a section updates it in place without touching the directions", async ({
    page,
    context,
  }) => {
    const user = await createUser();
    await signIn(context, user);
    const seeded = await seedDirections(user.id);
    await gotoApp(page, "/dashboard/settings");

    await expect(page.getByTestId("founder-row-location")).toContainText("India");
    await expect(page.getByTestId("founder-row-location")).toContainText("Haryana");
    await expect(page.getByTestId("founder-row-time")).toContainText("10–20 hrs");
    await expect(page.getByTestId("profile-changed-banner")).toHaveCount(0);

    await page.getByTestId("edit-location").click();
    await expect(page.getByTestId("founder-edit-sheet")).toBeVisible();
    await pickCombo(page, "combo-state", "Maharashtra");
    await page.getByTestId("input-city").fill("Pune");
    await page.getByTestId("founder-edit-next").click();

    await expect(page.getByTestId("founder-row-location")).toContainText("Maharashtra", {
      timeout: 30_000,
    });
    await expect(page.getByTestId("profile-changed-banner")).toBeVisible();
    // The stored profile changed; the existing directions did not.
    const dna = await sql<{ onboarding_answers: { state: string; city: string } }>(
      "select onboarding_answers from business_dna where user_id = $1",
      [user.id],
    );
    expect(dna[0].onboarding_answers.state).toBe("Maharashtra");
    expect(dna[0].onboarding_answers.city).toBe("Pune");
    const opps = await sql<{ id: string }>("select id from opportunities where user_id = $1", [
      user.id,
    ]);
    expect(opps.map((o) => o.id).sort()).toEqual([...seeded.opportunityIds].sort());
    expect(await gemini.countOf("INITIAL_INTELLIGENCE")).toBe(0);
  });

  test("Re-analyze creates a NEW consultation from the edited profile and shows its directions", async ({
    page,
    context,
  }) => {
    const user = await createUser();
    await signIn(context, user);
    await seedDirections(user.id);
    await gotoApp(page, "/dashboard/settings");
    await page.getByTestId("edit-location").click();
    await pickCombo(page, "combo-state", "Maharashtra");
    await page.getByTestId("founder-edit-next").click();
    await expect(page.getByTestId("profile-changed-banner")).toBeVisible({ timeout: 30_000 });

    await page.getByTestId("reanalyze").click();
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 60_000 });
    await expect(page.locator("h1")).toHaveText("Your directions are ready");
    expect(await gemini.countOf("INITIAL_INTELLIGENCE")).toBe(1);
    const dna = await sql<{ n: string }>(
      "select count(*)::text as n from business_dna where user_id = $1",
      [user.id],
    );
    expect(Number(dna[0].n)).toBe(2);
    // Old directions are kept in history, never deleted.
    const opps = await sql<{ n: string }>(
      "select count(*)::text as n from opportunities where user_id = $1",
      [user.id],
    );
    expect(Number(opps[0].n)).toBe(6);
  });

  test("a profile saved before the new consultation is offered a pre-filled review instead of broken editors", async ({
    page,
    context,
  }) => {
    const user = await createUser();
    await signIn(context, user);
    await seedDirections(user.id, { answers: FIXTURE_PROFILE_ANSWERS });
    await gotoApp(page, "/dashboard/settings");
    await expect(page.getByTestId("legacy-profile")).toBeVisible();
    await expect(page.getByTestId("founder-rows")).toHaveCount(0);

    await page.getByRole("link", { name: "Review and update" }).click();
    await expect(page).toHaveURL(/\/consultation\?edit=true/);
    await expect(page.getByTestId("input-age")).toHaveValue("26");
  });

  test("with no consultation yet, the section says so and offers to start one", async ({
    page,
    context,
  }) => {
    const user = await createUser();
    await signIn(context, user);
    await gotoApp(page, "/dashboard/settings");
    await expect(page.getByTestId("founder-section")).toContainText(
      "You haven't completed a consultation yet.",
    );
    await expect(
      page.getByTestId("founder-section").getByRole("link", { name: "Start consultation" }),
    ).toBeVisible();
  });
});

test.describe("Settings — language, notifications, account", () => {
  test("the language choice switches the whole product and persists across reloads and to the profile", async ({
    page,
    context,
  }) => {
    const user = await createUser();
    await signIn(context, user);
    await gotoApp(page, "/dashboard/settings");
    await page.getByTestId("lang-hi").click();
    await expect(page.getByTestId("sidebar")).toContainText("कमांड सेंटर");
    await expect(page.locator("html")).toHaveAttribute("lang", "hi");
    await expect(page.getByTestId("sidebar")).toContainText("SOLVENTIA");

    await expect
      .poll(
        async () =>
          (
            await sql<{ locale: string | null }>("select locale from profiles where id = $1", [
              user.id,
            ])
          )[0].locale,
      )
      .toBe("hi");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "hi");
    await expect(page.getByTestId("sidebar")).toContainText("कमांड सेंटर");

    await page.getByTestId("lang-en").click();
    await expect(page.getByTestId("sidebar")).toContainText("Command Center");
  });

  test("notification preferences persist and are the only ones offered", async ({
    page,
    context,
  }) => {
    const user = await createUser();
    await signIn(context, user);
    await gotoApp(page, "/dashboard/settings");
    const toggle = page.getByTestId("pref-ideas_ready");
    await expect(toggle).toHaveAttribute("aria-checked", "true");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", "false");
    await expect
      .poll(
        async () =>
          (
            await sql<{ p: { ideas_ready: boolean } }>(
              "select notification_prefs as p from profiles where id = $1",
              [user.id],
            )
          )[0].p.ideas_ready,
      )
      .toBe(false);
    await page.reload();
    await expect(page.getByTestId("pref-ideas_ready")).toHaveAttribute("aria-checked", "false");
    await expect(page.getByTestId("notification-section").getByRole("switch")).toHaveCount(3);
  });

  test("account links exist and Sign out really ends the session", async ({ page, context }) => {
    const user = await createUser();
    await signIn(context, user);
    await gotoApp(page, "/dashboard/settings");
    const account = page.getByTestId("account-section");
    await expect(account.getByRole("link", { name: "Privacy policy" })).toBeVisible();
    await expect(account.getByRole("link", { name: "Terms of service" })).toBeVisible();
    await expect(account.getByRole("link", { name: "Delete my data" })).toBeVisible();

    await page.getByTestId("sign-out").click();
    await expect(page).toHaveURL(/localhost:\d+\/$/);
    await gotoApp(page, "/dashboard");
    await expect(page).not.toHaveURL(/\/dashboard$/);
  });
});
