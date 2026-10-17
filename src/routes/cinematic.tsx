import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { CinematicPage } from "@/components/cinematic-home/CinematicPage";
import {
  BRAND_FONT_PRELOAD,
  CINEMATIC_FONTS,
  cinematicSearch,
} from "@/components/cinematic-home/cinematic-route";

/**
 * The cinematic homepage on its review route — the same page as `/`, kept for review links and
 * tests (quality tier, debug HUD, frozen frames). Not linked, not in the sitemap, not indexed:
 * `/` is the canonical homepage.
 */
export const Route = createFileRoute("/cinematic")({
  validateSearch: z.object(cinematicSearch),
  component: CinematicRoute,
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
    links: [BRAND_FONT_PRELOAD, CINEMATIC_FONTS],
  }),
});

function CinematicRoute() {
  const { tier, debug, freeze } = Route.useSearch();
  return <CinematicPage tier={tier} debug={debug} freeze={freeze} />;
}
