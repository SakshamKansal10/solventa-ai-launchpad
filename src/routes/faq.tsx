import { createFileRoute } from "@tanstack/react-router";

import { Card, InfoPage, infoHead } from "@/components/solventia/InfoPage";
import { getSiteUrl } from "@/lib/actions/site-url.server";
import type { MessageKey } from "@/lib/i18n";
import { MESSAGES } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const QUESTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export const Route = createFileRoute("/faq")({
  component: FaqPage,
  loader: () => getSiteUrl(),
  head: ({ loaderData }) => {
    const base = infoHead(
      loaderData,
      "/faq",
      "Questions",
      "How Solventia finds business directions, what the roadmap and proof are, Hindi, estimates, your data and what Solventia is not.",
    );
    // FAQPage structured data from the same English answers the page shows.
    const faq = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: QUESTIONS.map((n) => ({
        "@type": "Question",
        name: MESSAGES.en[`pub.faq.${n}.q`],
        acceptedAnswer: { "@type": "Answer", text: MESSAGES.en[`pub.faq.${n}.a`] },
      })),
    };
    return {
      ...base,
      scripts: [...base.scripts, { type: "application/ld+json", children: JSON.stringify(faq) }],
    };
  },
});

function FaqPage() {
  const { t } = useLocale();
  return (
    <InfoPage crumb={t("pub.faq.crumb")} title={t("pub.faq.title")} lead={t("pub.faq.lead")}>
      {QUESTIONS.map((n) => (
        <Card key={n} title={t(`pub.faq.${n}.q` as MessageKey)}>
          <p>{t(`pub.faq.${n}.a` as MessageKey)}</p>
        </Card>
      ))}
    </InfoPage>
  );
}
