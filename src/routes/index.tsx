import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/solventia/Header";
import { Hero } from "@/components/solventia/Hero";
import { Steps } from "@/components/solventia/Steps";
import { Features } from "@/components/solventia/Features";
import { Footer } from "@/components/solventia/Footer";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Solventia — Validate, Build & Elevate Your Business Idea" },
      {
        name: "description",
        content:
          "Solventia helps young dreamers discover AI-powered business opportunities, validate them with real data, and build step-by-step roadmaps to real impact.",
      },
      { property: "og:title", content: "Solventia — Validate, Build & Elevate" },
      {
        property: "og:description",
        content:
          "AI-powered idea discovery, data-backed validation, and step-by-step roadmaps for young entrepreneurs.",
      },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero />
        <Steps />
        <Features />
      </main>
      <Footer />
    </div>
  );
}
