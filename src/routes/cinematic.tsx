import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { CinematicHome } from "@/components/cinematic-home/CinematicHome";
import { Footer } from "@/components/solventia/Footer";
import { Header } from "@/components/solventia/Header";

/**
 * PHASE 1 PROTOTYPE of the cinematic homepage — its technical foundation, on
 * its own route so the live homepage (/) stays untouched for side-by-side
 * comparison. Not linked from anywhere, not in the sitemap, not indexed.
 *
 *   ?tier=high|medium|low|fallback   force a quality tier or the static fallback
 *   ?debug=1 | ?debug=0              show / hide the dev HUD (shown by default in `vite dev`)
 */
export const Route = createFileRoute("/cinematic")({
  validateSearch: z.object({
    tier: z.enum(["high", "medium", "low", "fallback"]).optional().catch(undefined),
    debug: z.coerce.boolean().optional().catch(undefined),
  }),
  component: CinematicPrototype,
  head: () => ({
    meta: [
      { title: "Cinematic homepage prototype — Solventia" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function CinematicPrototype() {
  const { tier, debug } = Route.useSearch();
  return (
    <div className="min-h-screen">
      <Header />
      {/* The shared Header is a translucent (88%) pearl bar made for light pages. Over the
          dark stage its effective background drops the champagne tagline below WCAG AA
          (≈4.3:1), so an opaque pearl plate sits directly behind it on this route. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 z-40 h-[76px] bg-sol-pearl"
      />
      <CinematicHome tierOverride={tier} debug={debug} />
      {/* Opaque and stacked above the fixed WebGL stage: the footer slides over it. */}
      <div className="relative z-20">
        <Footer />
      </div>
    </div>
  );
}
