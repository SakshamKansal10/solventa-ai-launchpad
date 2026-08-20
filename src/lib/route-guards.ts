import { redirect } from "@tanstack/react-router";
import { getCurrentUser } from "@/lib/actions/auth";
import { env } from "@/lib/env.server";

/** Shared `beforeLoad` for every authenticated dashboard route — bounces
 * signed-out visitors back to the homepage instead of rendering a route
 * that has nothing to show them. */
export async function requireAuthLoader() {
  const user = await getCurrentUser();
  if (!user) throw redirect({ to: "/" });
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
