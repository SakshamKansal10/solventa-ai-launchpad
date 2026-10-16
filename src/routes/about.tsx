import type { ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/solventia/Header";
import { Footer } from "@/components/solventia/Footer";
import { MissionVision } from "@/components/solventia/MissionVision";
import { FoundersStory } from "@/components/solventia/FoundersStory";
import { PageBreadcrumb } from "@/components/solventia/PageBreadcrumb";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { getSiteUrl } from "@/lib/actions/site-url.server";
import { breadcrumbJsonLd } from "@/lib/breadcrumb-jsonld";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export const Route = createFileRoute("/about")({
  component: AboutPage,
  loader: () => getSiteUrl(),
  head: ({ loaderData: siteUrl }) => {
    const url = siteUrl ?? "/";
    const canonical = `${url.replace(/\/$/, "")}/about`;
    return {
      meta: [
        { title: "About Solventia" },
        {
          name: "description",
          content: "Why Solventia exists, who built it, and how it works.",
        },
      ],
      links: [{ rel: "canonical", href: canonical }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(breadcrumbJsonLd("About Solventia", "/about", url)),
        },
      ],
    };
  },
});

function AboutPage() {
  const { t } = useLocale();
  const faqs: { q: string; a: ReactNode }[] = [
    { q: t("about.faq1.q"), a: t("about.faq1.a") },
    { q: t("about.faq2.q"), a: t("about.faq2.a") },
    { q: t("about.faq3.q"), a: t("about.faq3.a") },
    {
      q: t("about.faq4.q"),
      a: (
        <>
          {t("about.faq4.before")}
          <Link
            to="/for-organizations"
            className="font-medium text-sol-violet-deep hover:underline"
          >
            {t("about.faq4.link")}
          </Link>
          {t("about.faq4.after")}
        </>
      ),
    },
    { q: t("about.faq5.q"), a: t("about.faq5.a") },
  ];
  return (
    <div className="min-h-screen bg-sol-page">
      <Header />
      <main className="pt-[76px]">
        <div className="mx-auto max-w-[1180px] px-[18px] pt-16 sm:px-6">
          <PageBreadcrumb page={t("about.crumb")} />
        </div>
        <div className="mx-auto max-w-[1180px] px-[18px] text-center sm:px-6">
          <p className="text-[14px] font-semibold uppercase tracking-[0.14em] text-sol-champagne-deep">
            {t("about.eyebrow")}
          </p>
          <h1 className="mx-auto mt-4 max-w-[720px] font-display text-[32px] font-semibold leading-[1.2] text-sol-ink sm:text-[40px]">
            {t("about.h1")}
          </h1>
        </div>

        <MissionVision />
        <FoundersStory />

        <section className="mx-auto max-w-[840px] px-[18px] py-16 sm:px-6">
          <h2 className="text-center font-display text-[28px] font-semibold text-sol-ink">
            {t("about.more")}
          </h2>
          <div className="mt-8 rounded-[24px] border border-sol-border bg-sol-surface px-6 lg:px-10">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((item, i) => (
                <AccordionItem key={item.q} value={`item-${i}`} className="border-sol-border">
                  <AccordionTrigger className="min-h-[68px] py-5 text-left text-[17px] font-medium text-sol-ink hover:no-underline">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="max-w-[700px] text-[17px] leading-[28px] text-sol-secondary">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
