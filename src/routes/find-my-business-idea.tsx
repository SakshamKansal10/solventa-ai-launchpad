import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Clock, ShieldCheck, Sparkles } from "lucide-react";
import { Header } from "@/components/solventia/Header";
import { Footer } from "@/components/solventia/Footer";
import { PageBreadcrumb } from "@/components/solventia/PageBreadcrumb";
import { PremiumButton } from "@/components/solventia/PremiumButton";
import { getSiteUrl } from "@/lib/actions/site-url.server";
import { breadcrumbJsonLd } from "@/lib/breadcrumb-jsonld";
import type { MessageKey } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const POINTS: { icon: typeof Clock; title: MessageKey; body: MessageKey }[] = [
  { icon: Clock, title: "fmbi.p1.title", body: "fmbi.p1.body" },
  { icon: Sparkles, title: "fmbi.p2.title", body: "fmbi.p2.body" },
  { icon: ShieldCheck, title: "fmbi.p3.title", body: "fmbi.p3.body" },
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
  const { t } = useLocale();
  return (
    <div className="min-h-screen bg-sol-page">
      <Header />
      <main className="pt-[76px]">
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
            <PageBreadcrumb page={t("fmbi.crumb")} />
            <p className="text-[14px] font-semibold uppercase tracking-[0.14em] text-sol-champagne-deep">
              {t("fmbi.eyebrow")}
            </p>
            <h1 className="mt-4 max-w-[680px] font-display text-[32px] font-semibold leading-[1.2] text-sol-ink sm:text-[42px]">
              {t("fmbi.h1")}
            </h1>
            <p className="mt-5 max-w-[560px] text-[17px] leading-[27px] text-sol-secondary">
              {t("fmbi.sub")}
            </p>

            <div className="mt-9">
              <PremiumButton href="/consultation" tone="solid" shape="rounded" size="lg">
                {t("fmbi.cta")}
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
                  <p className="mt-3 font-display text-[1.25rem] font-semibold text-sol-ink">
                    {t(p.title)}
                  </p>
                  <p className="mt-1.5 text-[1rem] leading-relaxed text-sol-secondary">
                    {t(p.body)}
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
