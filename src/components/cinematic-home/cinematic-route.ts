import { z } from "zod";

/**
 * The cinematic homepage as a page: its own navigation, the film, and the shared footer. Served
 * at `/` (the official homepage) and at `/cinematic` (review route, not indexed).
 *
 *   ?film=live|recorded|reduced|debug  force a rendering path; "debug" shows the path overlay
 *   ?tier=full|lite|fallback         the live world's preset (tests); "fallback" = recorded (high|medium → full,
 *                                    low → lite, for older links)
 *   ?debug=1 | ?debug=0              show / hide the dev HUD (shown by default in `vite dev`)
 *   ?freeze=1                        deterministic frames (no ambient motion) for review/tests
 *   ?perf=1                          expose live counters (window.__cine) without the HUD
 */
export const cinematicSearch = {
  tier: z.enum(["full", "lite", "fallback", "high", "medium", "low"]).optional().catch(undefined),
  film: z.enum(["live", "recorded", "reduced", "debug"]).optional().catch(undefined),
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
