import { createServerFn } from "@tanstack/react-start";
import { env } from "@/lib/env.server";

/** The one shared way every public route's `head()` gets an absolute
 * canonical URL — a plain `.server.ts` export can't be called directly
 * from a route `loader` (it also runs client-side on navigation, where
 * `process.env` doesn't exist), so this wraps the read in a real server
 * function every route can call from its own loader. */
export const getSiteUrl = createServerFn({ method: "GET" }).handler(() => env.SITE_URL);

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
