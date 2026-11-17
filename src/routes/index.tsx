import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getSiteUrl } from "@/lib/actions/site-url.server";
import { sanitizeNextPath } from "@/lib/safe-redirect";
import { CinematicPage } from "@/components/cinematic-home/CinematicPage";
import { INTRO_GATE_SCRIPT } from "@/components/cinematic-home/intro/intro-gate";
import {
  BRAND_FONT_PRELOAD,
  CINEMATIC_FONTS,
  cinematicSearch,
} from "@/components/cinematic-home/cinematic-route";

export const Route = createFileRoute("/")({
  component: Index,
  // Set only by requireAuthLoader bouncing a signed-out visitor here from
  // a protected route (e.g. a dashboard link from an email) — re-validated
  // with the same same-origin check on the way out, never trusted as-is.
  // (The cinematic's review params — film / tier / debug / freeze — work here too.)
  validateSearch: z.object({ next: z.string().optional(), ...cinematicSearch }),
  loader: () => getSiteUrl(),
  head: ({ loaderData: siteUrl }) => {
    const url = siteUrl ?? "/";
    // A clean, well-cropped 512x512 export of the official Solventia mark
    // — used as both the OG/Twitter card image and the Organization
    // logo. Doubles as the interim OG image until a real 1200x630
    // marketing asset exists; every field below already reads from this
    // one constant so that's a one-line change later.
    // The transparent S mark from the owner's icon set.
    const image = `${url.replace(/\/$/, "")}/brand/solventia-mark-512.png`;
    const card = `${url.replace(/\/$/, "")}/og-image.png`;
    return {
      meta: [
        { title: "Solventia — Personalized Business Ideas & Founder Roadmaps" },
        {
          name: "description",
          content:
            "Solventia turns your skills, resources, and ambition into personalized business opportunities, real-world testing, and adaptive founder roadmaps.",
        },
        {
          property: "og:title",
          content: "Solventia — Personalized Business Ideas & Founder Roadmaps",
        },
        {
          property: "og:description",
          content:
            "Personalized business directions, real-world proof, and an adaptive weekly roadmap — for founders, not just idea browsers.",
        },
        { property: "og:url", content: url },
        { property: "og:image", content: card },
        {
          name: "twitter:title",
          content: "Solventia — Personalized Business Ideas & Founder Roadmaps",
        },
        {
          name: "twitter:description",
          content:
            "Personalized business directions, real-world proof, and an adaptive weekly roadmap — for founders, not just idea browsers.",
        },
        { name: "twitter:image", content: card },
      ],
      links: [BRAND_FONT_PRELOAD, { rel: "canonical", href: url }, CINEMATIC_FONTS],
      scripts: [
        // The opening question: decided before the first paint (see intro-gate.ts).
        { children: INTRO_GATE_SCRIPT },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "Solventia",
            alternateName: ["Solventia AI", "solventia.in"],
            url,
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Solventia",
            url,
            logo: image,
            // TODO(owner): add the real profile URLs, e.g. "https://www.linkedin.com/company/…",
            // "https://www.instagram.com/…". Left empty until then — a placeholder URL in
            // structured data would point Google at a page that does not exist.
            sameAs: [] as string[],
          }),
        },
      ],
    };
  },
});

/**
 * The official homepage: the cinematic experience — the founder's reality, the possibilities, one
 * direction, validation, evidence, the product, the identity. A signed-out visitor bounced here
 * from a protected route (`/?next=…`) still gets the sign-in prompt straight away.
 */
function Index() {
  const { next, tier, film, debug, freeze } = Route.useSearch();
  const pendingNext = sanitizeNextPath(next);
  return (
    <CinematicPage
      tier={tier}
      film={film}
      debug={debug}
      freeze={freeze}
      pendingNext={pendingNext}
    />
  );
}
