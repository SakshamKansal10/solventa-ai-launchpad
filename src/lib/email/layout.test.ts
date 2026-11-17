import { describe, expect, it, vi } from "vitest";

// env.server.ts validates real secrets at import time; the layout only needs SITE_URL.
vi.mock("@/lib/env.server", () => ({
  env: { SITE_URL: "https://solventia.in", RESEND_API_KEY: undefined },
}));

import { renderEmail } from "@/lib/email/layout";
import {
  ideasReadyEmail,
  roadmapReadyEmail,
  weeklyReminderEmail,
  welcomeEmail,
} from "@/lib/email/messages";

const ALL = [
  ...(["en", "hi"] as const).flatMap((locale) => [
    welcomeEmail({ fullName: "Saksham Kansal", locale }),
    ideasReadyEmail({
      fullName: "Saksham Kansal",
      locale,
      businessDnaId: "dna-123",
      directions: [
        { title: "Tiffin service", oneLiner: "Home-cooked lunch for offices nearby." },
        { title: "Tuition centre", oneLiner: "Evening classes for class 9 and 10." },
        { title: "Phone repair", oneLiner: "Screen and battery fixes at your shop." },
      ],
    }),
    roadmapReadyEmail({
      fullName: null,
      locale,
      opportunityTitle: "Tiffin service",
      week1Title: "Talk to customers",
      week1Objective: "Ask 10 office workers what they eat for lunch.",
      missionCount: 3,
    }),
    weeklyReminderEmail({
      fullName: "Saksham Kansal",
      locale,
      weekNumber: 2,
      weekTitle: "First orders",
      missionTitle: "Take 5 trial orders",
      timeEstimate: "2 hours",
      tasksLeft: 3,
    }),
  ]),
];

describe("the one email layout (Job E)", () => {
  it.each(ALL.map((m, i) => [i, m] as const))(
    "email %i: logo, one button, footer, text part",
    (_, m) => {
      // The logo: the PNG at its absolute URL — never SVG, never base64.
      expect(m.html).toContain('src="https://solventia.in/brand/email-logo.png"');
      expect(m.html).not.toMatch(/\.svg|data:image/);
      expect(m.html).toContain('alt="Solventia"');
      // ONE button.
      expect(m.html.match(/data-email-button/g)).toHaveLength(1);
      // The footer's address, as a mailto.
      expect(m.html).toContain('href="mailto:sol@solventia.in"');
      expect(m.html).not.toContain("gmail.com");
      // The kit's structure: 600px card, mobile + dark-mode rules, hidden preheader.
      expect(m.html).toContain('width="600"');
      expect(m.html).toContain("@media only screen and (max-width:620px)");
      expect(m.html).toContain("@media (prefers-color-scheme: dark)");
      expect(m.html).toContain("display:none;max-height:0");
      // A plain-text part with the button's link and the address.
      expect(m.text.length).toBeGreaterThan(80);
      expect(m.text).toContain("https://solventia.in/");
      expect(m.text).toContain("sol@solventia.in");
      expect(m.text).not.toMatch(/<[a-z]/i);
      // A clear subject.
      expect(m.subject.length).toBeGreaterThan(8);
      // Every link is absolute and never the homepage.
      const hrefs = [...m.html.matchAll(/href="([^"]+)"/g)].map((x) => x[1]);
      for (const h of hrefs) {
        expect(h).toMatch(/^(https:\/\/solventia\.in\/|mailto:)/);
        expect(h).not.toBe("https://solventia.in/");
      }
    },
  );

  it("deep links: the directions page for ideas, the roadmap and Change reminders for reminders", () => {
    const [, ideas, , reminder] = ALL;
    expect(ideas.html).toContain(
      'href="https://solventia.in/dashboard/opportunities?consultation=dna-123"',
    );
    expect(ideas.subject).toBe("Saksham, your three business directions are ready");
    expect(reminder.html).toContain('href="https://solventia.in/dashboard/roadmap"');
    expect(reminder.html).toContain("https://solventia.in/dashboard/settings#reminders");
    expect(reminder.html).toContain("Change reminders");
    expect(reminder.subject).toBe("Week 2: Take 5 trial orders");
  });

  it("Hindi: the kit's words and the Hindi footer", () => {
    const hiReminder = ALL[7];
    expect(hiReminder.subject).toBe("हफ़्ता 2: Take 5 trial orders");
    expect(hiReminder.html).toContain('lang="hi"');
    expect(hiReminder.html).toContain("इस हफ़्ते बस एक स्टेप");
    expect(hiReminder.html).toContain("रिमाइंडर बदलें");
    expect(hiReminder.html).toContain("कोई सवाल?");
  });

  it("escapes what founders and the AI wrote", () => {
    const m = renderEmail({
      locale: "en",
      title: "t",
      preheader: "p",
      eyebrow: "e",
      headline: "<script>alert(1)</script>",
      paragraphs: ['"quoted" & <b>bold</b>'],
      button: { href: "https://solventia.in/dashboard?a=1&b=2", label: "Go" },
      reason: "r",
    });
    expect(m.html).not.toContain("<script>alert");
    expect(m.html).toContain("&lt;b&gt;bold&lt;/b&gt;");
    expect(m.html).toContain("https://solventia.in/dashboard?a=1&amp;b=2");
  });
});
