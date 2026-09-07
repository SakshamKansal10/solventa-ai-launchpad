import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/solventia/Header";
import { Footer } from "@/components/solventia/Footer";
import { ForOrganizations } from "@/components/solventia/ForOrganizations";

export const Route = createFileRoute("/for-organizations")({
  component: ForOrganizationsPage,
  head: () => ({
    meta: [
      { title: "For Organizations — Solventia" },
      {
        name: "description",
        content:
          "Solventia for schools, colleges, NGOs, and incubator programs supporting founders.",
      },
    ],
  }),
});

function ForOrganizationsPage() {
  return (
    <div className="min-h-screen bg-sol-page">
      <Header />
      <main className="pt-[68px] md:pt-[84px]">
        <ForOrganizations />
      </main>
      <Footer />
    </div>
  );
}
