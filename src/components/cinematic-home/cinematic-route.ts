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

/** The experience typeface (statements, interface, data); the wordmark face comes from the root. */
export const CINEMATIC_FONTS = {
  rel: "stylesheet",
  href: "https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600&family=Geist+Mono:wght@400;500&display=swap",
};
