import { createFileRoute, Link } from "@tanstack/react-router";

import { Card, InfoPage, infoHead } from "@/components/solventia/InfoPage";
import { getSiteUrl } from "@/lib/actions/site-url.server";
import type { MessageKey } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export const Route = createFileRoute("/ideas")({
  component: IdeasPage,
  loader: () => getSiteUrl(),
  head: ({ loaderData }) =>
    infoHead(
      loaderData,
      "/ideas",
      "Business idea examples",
      "Examples of business directions Solventia built for sample founders in India — each with a customer, an offer and a first test for this week.",
    ),
});

/** Real directions the idea engine wrote for sample founders (docs/redesign/engine-compare.json),
 * shown as examples — never as advice for the reader. */
const EXAMPLES = ["clinics", "farm", "tailoring", "student", "gst"] as const;

function IdeasPage() {
  const { t } = useLocale();
  return (
    <InfoPage crumb={t("pub.ideas.crumb")} title={t("pub.ideas.title")} lead={t("pub.ideas.lead")}>
      <p className="text-[15px] font-semibold uppercase tracking-[0.08em] text-sol-secondary">
        {t("pub.ideas.label")}
      </p>
      {EXAMPLES.map((k) => (
        <Card key={k} title={t(`pub.ideas.${k}.title` as MessageKey)}>
          <p>
            <span className="font-medium text-sol-ink">{t("pub.ideas.for")} </span>
            {t(`pub.ideas.${k}.who` as MessageKey)}
          </p>
          <p>{t(`pub.ideas.${k}.what` as MessageKey)}</p>
          <p>
            <span className="font-medium text-sol-ink">{t("pub.ideas.test")} </span>
            {t(`pub.ideas.${k}.test` as MessageKey)}
          </p>
        </Card>
      ))}
      <p className="text-[17px] text-sol-secondary">
        {t("pub.ideas.yours")}{" "}
        <Link
          to="/find-my-business-idea"
          className="font-semibold text-sol-cobalt-deep hover:underline"
        >
          {t("pub.ideas.cta")}
        </Link>
      </p>
    </InfoPage>
  );
}
