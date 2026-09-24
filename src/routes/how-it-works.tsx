import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Header } from "@/components/solventia/Header";
import { Footer } from "@/components/solventia/Footer";
import { PageBreadcrumb } from "@/components/solventia/PageBreadcrumb";
import { PremiumButton } from "@/components/solventia/PremiumButton";
import { getSiteUrl } from "@/lib/actions/site-url.server";
import { breadcrumbJsonLd } from "@/lib/breadcrumb-jsonld";
import type { MessageKey } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const STEPS: { n: string; title: MessageKey; body: MessageKey }[] = [
  { n: "01", title: "hiwPage.step1.title", body: "hiwPage.step1.body" },
  { n: "02", title: "hiwPage.step2.title", body: "hiwPage.step2.body" },
  { n: "03", title: "hiwPage.step3.title", body: "hiwPage.step3.body" },
  { n: "04", title: "hiwPage.step4.title", body: "hiwPage.step4.body" },
  { n: "05", title: "hiwPage.step5.title", body: "hiwPage.step5.body" },
  { n: "06", title: "hiwPage.step6.title", body: "hiwPage.step6.body" },
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
  const { t } = useLocale();
  return (
    <div className="min-h-screen bg-sol-page">
      <Header />
      <main className="pt-[76px]">
        <section className="mx-auto max-w-[960px] px-[18px] py-20 sm:px-6 lg:px-10">
          <PageBreadcrumb page={t("hiwPage.crumb")} />
          <div className="text-center">
            <p className="text-[14px] font-semibold uppercase tracking-[0.14em] text-sol-champagne-deep">
              {t("hiwPage.eyebrow")}
            </p>
            <h1 className="mx-auto mt-4 max-w-[640px] font-display text-[34px] font-semibold leading-[1.15] text-sol-ink sm:text-[44px]">
              {t("hiwPage.h1")}
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
                    {t(s.title)}
                  </p>
                  <p className="mt-2 max-w-[560px] text-[1.0625rem] leading-[1.7] text-sol-secondary">
                    {t(s.body)}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-16 text-center">
            <PremiumButton href="/find-my-business-idea" tone="solid" shape="rounded" size="lg">
              {t("hiwPage.cta")}
              <ArrowRight className="size-4 text-sol-champagne" aria-hidden="true" />
            </PremiumButton>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
