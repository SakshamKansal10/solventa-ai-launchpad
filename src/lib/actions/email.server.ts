import { Resend } from "resend";
import { env } from "@/lib/env.server";
import { siteUrl } from "@/lib/actions/site-url.server";
import { escapeHtml, FONT_BODY, FONT_HEADING, EMAIL_COLORS } from "@/lib/email/brand";
import {
  emailShell,
  primaryCta,
  metricStrip,
  primaryIdeaCard,
  secondaryIdeaCard,
} from "@/lib/email/components";

let client: Resend | null = null;

function getClient(): Resend | null {
  if (!env.RESEND_API_KEY) return null;
  if (!client) client = new Resend(env.RESEND_API_KEY);
  return client;
}

// Displays as "Solventia" in every inbox — never a Resend/Supabase
// technical sender name.
const FROM = "Solventia <sol@solventia.in>";

/** Every email send is best-effort. Resend being unconfigured or failing
 * must never break the core product flow it's attached to. */
async function sendSafely(payload: { to: string; subject: string; html: string }): Promise<void> {
  const resend = getClient();
  if (!resend) {
    console.warn("[email] Resend not configured — skipping email:", payload.subject);
    return;
  }
  try {
    await resend.emails.send({ from: FROM, ...payload });
  } catch (err) {
    console.error("[email] send failed:", err);
  }
}

function greetingRow(fullName: string | null): string {
  const name = fullName ? escapeHtml(fullName.split(" ")[0]) : null;
  return `
<tr>
  <td style="padding:4px 40px 0 40px;">
    <div style="font-family:${FONT_HEADING}; font-size:22px; font-weight:700; color:${EMAIL_COLORS.textPrimary};">${name ? `Hi ${name},` : "Hi there,"}</div>
  </td>
</tr>`;
}

function bodyTextRow(text: string): string {
  return `
<tr>
  <td style="padding:10px 40px 0 40px;">
    <div style="font-family:${FONT_BODY}; font-size:15px; line-height:23px; color:${EMAIL_COLORS.secondary};">${text}</div>
  </td>
</tr>`;
}

export async function sendWelcomeEmail(email: string, fullName: string | null): Promise<void> {
  const name = fullName ? escapeHtml(fullName.split(" ")[0]) : "there";
  const consultationUrl = siteUrl("/consultation");
  const bodyRowsHtml = `
${greetingRow(fullName)}
${bodyTextRow(`Welcome to Solventia. Head back to your consultation with Sol whenever you're ready — everything you share stays saved to your account.`)}
<tr><td style="padding:22px 40px 4px 40px;">${primaryCta(consultationUrl, "Continue My Consultation")}</td></tr>
`;
  await sendSafely({
    to: email,
    subject: "Welcome to Solventia",
    html: emailShell({
      preheader: `Welcome, ${name} — your Solventia account is ready. Pick up your consultation with Sol whenever you're ready.`,
      bodyRowsHtml,
    }),
  });
}

export interface IdeasReadyEmailOpportunity {
  title: string;
  oneLiner: string;
}

export interface IdeasReadyEmailData {
  /** The exact business_dna row this consultation produced — the CTA
   * deep-links to `/dashboard?consultation=<id>` so this email always
   * opens the ideas IT describes, never whatever consultation happens to
   * be latest by the time it's clicked. */
  businessDnaId: string;
  primary: IdeasReadyEmailOpportunity & { fitScore: number; weeklyTime: string | null };
  alternatives: IdeasReadyEmailOpportunity[];
}

/** Sent once, right after the initial consultation finishes — ideas
 * exist, a roadmap doesn't yet (that's a separate, later, on-demand
 * generation triggered by "Build My Roadmap"). */
export async function sendIdeasReadyEmail(
  email: string,
  fullName: string | null,
  data: IdeasReadyEmailData,
): Promise<void> {
  const dashboardUrl = siteUrl(`/dashboard?consultation=${encodeURIComponent(data.businessDnaId)}`);
  const totalIdeas = 1 + data.alternatives.length;

  const metrics = [
    { label: "Directions", value: String(totalIdeas) },
    { label: "Strongest Fit", value: `${Math.round(data.primary.fitScore)}%` },
    ...(data.primary.weeklyTime ? [{ label: "Weekly Time", value: data.primary.weeklyTime }] : []),
  ];

  const alternativeRows = data.alternatives
    .map((alt) => `<tr><td style="padding:10px 40px 0 40px;">${secondaryIdeaCard(alt)}</td></tr>`)
    .join("");

  const bodyRowsHtml = `
${greetingRow(fullName)}
${bodyTextRow(`Sol finished analyzing your consultation and found ${totalIdeas} real ${totalIdeas === 1 ? "direction" : "directions"} for you to build. Here's your strongest match, plus what else Sol considered.`)}
<tr><td style="padding:18px 40px 0 40px;">${metricStrip(metrics)}</td></tr>
<tr><td style="padding:20px 40px 0 40px;">${primaryIdeaCard(data.primary)}</td></tr>
${alternativeRows}
<tr><td style="padding:26px 40px 4px 40px;">${primaryCta(dashboardUrl, "Explore My Directions")}</td></tr>
`;

  await sendSafely({
    to: email,
    subject: "Your business directions are ready",
    html: emailShell({
      preheader: `Sol found ${totalIdeas} directions for you, led by "${data.primary.title}" — see your strongest match and how it fits.`,
      bodyRowsHtml,
    }),
  });
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
}

/** Sent once a founder's roadmap has actually been built (after they
 * click "Build My Roadmap" for their selected opportunity). Always
 * deep-links to /dashboard/roadmap — the single active roadmap a founder
 * can have at a time, so unlike the ideas email there's no separate id to
 * pin to. */
export async function sendRoadmapReadyEmail(
  email: string,
  fullName: string | null,
  data: RoadmapReadyEmailData,
): Promise<void> {
  const roadmapUrl = siteUrl("/dashboard/roadmap");

  const metrics = [
    { label: "Opportunity", value: data.opportunityTitle },
    { label: "Week 01", value: data.week1Title },
    ...(data.missionCount !== null
      ? [{ label: "Missions", value: String(data.missionCount) }]
      : data.weeklyTimeCommitment
        ? [{ label: "Weekly Time", value: data.weeklyTimeCommitment }]
        : []),
  ];

  const bodyRowsHtml = `
${greetingRow(fullName)}
${bodyTextRow(`Your first founder mission is ready. Sol built a full roadmap for "${escapeHtml(data.opportunityTitle)}" — Week 01 is unlocked and waiting for you.`)}
<tr><td style="padding:18px 40px 0 40px;">${metricStrip(metrics)}</td></tr>
<tr><td style="padding:20px 40px 0 40px;">${primaryIdeaCard({ title: data.week1Title, oneLiner: data.week1Objective, fitScore: null })}</td></tr>
<tr><td style="padding:26px 40px 4px 40px;">${primaryCta(roadmapUrl, "Start Week 01")}</td></tr>
`;

  await sendSafely({
    to: email,
    subject: "Your Solventia roadmap is ready",
    html: emailShell({
      preheader: `Week 01 of your roadmap for "${data.opportunityTitle}" is ready — ${data.week1Title}.`,
      bodyRowsHtml,
    }),
  });
}
