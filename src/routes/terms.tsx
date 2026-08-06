import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/solventia/Header";
import { Footer } from "@/components/solventia/Footer";
import { LegalPlaceholder } from "@/components/solventia/LegalPlaceholder";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
  head: () => ({
    meta: [{ title: "Terms of Service — Solventia" }, { name: "robots", content: "noindex" }],
  }),
});

function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <LegalPlaceholder
          title="Terms of Service"
          description="The terms that govern your use of Solventia."
        />
      </main>
      <Footer />
    </div>
  );
}
