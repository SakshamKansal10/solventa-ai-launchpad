import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/solventia/Header";
import { Footer } from "@/components/solventia/Footer";
import { ForOrganizations } from "@/components/solventia/ForOrganizations";
import { getSiteUrl } from "@/lib/actions/site-url.server";
import { breadcrumbJsonLd } from "@/lib/breadcrumb-jsonld";

export const Route = createFileRoute("/for-organizations")({
  component: ForOrganizationsPage,
  loader: () => getSiteUrl(),
  head: ({ loaderData: siteUrl }) => {
    const url = siteUrl ?? "/";
    const canonical = `${url.replace(/\/$/, "")}/for-organizations`;
    return {
      meta: [
        { title: "Solventia for Organizations" },
        {
          name: "description",
          content:
            "Solventia for schools, colleges, NGOs, and incubator programs supporting founders.",
        },
      ],
      links: [{ rel: "canonical", href: canonical }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(
            breadcrumbJsonLd("For Organizations", "/for-organizations", url),
          ),
        },
      ],
    };
  },
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
