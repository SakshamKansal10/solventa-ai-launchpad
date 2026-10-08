import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getSiteUrl } from "@/lib/actions/site-url.server";
import { sanitizeNextPath } from "@/lib/safe-redirect";
import { Header } from "@/components/solventia/Header";
import { Hero } from "@/components/solventia/Hero";
import { FounderSignal } from "@/components/solventia/FounderSignal";
import { HowItWorks } from "@/components/solventia/HowItWorks";
import { AdaptiveRoadmap } from "@/components/solventia/AdaptiveRoadmap";
import { FinalCTA } from "@/components/solventia/FinalCTA";
import { FAQ } from "@/components/solventia/FAQ";
import { Footer } from "@/components/solventia/Footer";
import { OpportunityDemo } from "@/components/solventia/OpportunityDemo";
import { ProofDemo } from "@/components/solventia/ProofDemo";
import { PopOnScroll, ScrollProgress } from "@/components/solventia/ScrollEffects";
import { scrollToSection } from "@/hooks/use-active-section";

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
            "Solventia turns your skills, resources, and ambition into personalized business opportunities, real-world validation, and adaptive founder roadmaps.",
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

/** The homepage is one continuous product story: Hero → founder signals become
 * opportunities → one direction in focus → the five-step process → the adaptive
 * roadmap → the proof engine → Ask Sol in context → closing CTA → FAQ → Footer.
 * Nothing here is generic marketing filler. */
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
      <ScrollProgress />
      <PopOnScroll />
      <Header pendingNext={pendingNext} />
      <main>
        <Hero />
        <FounderSignal />
        <OpportunityDemo />
        <HowItWorks />
        <AdaptiveRoadmap />
        <ProofDemo />
        <FinalCTA />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
}
