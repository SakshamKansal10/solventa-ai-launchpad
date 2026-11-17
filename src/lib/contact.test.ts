import fs from "node:fs";
import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { CONTACT_EMAIL, EMAIL_FROM, EMAIL_REPLY_TO } from "@/lib/contact";

/**
 * One address everywhere (owner, 2026-11-17: mail to sol@solventia.in is forwarded, so it is also
 * every email's reply-to). The site, the legal pages and every email show only sol@solventia.in.
 */
const sent = vi.hoisted(() => [] as Record<string, unknown>[]);
vi.mock("resend", () => ({
  Resend: class {
    emails = {
      send: async (msg: Record<string, unknown>) => {
        sent.push(msg);
        return { data: { id: "test" }, error: null };
      },
    };
  },
}));
vi.mock("@/lib/env.server", () => ({
  env: { RESEND_API_KEY: "re_test", SITE_URL: "https://solventia.in" },
}));

describe("the one address", () => {
  it("is sol@solventia.in, for the sender and for replies", () => {
    expect(CONTACT_EMAIL).toBe("sol@solventia.in");
    expect(EMAIL_FROM).toBe("Solventia <sol@solventia.in>");
    expect(EMAIL_REPLY_TO).toBe("sol@solventia.in");
  });

  beforeEach(() => {
    sent.length = 0;
  });

  it("every app email goes from and replies to sol@solventia.in", async () => {
    const m = await import("@/lib/actions/email.server");
    await m.sendWelcomeEmail("founder@example.test", "Asha");
    await m.sendWelcomeEmail("founder@example.test", "Asha", "hi");
    expect(sent).toHaveLength(2);
    for (const msg of sent) {
      expect(msg.from).toBe("Solventia <sol@solventia.in>");
      expect(msg.replyTo).toBe("sol@solventia.in");
      expect(JSON.stringify(msg)).not.toMatch(/gmail\.com/i);
    }
  });

  it("no other address appears in the site, the legal pages or the email templates", () => {
    const root = path.resolve(__dirname, "../..");
    const dirs = ["src", "public", "supabase/email-templates", "docs/redesign/email/supabase"];
    const files: string[] = [];
    const walk = (d: string) => {
      if (!fs.existsSync(d)) return;
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.(tsx?|html|txt|json|xml|md)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name))
          files.push(p);
      }
    };
    for (const d of dirs) walk(path.join(root, d));
    expect(files.length).toBeGreaterThan(50);
    const found = new Map<string, string>();
    for (const f of files) {
      const text = fs.readFileSync(f, "utf8");
      for (const [a] of text.matchAll(
        /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[a-z]{2,}/g,
      ))
        // Placeholders in the email fields ("you@example.com") are not addresses.
        if (a !== "sol@solventia.in" && !/@example\.(com|test)$/.test(a))
          found.set(a, path.relative(root, f));
    }
    expect(Object.fromEntries(found)).toEqual({});
  });
});
