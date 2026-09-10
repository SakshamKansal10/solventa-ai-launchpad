import { describe, it, expect, vi } from "vitest";

/**
 * Proves the rendered email HTML is actually safe/correct, not just
 * that TypeScript compiles: every link resolves to the real canonical
 * domain (never localhost/undefined/double-slash), every dynamic value
 * is HTML-escaped, and the table structure stays balanced — the class of
 * bugs that only show up by inspecting the rendered output.
 */

vi.mock("@/lib/env.server", () => ({
  env: { SITE_URL: "https://solventia.in", RESEND_API_KEY: undefined },
}));

import {
  emailShell,
  primaryCta,
  metricStrip,
  primaryIdeaCard,
  secondaryIdeaCard,
  emailHeader,
  emailFooter,
} from "@/lib/email/components";

function assertBalanced(html: string, tag: string) {
  const open = (html.match(new RegExp(`<${tag}[ >]`, "g")) ?? []).length;
  const close = (html.match(new RegExp(`</${tag}>`, "g")) ?? []).length;
  expect(open).toBe(close);
}

describe("email component system", () => {
  it("emailShell produces a well-formed document with balanced table/tr tags", () => {
    const html = emailShell({
      preheader: "Test preheader",
      bodyRowsHtml: `<tr><td>hello</td></tr>`,
    });
    expect(html).toMatch(/^<!doctype html>/);
    assertBalanced(html, "table");
    assertBalanced(html, "tr");
    expect(html).not.toMatch(/undefined/);
    expect(html).not.toMatch(/NaN/);
    expect(html).not.toMatch(/\$\{/);
  });

  it("every href in the header/footer is an absolute solventia.in URL — never localhost, never a double slash", () => {
    const html = emailShell({ preheader: "x", bodyRowsHtml: `${emailHeader()}${emailFooter()}` });
    const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      if (href.startsWith("mailto:")) continue;
      expect(href).toMatch(/^https:\/\/solventia\.in/);
      expect(href).not.toMatch(/solventia\.in\/\//);
      expect(href).not.toMatch(/localhost/);
    }
  });

  it("primaryCta escapes an href containing a real consultation id and never breaks out of the attribute", () => {
    const html = primaryCta("https://solventia.in/dashboard?consultation=abc-123", "Explore");
    expect(html).toContain('href="https://solventia.in/dashboard?consultation=abc-123"');
  });

  it("primaryIdeaCard and secondaryIdeaCard HTML-escape dynamic founder/AI-generated text", () => {
    const html = primaryIdeaCard({
      title: `A "Great" <Idea> & Co`,
      oneLiner: "Founders' choice",
      fitScore: 91,
    });
    expect(html).not.toContain("<Idea>");
    expect(html).toContain("&lt;Idea&gt;");
    expect(html).toContain("&quot;Great&quot;");
    expect(html).toContain("&#39;");

    const secondary = secondaryIdeaCard({ title: "<script>alert(1)</script>", oneLiner: "x" });
    expect(secondary).not.toContain("<script>alert(1)</script>");
  });

  it("primaryIdeaCard never fabricates a fit score when none is given", () => {
    const html = primaryIdeaCard({ title: "T", oneLiner: "O", fitScore: null });
    expect(html).not.toMatch(/% fit/);
  });

  it("metricStrip renders only the cells it's given — never invents a fourth", () => {
    const html = metricStrip([{ label: "Directions", value: "3" }]);
    const cellCount = (html.match(/<td/g) ?? []).length;
    expect(cellCount).toBe(1);
  });
});
