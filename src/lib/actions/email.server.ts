import { Resend } from "resend";
import { EMAIL_FROM, EMAIL_REPLY_TO } from "@/lib/contact";
import { env } from "@/lib/env.server";
import type { EmailLocale } from "@/lib/email/layout";
import {
  ideasReadyEmail,
  roadmapReadyEmail,
  weeklyReminderEmail,
  welcomeEmail,
  type BuiltEmail,
} from "@/lib/email/messages";

let client: Resend | null = null;

function getClient(): Resend | null {
  if (!env.RESEND_API_KEY) return null;
  if (!client) client = new Resend(env.RESEND_API_KEY);
  return client;
}

/** Every email send is best-effort. Resend being unconfigured or failing
 * must never break the core product flow it's attached to. Each email goes
 * with its plain-text part (layout.ts). */
async function sendSafely(to: string, email: BuiltEmail): Promise<void> {
  const resend = getClient();
  if (!resend) {
    console.warn("[email] Resend not configured — skipping email:", email.subject);
    return;
  }
  try {
    // Resend reports a refused send in its result, not by throwing.
    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      replyTo: EMAIL_REPLY_TO,
      to,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
    if (error) console.error("[email] send refused:", email.subject, error);
  } catch (err) {
    console.error("[email] send failed:", err);
  }
}

/** Right after the account is created at the end of the consultation. */
export async function sendWelcomeEmail(
  email: string,
  fullName: string | null,
  locale: EmailLocale = "en",
): Promise<void> {
  await sendSafely(email, welcomeEmail({ fullName, locale }));
}

export interface IdeasReadyEmailOpportunity {
  title: string;
  oneLiner: string;
}

export interface IdeasReadyEmailData {
  /** The exact business_dna row this consultation produced — the button
   * deep-links to `/dashboard/opportunities?consultation=<id>` so this email
   * always opens the ideas IT describes, never whatever consultation happens
   * to be latest by the time it's clicked. */
  businessDnaId: string;
  /** fitLabel: the canonical founder-fit label in English (e.g. "Moderate fit"). */
  primary: IdeasReadyEmailOpportunity & { fitLabel: string; weeklyTime: string | null };
  alternatives: IdeasReadyEmailOpportunity[];
  /** The founder's language (the consultation's). */
  locale?: EmailLocale;
}

/** Sent once, right after the initial consultation finishes — ideas
 * exist, a roadmap doesn't yet. */
export async function sendIdeasReadyEmail(
  email: string,
  fullName: string | null,
  data: IdeasReadyEmailData,
): Promise<void> {
  await sendSafely(
    email,
    ideasReadyEmail({
      fullName,
      locale: data.locale ?? "en",
      businessDnaId: data.businessDnaId,
      directions: [data.primary, ...data.alternatives],
    }),
  );
}

export interface RoadmapReadyEmailData {
  opportunityTitle: string;
  week1Title: string;
  week1Objective: string;
  /** Null when Week 1's detail hasn't finished generating yet at send
   * time — the roadmap page self-heals that case, and this email must
   * never claim a mission count that doesn't exist yet. */
  missionCount: number | null;
  weeklyTimeCommitment: string | null;
  /** The founder's saved language. */
  locale?: EmailLocale;
}

/** Sent once a founder's roadmap has actually been built. Deep-links to
 * /dashboard/roadmap — the single active roadmap a founder can have. */
export async function sendRoadmapReadyEmail(
  email: string,
  fullName: string | null,
  data: RoadmapReadyEmailData,
): Promise<void> {
  await sendSafely(
    email,
    roadmapReadyEmail({
      fullName,
      locale: data.locale ?? "en",
      opportunityTitle: data.opportunityTitle,
      week1Title: data.week1Title,
      week1Objective: data.week1Objective,
      missionCount: data.missionCount,
    }),
  );
}

/** The one weekly reminder (redesign-v2 part 4, feature 8): this week's next mission, in the
 * founder's language, with "Change reminders". */
export async function sendWeeklyReminderEmail(
  email: string,
  data: {
    fullName: string | null;
    locale: EmailLocale;
    weekNumber: number;
    weekTitle: string | null;
    missionTitle: string;
    timeEstimate: string | null;
    tasksLeft: number;
  },
): Promise<void> {
  await sendSafely(email, weeklyReminderEmail(data));
}
