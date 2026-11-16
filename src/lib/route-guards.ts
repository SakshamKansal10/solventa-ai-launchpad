import { redirect } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";

import { getCurrentUser } from "@/lib/actions/auth";
import { env } from "@/lib/env.server";
import { qk } from "@/lib/queries";
import { sanitizeNextPath } from "@/lib/safe-redirect";

/** Shared `beforeLoad` for every authenticated dashboard route — sends
 * signed-out visitors to the sign-in page (never the homepage and its opening:
 * owner, 2026-11-16) with the exact path they were trying to reach (a deep
 * link from an email, say) as `?next=`, so every way of signing in there —
 * Google's button, One Tap, the redirect, a code or a password — returns them
 * to that page.
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
    throw redirect({ to: "/sign-in", search: next ? { next } : undefined });
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
