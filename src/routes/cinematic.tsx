import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { CinematicHome } from "@/components/cinematic-home/CinematicHome";
import { CinematicNav } from "@/components/cinematic-home/nav/CinematicNav";
import { Footer } from "@/components/solventia/Footer";

/**
 * The cinematic homepage — local review build, on its own route so the live
 * homepage (/) stays untouched for comparison. Not linked, not in the sitemap,
 * not indexed.
 *
 *   ?tier=high|medium|low|fallback   force a quality tier or the static fallback
 *   ?debug=1 | ?debug=0              show / hide the dev HUD (shown by default in `vite dev`)
 *   ?freeze=1                        deterministic frames (no ambient motion) for review/tests
 */
export const Route = createFileRoute("/cinematic")({
  validateSearch: z.object({
    tier: z.enum(["high", "medium", "low", "fallback"]).optional().catch(undefined),
    debug: z.coerce.boolean().optional().catch(undefined),
    freeze: z.coerce.boolean().optional().catch(undefined),
  }),
  component: CinematicPage,
  head: () => ({
    meta: [
      { title: "Solventia — Find the direction worth building" },
      {
        name: "description",
        content:
          "Solventia turns your skills, resources and constraints into personalised business directions, real-world evidence and an adaptive founder roadmap.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function CinematicPage() {
  const { tier, debug, freeze } = Route.useSearch();
  return (
    <div className="min-h-screen bg-[#070B13]">
      <CinematicNav />
      <CinematicHome tierOverride={tier} debug={debug} freeze={freeze} />
      {/* Opaque and stacked above the fixed WebGL stage: the footer slides over it. */}
      <div className="relative z-20">
        <Footer />
      </div>
    </div>
  );
}
