import { siteUrl } from "@/lib/actions/site-url.server";
import { firstNameOf, renderEmail, type EmailLocale } from "@/lib/email/layout";

/**
 * Every email the app sends, in English and simple spoken Hindi, all in the ONE layout
 * (layout.ts). The ideas-ready and weekly-reminder copy is the approved kit's
 * (solventia-email-kit/email-kit/app/*.html); welcome and roadmap-ready follow its pattern.
 * Every button is a plain deep link to the exact page — never a login token.
 */
export interface BuiltEmail {
  subject: string;
  html: string;
  text: string;
}

const named = (first: string | null, withName: string, without: string) =>
  first ? withName.replace("{name}", first) : without;

/** After the account is created at the end of the consultation (directions on their way). */
export function welcomeEmail(input: { fullName: string | null; locale: EmailLocale }): BuiltEmail {
  const first = firstNameOf(input.fullName);
  const href = siteUrl("/dashboard");
  if (input.locale === "hi") {
    const r = renderEmail({
      locale: "hi",
      title: "Solventia में आपका स्वागत है",
      preheader: "आपके जवाब सेव हैं। अब हम आपकी तीन बिज़नेस दिशाएँ ढूँढ रहे हैं।",
      eyebrow: "स्वागत है",
      headline: named(
        first,
        "{name}, Solventia में आपका स्वागत है",
        "Solventia में आपका स्वागत है",
      ),
      paragraphs: [
        "आपका अकाउंट बन गया है और आपके जवाब सेव हैं। अब हम वो तीन बिज़नेस दिशाएँ ढूँढ रहे हैं जो आपकी स्किल, समय और पैसे के हिसाब से ठीक बैठती हैं।",
      ],
      button: { href, label: "Solventia खोलें" },
      note: "दिशाएँ तैयार होते ही हम आपको ईमेल करेंगे।",
      reason: "यह ईमेल इसलिए आया क्योंकि आपने Solventia पर अकाउंट बनाया।",
    });
    return { subject: "Solventia में आपका स्वागत है", ...r };
  }
  const r = renderEmail({
    locale: "en",
    title: "Welcome to Solventia",
    preheader: "Your answers are saved. We are finding your three business directions now.",
    eyebrow: "Welcome",
    headline: named(first, "{name}, welcome to Solventia", "Welcome to Solventia"),
    paragraphs: [
      "Your account is ready and your answers are saved. We are now finding the three business directions that fit your skills, your time and your money.",
    ],
    button: { href, label: "Open Solventia" },
    note: "We will email you as soon as they are ready.",
    reason: "You got this email because you created a Solventia account.",
  });
  return { subject: "Welcome to Solventia", ...r };
}

/** The three directions are ready (kit: app/ideas-ready.html). */
export function ideasReadyEmail(input: {
  fullName: string | null;
  locale: EmailLocale;
  businessDnaId: string;
  directions: { title: string; oneLiner: string }[];
}): BuiltEmail {
  const first = firstNameOf(input.fullName);
  // The page that shows the three directions (in any state), pinned to this consultation.
  const href = siteUrl(
    `/dashboard/opportunities?consultation=${encodeURIComponent(input.businessDnaId)}`,
  );
  const list = input.directions.slice(0, 3).map((d) => ({ title: d.title, line: d.oneLiner }));
  if (input.locale === "hi") {
    const r = renderEmail({
      locale: "hi",
      title: "आपकी तीन दिशाएँ तैयार हैं",
      preheader: "आपकी स्किल, समय और पैसे के हिसाब से तीन दिशाएँ। देखिए हर एक क्यों ठीक बैठती है।",
      eyebrow: "आपकी दिशाएँ",
      headline: named(first, "{name}, आपकी तीन दिशाएँ तैयार हैं", "आपकी तीन दिशाएँ तैयार हैं"),
      paragraphs: [
        "हमने आपके जवाब पढ़े और तीन बिज़नेस दिशाएँ चुनीं जो आपकी स्किल, आपके समय और आपके पैसे के हिसाब से ठीक बैठती हैं।",
      ],
      list,
      button: { href, label: "मेरी तीन दिशाएँ देखें" },
      note: "हर दिशा में लिखा है कि वो आपके लिए क्यों ठीक है, शुरू करने में कितना खर्च होगा, और पहला कदम क्या है।",
      reason: "यह ईमेल इसलिए आया क्योंकि आपने Solventia का कंसल्टेशन पूरा किया।",
    });
    return {
      subject: named(
        first,
        "{name}, आपकी तीन बिज़नेस दिशाएँ तैयार हैं",
        "आपकी तीन बिज़नेस दिशाएँ तैयार हैं",
      ),
      ...r,
    };
  }
  const r = renderEmail({
    locale: "en",
    title: "Your three directions are ready",
    preheader: "Three directions chosen for your skills, time and money. See why each one fits.",
    eyebrow: "Your directions",
    headline: named(
      first,
      "{name}, your three directions are ready",
      "Your three directions are ready",
    ),
    paragraphs: [
      "We read your answers and chose three business directions that fit your skills, your time and your money.",
    ],
    list,
    button: { href, label: "See my three directions" },
    note: "Each one shows why it fits you, what it costs to start, and the first step.",
    reason: "You got this email because you finished the Solventia consultation.",
  });
  return {
    subject: named(
      first,
      "{name}, your three business directions are ready",
      "Your three business directions are ready",
    ),
    ...r,
  };
}

