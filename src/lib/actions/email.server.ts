import { Resend } from "resend";
import { env } from "@/lib/env.server";

let client: Resend | null = null;

function getClient(): Resend | null {
  if (!env.RESEND_API_KEY) return null;
  if (!client) client = new Resend(env.RESEND_API_KEY);
  return client;
}

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

export async function sendWelcomeEmail(email: string, fullName: string | null): Promise<void> {
  const name = fullName ?? "there";
  await sendSafely({
    to: email,
    subject: "Welcome to Solventia",
    html: `<p>Hi ${name},</p><p>Welcome to Solventia. Head back to <a href="${env.SITE_URL}/consultation">your consultation</a> with Sol whenever you're ready — everything you share stays saved to your account.</p>`,
  });
}

export async function sendRoadmapReadyEmail(
  email: string,
  opportunityTitle: string,
): Promise<void> {
  await sendSafely({
    to: email,
    subject: "Your roadmap is ready",
    html: `<p>Sol has built your roadmap for "${opportunityTitle}". <a href="${env.SITE_URL}/dashboard/roadmap">Open your dashboard</a> to see the first steps.</p>`,
  });
}
