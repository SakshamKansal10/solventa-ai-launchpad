/**
 * Job E check (owner, 2026-11-16): renders every app email (English and Hindi) with the real
 * builders (src/lib/email/messages.ts), saves each to docs/redesign/email/rendered/, and — with
 * --send <address> — sends each one through Resend, the same way production does.
 *
 *   SITE_URL=https://solventia.in npx tsx --env-file=.env.local scripts/send-test-emails.ts \
 *     [--send you@example.com]
 */
import fs from "node:fs";
import path from "node:path";

import { Resend } from "resend";

import {
  ideasReadyEmail,
  roadmapReadyEmail,
  weeklyReminderEmail,
  welcomeEmail,
  type BuiltEmail,
} from "../src/lib/email/messages";

const sendTo = process.argv.includes("--send")
  ? process.argv[process.argv.indexOf("--send") + 1]
  : null;
const out = path.resolve("docs/redesign/email/rendered");
fs.mkdirSync(out, { recursive: true });

const emails: [string, BuiltEmail][] = (["en", "hi"] as const).flatMap((locale) => [
  [`welcome.${locale}`, welcomeEmail({ fullName: "Saksham Kansal", locale })],
  [
    `ideas-ready.${locale}`,
    ideasReadyEmail({
      fullName: "Saksham Kansal",
      locale,
      businessDnaId: "00000000-0000-0000-0000-000000000000",
      directions:
        locale === "hi"
          ? [
              { title: "घर का बना टिफ़िन", oneLiner: "पास के दफ़्तरों में दोपहर का खाना।" },
              { title: "शाम की ट्यूशन", oneLiner: "क्लास 9 और 10 के बच्चों के लिए।" },
              { title: "मोबाइल रिपेयर", oneLiner: "स्क्रीन और बैटरी बदलने का काम।" },
            ]
          : [
              { title: "Home-cooked tiffin service", oneLiner: "Lunch for offices near you." },
              { title: "Evening tuition centre", oneLiner: "Classes for class 9 and 10." },
              { title: "Phone repair counter", oneLiner: "Screen and battery fixes." },
            ],
    }),
  ],
  [
    `roadmap-ready.${locale}`,
    roadmapReadyEmail({
      fullName: "Saksham Kansal",
      locale,
      opportunityTitle: locale === "hi" ? "घर का बना टिफ़िन" : "Home-cooked tiffin service",
      week1Title: locale === "hi" ? "ग्राहकों से बात" : "Talk to customers",
      week1Objective:
        locale === "hi"
          ? "10 दफ़्तर वालों से पूछिए कि वो दोपहर में क्या खाते हैं।"
          : "Ask 10 office workers what they eat for lunch.",
      missionCount: 3,
    }),
  ],
  [
    `weekly-reminder.${locale}`,
    weeklyReminderEmail({
      fullName: "Saksham Kansal",
      locale,
      weekNumber: 2,
      weekTitle: locale === "hi" ? "पहले ऑर्डर" : "First orders",
      missionTitle: locale === "hi" ? "5 ट्रायल ऑर्डर लीजिए" : "Take 5 trial orders",
      timeEstimate: locale === "hi" ? "2 घंटे" : "2 hours",
      tasksLeft: 3,
    }),
  ],
]);

const resend = sendTo ? new Resend(process.env.RESEND_API_KEY) : null;
for (const [name, m] of emails) {
  fs.writeFileSync(path.join(out, `${name}.html`), m.html);
  fs.writeFileSync(path.join(out, `${name}.txt`), `Subject: ${m.subject}\n\n${m.text}\n`);
  if (!resend || !sendTo) {
    console.log(`rendered ${name}: ${m.subject}`);
    continue;
  }
  const { data, error } = await resend.emails.send({
    from: "Solventia <sol@solventia.in>",
    replyTo: "solventia.in@gmail.com",
    to: sendTo,
    subject: `[Test] ${m.subject}`,
    html: m.html,
    text: m.text,
  });
  console.log(
    error ? `FAILED ${name}: ${JSON.stringify(error)}` : `sent ${name} (${data?.id}): ${m.subject}`,
  );
}