/** The roadmap is built (the kit's layout; week 1 in the panel). */
export function roadmapReadyEmail(input: {
  fullName: string | null;
  locale: EmailLocale;
  opportunityTitle: string;
  week1Title: string;
  week1Objective: string;
  missionCount: number | null;
}): BuiltEmail {
  const first = firstNameOf(input.fullName);
  const href = siteUrl("/dashboard/roadmap");
  const n = input.missionCount;
  if (input.locale === "hi") {
    const r = renderEmail({
      locale: "hi",
      title: "आपका रोडमैप तैयार है",
      preheader: `${input.opportunityTitle} का आपका प्लान, हफ़्ते-दर-हफ़्ते।`,
      eyebrow: "आपका रोडमैप",
      headline: named(first, "{name}, आपका रोडमैप तैयार है", "आपका रोडमैप तैयार है"),
      paragraphs: [
        `${input.opportunityTitle} का आपका प्लान हफ़्ते-दर-हफ़्ते तैयार है। हफ़्ता 1 छोटे कामों से शुरू होता है जो आप इसी हफ़्ते कर सकते हैं।`,
      ],
      panel: {
        eyebrow: `हफ़्ता 1 · ${input.week1Title}`,
        title: input.week1Objective,
        meta: n ? `इस हफ़्ते ${n} काम` : undefined,
      },
      button: { href, label: "हफ़्ता 1 शुरू करें" },
      note: "कहीं अटक गए? स्टेप खोलिए और Sol से पूछिए। उसे आपका प्लान पता है।",
      reason: "यह ईमेल इसलिए आया क्योंकि आपने Solventia पर रोडमैप बनाया।",
    });
    return { subject: `${input.opportunityTitle}: आपका रोडमैप तैयार है`, ...r };
  }
  const r = renderEmail({
    locale: "en",
    title: "Your roadmap is ready",
    preheader: `Your plan for ${input.opportunityTitle}, week by week.`,
    eyebrow: "Your roadmap",
    headline: named(first, "{name}, your roadmap is ready", "Your roadmap is ready"),
    paragraphs: [
      `Your plan for ${input.opportunityTitle} is ready, week by week. Week 1 starts with small steps you can do this week.`,
    ],
    panel: {
      eyebrow: `Week 1 · ${input.week1Title}`,
      title: input.week1Objective,
      meta: n ? `${n} ${n === 1 ? "task" : "tasks"} this week` : undefined,
    },
    button: { href, label: "Start week 1" },
    note: "Stuck? Open the step and ask Sol. It knows your plan.",
    reason: "You got this email because you built a roadmap on Solventia.",
  });
  return { subject: `${input.opportunityTitle}: your roadmap is ready`, ...r };
}

/** The weekly reminder (kit: app/weekly-reminder.html and .hi.html). */
export function weeklyReminderEmail(input: {
  fullName: string | null;
  locale: EmailLocale;
  weekNumber: number;
  weekTitle: string | null;
  missionTitle: string;
  timeEstimate: string | null;
  tasksLeft: number;
}): BuiltEmail {
  const first = firstNameOf(input.fullName);
  const href = siteUrl("/dashboard/roadmap");
  const changeRemindersUrl = siteUrl("/dashboard/settings#reminders");
  const w = input.weekNumber;
  if (input.locale === "hi") {
    const meta = [
      input.timeEstimate ? `लगभग ${input.timeEstimate}` : null,
      `इस हफ़्ते ${input.tasksLeft} काम बाकी`,
    ]
      .filter(Boolean)
      .join("  ·  ");
    const r = renderEmail({
      locale: "hi",
      title: "इस हफ़्ते का काम",
      preheader: input.timeEstimate
        ? `इस हफ़्ते बस एक स्टेप। लगभग ${input.timeEstimate} लगेंगे।`
        : "इस हफ़्ते बस एक स्टेप।",
      eyebrow: "इस हफ़्ते",
      headline: named(first, "{name}, इस हफ़्ते बस एक स्टेप", "इस हफ़्ते बस एक स्टेप"),
      paragraphs: ["आपके रोडमैप का अगला स्टेप तैयार है। यह एक काम कर लीजिए, आप सही रास्ते पर हैं।"],
      panel: {
        eyebrow: input.weekTitle ? `हफ़्ता ${w} · ${input.weekTitle}` : `हफ़्ता ${w}`,
        title: input.missionTitle,
        meta,
      },
      button: { href, label: "मेरा रोडमैप खोलें" },
      note: "कहीं अटक गए? स्टेप खोलिए और Sol से पूछिए। उसे आपका प्लान पता है।",
      reason: "यह ईमेल इसलिए आया क्योंकि आपके Solventia अकाउंट में हफ़्ते के रिमाइंडर चालू हैं।",
      changeRemindersUrl,
    });
    return { subject: `हफ़्ता ${w}: ${input.missionTitle}`, ...r };
  }
  const meta = [
    input.timeEstimate ? `About ${input.timeEstimate}` : null,
    `${input.tasksLeft} ${input.tasksLeft === 1 ? "task" : "tasks"} left this week`,
  ]
    .filter(Boolean)
    .join("  ·  ");
  const r = renderEmail({
    locale: "en",
    title: "This week on your roadmap",
    preheader: input.timeEstimate
      ? `One step this week. It takes about ${input.timeEstimate}.`
      : "One step this week.",
    eyebrow: "This week",
    headline: named(first, "{name}, one step this week", "One step this week"),
    paragraphs: ["The next step on your roadmap is ready. Do this one thing and you’re on track."],
    panel: {
      eyebrow: input.weekTitle ? `Week ${w} · ${input.weekTitle}` : `Week ${w}`,
      title: input.missionTitle,
      meta,
    },
    button: { href, label: "Open my roadmap" },
    note: "Stuck? Open the step and ask Sol. It knows your plan.",
    reason: "You got this email because weekly reminders are on in your Solventia account.",
    changeRemindersUrl,
  });
  return { subject: `Week ${w}: ${input.missionTitle}`, ...r };
}
