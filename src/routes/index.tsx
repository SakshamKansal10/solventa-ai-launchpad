import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { env } from "@/lib/env.server";
import { Header } from "@/components/solventia/Header";
import { Hero } from "@/components/solventia/Hero";
import { Steps } from "@/components/solventia/Steps";
import { AIDiscoveryFlow } from "@/components/solventia/AIDiscoveryFlow";
import { Features } from "@/components/solventia/Features";
import { FeaturedIdeas } from "@/components/solventia/FeaturedIdeas";
import { WhySolventia } from "@/components/solventia/WhySolventia";
import { RoadmapTimeline } from "@/components/solventia/RoadmapTimeline";
import { MissionVision } from "@/components/solventia/MissionVision";
import { FoundersStory } from "@/components/solventia/FoundersStory";
import { ForNGOs } from "@/components/solventia/ForNGOs";
import { FAQ } from "@/components/solventia/FAQ";
import { Footer } from "@/components/solventia/Footer";

/** og:url/canonical must be absolute per spec — "/" alone is invalid there,
 * unlike every auth redirect in this app, which correctly derives from the
 * request's own origin and needs no server-side site URL at all. This is
 * the one place that genuinely needs it, read server-side only. */
const getSiteUrl = createServerFn({ method: "GET" }).handler(() => env.SITE_URL);

export const Route = createFileRoute("/")({
  component: Index,
  loader: () => getSiteUrl(),
  head: ({ loaderData: siteUrl }) => {
    const url = siteUrl ?? "/";
    // The rendered favicon doubles as the interim OG/logo image — swap in
    // a real 1200x630 asset once one exists; every field below already
    // reads from this one constant so that's a one-line change later.
    const image = `${url.replace(/\/$/, "")}/favicon.png`;
    return {
      meta: [
        { title: "Solventia — AI Business Idea & Founder Roadmap Platform" },
        {
          name: "description",
          content:
            "Solventia helps students and aspiring founders discover personalized AI-powered business ideas, validate opportunities, and follow step-by-step founder roadmaps from scratch.",
        },
        {
          property: "og:title",
          content: "Solventia — AI Business Idea & Founder Roadmap Platform",
        },
        {
          property: "og:description",
          content:
            "AI-powered idea discovery, data-backed validation, and step-by-step founder roadmaps — for students and aspiring founders.",
        },
        { property: "og:url", content: url },
        { property: "og:image", content: image },
        {
          name: "twitter:title",
          content: "Solventia — AI Business Idea & Founder Roadmap Platform",
        },
        {
          name: "twitter:description",
          content:
            "AI-powered idea discovery, data-backed validation, and step-by-step founder roadmaps — for students and aspiring founders.",
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

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero />
        <Steps />
        <AIDiscoveryFlow />
        <Features />
        <FeaturedIdeas />
        <WhySolventia />
        <RoadmapTimeline />
        <MissionVision />
        <FoundersStory />
        <ForNGOs />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
}
