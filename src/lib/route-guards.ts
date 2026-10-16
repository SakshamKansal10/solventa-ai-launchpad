import { redirect } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";

import { getCurrentUser } from "@/lib/actions/auth";
import { env } from "@/lib/env.server";
import { qk } from "@/lib/queries";
import { sanitizeNextPath } from "@/lib/safe-redirect";

/** Shared `beforeLoad` for every authenticated dashboard route — bounces
 * signed-out visitors back to the homepage instead of rendering a route
 * that has nothing to show them. Carries the exact path they were trying
 * to reach (a dashboard deep link from an email, say) along as `?next=`
 * so the homepage's sign-in flow can return them there once they're
 * signed in, instead of stranding them on the homepage.
 *
 * The user comes from the shared query cache when it is fresh, so moving
 * between dashboard pages does not pay a server round trip just to re-ask
 * "who is this?". Every server function still authenticates independently —
 * this guard is about routing, never about authorisation. */
export async function requireAuthLoader({
  location,
  context,
}: {
  location: { href: string };
  context?: { queryClient?: QueryClient };
}) {
  const fetchUser = () => getCurrentUser();
  const user = context?.queryClient
    ? await context.queryClient.ensureQueryData({
        queryKey: qk.currentUser,
        queryFn: fetchUser,
        staleTime: 5 * 60_000,
      })
    : await fetchUser();
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
