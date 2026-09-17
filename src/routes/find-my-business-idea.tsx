import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Clock, ShieldCheck, Sparkles } from "lucide-react";
import { Header } from "@/components/solventia/Header";
import { Footer } from "@/components/solventia/Footer";
import { PageBreadcrumb } from "@/components/solventia/PageBreadcrumb";
import { PremiumButton } from "@/components/solventia/PremiumButton";
import { getSiteUrl } from "@/lib/actions/site-url.server";
import { breadcrumbJsonLd } from "@/lib/breadcrumb-jsonld";

const POINTS = [
  {
    icon: Clock,
    title: "About 10 minutes",
    body: "A guided consultation — your background, skills, resources, and goals, not a generic quiz.",
  },
  {
    icon: Sparkles,
    title: "Built around you",
    body: "Sol reasons through your full profile to surface directions that actually fit, not a keyword match.",
  },
  {
    icon: ShieldCheck,
    title: "No guesswork after",
    body: "Every direction comes with why it fits, what it needs, and a roadmap to start proving it.",
  },
];

export const Route = createFileRoute("/find-my-business-idea")({
  component: FindMyBusinessIdeaPage,
  loader: () => getSiteUrl(),
  head: ({ loaderData: siteUrl }) => {
    const url = siteUrl ?? "/";
    const canonical = `${url.replace(/\/$/, "")}/find-my-business-idea`;
    return {
      meta: [
        { title: "Find My Business Idea | Solventia" },
        {
          name: "description",
          content:
            "Start a personalized founder consultation — Solventia turns your skills, resources, and goals into real business directions you can act on.",
        },
      ],
      links: [{ rel: "canonical", href: canonical }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(
            breadcrumbJsonLd("Find My Business Idea", "/find-my-business-idea", url),
          ),
        },
      ],
    };
  },
});

function FindMyBusinessIdeaPage() {
  return (
    <div className="min-h-screen bg-sol-page">
      <Header />
      <main className="pt-[68px] md:pt-[84px]">
        <section className="relative mx-auto max-w-[900px] px-[18px] py-20 sm:px-6 lg:px-10">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-[320px] max-w-[900px]"
            style={{
              background:
                "radial-gradient(ellipse 500px 320px at 50% 25%, rgba(114,87,216,.08), transparent 70%)",
            }}
            aria-hidden="true"
          />
          <div className="relative">
            <PageBreadcrumb page="Find My Business Idea" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sol-champagne-deep">
              Start Here
            </p>
            <h1 className="mt-4 max-w-[680px] font-display text-[32px] font-semibold leading-[1.2] text-sol-ink sm:text-[42px]">
              Find a Business Direction Built Around You
            </h1>
            <p className="mt-5 max-w-[560px] text-[17px] leading-[27px] text-sol-secondary">
              Tell Sol about your skills, resources, and goals. It reasons through your real profile
              — not a generic quiz — and comes back with directions worth actually pursuing.
            </p>

            <div className="mt-9">
              <PremiumButton href="/consultation" tone="solid" shape="rounded" size="lg">
                Start My Consultation
                <ArrowRight className="size-4 text-sol-champagne" aria-hidden="true" />
              </PremiumButton>
            </div>

            <div className="mt-16 grid gap-6 sm:grid-cols-3">
              {POINTS.map((p) => (
                <div
                  key={p.title}
                  className="rounded-2xl border border-sol-border bg-sol-surface px-5 py-6"
                >
                  <p.icon className="size-5 text-sol-violet-deep" aria-hidden="true" />
                  <p className="mt-3 font-display text-[1.05rem] font-semibold text-sol-ink">
                    {p.title}
                  </p>
                  <p className="mt-1.5 text-[0.9rem] leading-relaxed text-sol-secondary">
                    {p.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
