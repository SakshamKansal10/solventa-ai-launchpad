import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/solventia/Header";
import { Footer } from "@/components/solventia/Footer";
import { LegalPlaceholder } from "@/components/solventia/LegalPlaceholder";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({
    meta: [{ title: "Privacy Policy — Solventia" }, { name: "robots", content: "noindex" }],
  }),
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <LegalPlaceholder
          title="Privacy Policy"
          description="How Solventia collects, uses, and protects your information."
        />
      </main>
      <Footer />
    </div>
  );
}
