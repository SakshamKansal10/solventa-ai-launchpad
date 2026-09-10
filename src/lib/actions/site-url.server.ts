import { env } from "@/lib/env.server";

/** The one canonical way every email builds an absolute, in-app URL —
 * every email link goes through this so a trailing (or missing) slash on
 * SITE_URL, or a path built without a leading slash, can never produce a
 * doubled slash, an "undefined" segment, or (in production, where
 * SITE_URL is always set to the real domain) a stray localhost/preview
 * link. Never used for browser-side redirects (OAuth, email
 * confirmation) — those already correctly derive from the live request's
 * own origin and must keep doing so. */
export function siteUrl(path = "/"): string {
  const base = env.SITE_URL.replace(/\/+$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
}
