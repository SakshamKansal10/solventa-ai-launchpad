import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { env } from "@/lib/env.server";
import { sanitizeNextPath } from "@/lib/safe-redirect";
import { Header } from "@/components/solventia/Header";
import { Hero } from "@/components/solventia/Hero";
import { FounderSignal } from "@/components/solventia/FounderSignal";
import { HowItWorks } from "@/components/solventia/HowItWorks";
import { AdaptiveRoadmap } from "@/components/solventia/AdaptiveRoadmap";
import { WhySolventia } from "@/components/solventia/WhySolventia";
import { BrandMoment } from "@/components/solventia/BrandMoment";
import { FinalCTA } from "@/components/solventia/FinalCTA";
import { FAQ } from "@/components/solventia/FAQ";
import { Footer } from "@/components/solventia/Footer";
import { SectionTransition } from "@/components/solventia/SectionTransition";
import { scrollToSection } from "@/hooks/use-active-section";

/** og:url/canonical must be absolute per spec — "/" alone is invalid there,
 * unlike every auth redirect in this app, which correctly derives from the
 * request's own origin and needs no server-side site URL at all. This is
 * the one place that genuinely needs it, read server-side only. */
const getSiteUrl = createServerFn({ method: "GET" }).handler(() => env.SITE_URL);

export const Route = createFileRoute("/")({
  component: Index,
  // Set only by requireAuthLoader bouncing a signed-out visitor here from
  // a protected route (e.g. a dashboard link from an email) — re-validated
  // with the same same-origin check on the way out, never trusted as-is.
  validateSearch: z.object({ next: z.string().optional() }),
  loader: () => getSiteUrl(),
  head: ({ loaderData: siteUrl }) => {
    const url = siteUrl ?? "/";
    // A clean, well-cropped 512x512 export of the official Solventia mark
    // — used as both the OG/Twitter card image and the Organization
    // logo. Doubles as the interim OG image until a real 1200x630
    // marketing asset exists; every field below already reads from this
    // one constant so that's a one-line change later.
    const image = `${url.replace(/\/$/, "")}/icon-512.png`;
    return {
      meta: [
        { title: "Solventia — Personalized AI Business Ideas & Founder Roadmaps" },
        {
          name: "description",
          content:
            "Solventia turns your skills, resources, and ambition into personalized business directions you can test, build, and grow — with a roadmap that adapts as you learn.",
        },
        {
          property: "og:title",
          content: "Solventia — Personalized AI Business Ideas & Founder Roadmaps",
        },
        {
          property: "og:description",
          content:
            "Personalized business directions, real-world evidence, and an adaptive weekly roadmap — for founders, not just idea browsers.",
        },
        { property: "og:url", content: url },
        { property: "og:image", content: image },
        {
          name: "twitter:title",
          content: "Solventia — Personalized AI Business Ideas & Founder Roadmaps",
        },
        {
          name: "twitter:description",
          content:
            "Personalized business directions, real-world evidence, and an adaptive weekly roadmap — for founders, not just idea browsers.",
        },
        { name: "twitter:image", content: image },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "Solventia",
            alternateName: "Solventia AI",
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
          }),
        },
      ],
    };
  },
});

/** Exactly eight sections, one continuous product story — see the
 * homepage reconstruction spec this implements. Nothing here is a
 * generic marketing filler section; every block earns its place in the
 * HERO -> FOUNDER SIGNAL -> HOW IT WORKS -> ADAPTIVE ROADMAP -> WHY
 * SOLVENTIA -> BRAND MOMENT -> CTA -> FAQ narrative. */
function Index() {
  const { next } = Route.useSearch();
  const pendingNext = sanitizeNextPath(next);

  // A nav link clicked from another page (or the footer) navigates here
  // with a hash — scroll to it ourselves, at the same header-offset used
  // for in-page clicks, rather than relying on the browser's own
  // (header-unaware) fragment jump.
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;
    const id = window.setTimeout(() => scrollToSection(hash), 80);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div className="min-h-screen bg-sol-page">
      <Header pendingNext={pendingNext} />
      <main>
        <Hero />
        <FounderSignal />
        <SectionTransition from="#FCFAF7" to="#F7F2EA" line="champagne" />
        <HowItWorks />
        <AdaptiveRoadmap />
        <SectionTransition from="#FCFAF7" to="#F5EFE6" />
        <WhySolventia />
        <BrandMoment />
        <SectionTransition from="#F7F2EA" to="#17203D" line="violet" />
        <FinalCTA />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
}
