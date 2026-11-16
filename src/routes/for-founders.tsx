import { createFileRoute, Link } from "@tanstack/react-router";

import { Card, InfoPage, infoHead } from "@/components/solventia/InfoPage";
import { getSiteUrl } from "@/lib/actions/site-url.server";
import type { MessageKey } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export const Route = createFileRoute("/for-founders")({
  component: ForFoundersPage,
  loader: () => getSiteUrl(),
  head: ({ loaderData }) =>
    infoHead(
      loaderData,
      "/for-founders",
      "For founders",
      "Want to start but don't know what, have an idea and wonder if it will work, or started and got stuck — what Solventia does in each case.",
    ),
});

/** The three situations of the opening question, "What brings you here?". */
const SITUATIONS = ["start", "idea", "stuck"] as const;

function ForFoundersPage() {
  const { t } = useLocale();
  return (
    <InfoPage
      crumb={t("pub.founders.crumb")}
      title={t("pub.founders.title")}
      lead={t("pub.founders.lead")}
    >
      {SITUATIONS.map((s) => (
        <Card key={s} title={t(`v2.intro.c.${s}` as MessageKey)}>
          <p className="font-medium text-sol-ink">{t(`v2.intro.a.${s}` as MessageKey)}</p>
          <p>{t(`pub.founders.${s}` as MessageKey)}</p>
        </Card>
      ))}
      <Link
        to="/find-my-business-idea"
        className="inline-flex min-h-14 items-center self-start rounded-full bg-sol-navy px-8 text-[17px] font-semibold text-white hover:bg-sol-navy-soft"
      >
        {t("pub.founders.cta")}
      </Link>
    </InfoPage>
  );
}
