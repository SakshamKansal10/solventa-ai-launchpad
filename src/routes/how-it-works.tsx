import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Header } from "@/components/solventia/Header";
import { Footer } from "@/components/solventia/Footer";
import { PageBreadcrumb } from "@/components/solventia/PageBreadcrumb";
import { PremiumButton } from "@/components/solventia/PremiumButton";
import { getSiteUrl } from "@/lib/actions/site-url.server";
import { breadcrumbJsonLd } from "@/lib/breadcrumb-jsonld";

const STEPS = [
  {
    n: "01",
    title: "Founder Profile",
    body: "Your skills, resources, time, and goals — shared once.",
  },
  {
    n: "02",
    title: "Personalized Directions",
    body: "Sol reasons through your profile into real business directions.",
  },
  {
    n: "03",
    title: "Select Opportunity",
    body: "Pick the direction that actually fits where you are.",
  },
  { n: "04", title: "Validate", body: "Real-world evidence before you commit time or money." },
  {
    n: "05",
    title: "Build Adaptive Roadmap",
    body: "A staged plan that adjusts as you learn, not a fixed script.",
  },
  {
    n: "06",
    title: "Execute Week by Week",
    body: "One unlocked week at a time, calibrated to your real pace.",
  },
];

export const Route = createFileRoute("/how-it-works")({
  component: HowItWorksPage,
  loader: () => getSiteUrl(),
  head: ({ loaderData: siteUrl }) => {
    const url = siteUrl ?? "/";
    const canonical = `${url.replace(/\/$/, "")}/how-it-works`;
    return {
      meta: [
        { title: "How Solventia Works | Personalized Founder Intelligence" },
        {
          name: "description",
          content:
            "From founder profile to real execution — see how Solventia moves you from personalized directions to a roadmap you can actually run.",
        },
      ],
      links: [{ rel: "canonical", href: canonical }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(breadcrumbJsonLd("How It Works", "/how-it-works", url)),
        },
      ],
    };
  },
});

function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-sol-page">
      <Header />
      <main className="pt-[68px] md:pt-[84px]">
        <section className="mx-auto max-w-[960px] px-[18px] py-20 sm:px-6 lg:px-10">
          <PageBreadcrumb page="How It Works" />
          <div className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sol-champagne-deep">
              How It Works
            </p>
            <h1 className="mx-auto mt-4 max-w-[640px] font-display text-[34px] font-semibold leading-[1.15] text-sol-ink sm:text-[44px]">
              From Founder Profile to Real Execution
            </h1>
          </div>

          <ol className="relative mt-16 flex flex-col gap-10 sm:gap-12">
            {STEPS.map((s) => (
              <li key={s.n} className="flex items-start gap-6 sm:gap-8">
                <span className="shrink-0 font-display text-[2.6rem] font-semibold leading-none text-sol-champagne-deep sm:text-[3.2rem]">
                  {s.n}
                </span>
                <div className="pt-1.5">
                  <p className="font-display text-[1.4rem] font-semibold text-sol-ink sm:text-[1.6rem]">
                    {s.title}
                  </p>
                  <p className="mt-2 max-w-[520px] text-[1rem] leading-[1.7] text-sol-secondary">
                    {s.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-16 text-center">
            <PremiumButton href="/find-my-business-idea" tone="solid" shape="rounded" size="lg">
              Find My Business Idea
              <ArrowRight className="size-4 text-sol-champagne" aria-hidden="true" />
            </PremiumButton>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
