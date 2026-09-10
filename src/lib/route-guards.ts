import { redirect } from "@tanstack/react-router";
import { getCurrentUser } from "@/lib/actions/auth";
import { env } from "@/lib/env.server";
import { sanitizeNextPath } from "@/lib/safe-redirect";

/** Shared `beforeLoad` for every authenticated dashboard route — bounces
 * signed-out visitors back to the homepage instead of rendering a route
 * that has nothing to show them. Carries the exact path they were trying
 * to reach (a dashboard deep link from an email, say) along as `?next=`
 * so the homepage's sign-in flow can return them there once they're
 * signed in, instead of stranding them on the homepage. */
export async function requireAuthLoader({ location }: { location: { href: string } }) {
  const user = await getCurrentUser();
  if (!user) {
    const next = sanitizeNextPath(location.href);
    throw redirect({ to: "/", search: next ? { next } : undefined });
  }
  return user;
}

/** Gates /review — same real-auth requirement as the dashboard, plus an
 * email allowlist. A signed-in user whose email isn't allowlisted gets
 * bounced exactly like an unauthenticated /dashboard request; there's no
 * distinguishable "you're logged in but not a reviewer" response for an
 * outside observer to fingerprint. */
export async function requireReviewerLoader() {
  const user = await getCurrentUser();
  if (!user?.email) throw redirect({ to: "/" });
  const allowed = env.REVIEWER_EMAILS;
  if (!allowed.includes(user.email.toLowerCase())) throw redirect({ to: "/" });
  return user;
}
