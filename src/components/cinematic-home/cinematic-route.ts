import { z } from "zod";

/**
 * The cinematic homepage as a page: its own navigation, the film, and the shared footer. Served
 * at `/` (the official homepage) and at `/cinematic` (review route, not indexed).
 *
 *   ?tier=high|medium|low|fallback   force a quality tier or the static fallback
 *   ?debug=1 | ?debug=0              show / hide the dev HUD (shown by default in `vite dev`)
 *   ?freeze=1                        deterministic frames (no ambient motion) for review/tests
 */
export const cinematicSearch = {
  tier: z.enum(["high", "medium", "low", "fallback"]).optional().catch(undefined),
  debug: z.coerce.boolean().optional().catch(undefined),
  freeze: z.coerce.boolean().optional().catch(undefined),
};

/**
 * The brand face, fetched with the page itself (not discovered after a stylesheet), so the
 * opening's SOLVENTIA is in its own face from the first frame. Declared in styles.css.
 */
export const BRAND_FONT_PRELOAD = {
  rel: "preload",
  href: "/fonts/montserrat-latin.woff2",
  as: "font",
  type: "font/woff2",
  crossOrigin: "anonymous",
} as const;

/** The experience typeface (statements, interface, data); the wordmark face is BRAND_FONT_PRELOAD. */
export const CINEMATIC_FONTS = {
  rel: "stylesheet",
  href: "https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600&family=Geist+Mono:wght@400;500&display=swap",
};
