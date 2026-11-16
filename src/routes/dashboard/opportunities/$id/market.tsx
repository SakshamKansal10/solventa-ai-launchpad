import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { BackLink, useDirectionDetail } from "@/components/founder/dash/direction";
import { EstimateTag } from "@/components/founder/dash/Estimate";
import {
  ActionButton,
  ActionLink,
  DashError,
  DashPage,
  DashSkeleton,
  Label,
  MistCard,
  Tag,
} from "@/components/founder/dash/ui";
import { refreshMarketEvidence } from "@/lib/actions/opportunities";
import type { MessageKey } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { hasNumber } from "@/lib/market/number-kind";
import { useInvalidateFounder } from "@/lib/queries";

export const Route = createFileRoute("/dashboard/opportunities/$id/market")({
  component: MarketPage,
  head: () => ({
    meta: [
      { title: "Market and sources | Solventia" },
      {
        name: "description",
        content:
          "What is known about one direction's market, what is an estimate, and the sources.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
});

/** Market and sources — what is known, what is an estimate, and where it comes from; the
 * validation plan; how it's delivered; and the longer lines behind the four headlines. (The old
 * Market tab, the "More detail" expanders and "How it's delivered".) */
function MarketPage() {
  const { id } = Route.useParams();
  const { t, locale } = useLocale();
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(locale === "hi" ? "hi-IN" : "en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  const invalidate = useInvalidateFounder();
  const { query, dto, detail } = useDirectionDetail(id);
  const research = useMutation({
    mutationFn: () => refreshMarketEvidence({ data: { opportunityId: id } }),
    onSuccess: async (res) => {
      await invalidate();
      toast.success(t("opp.market.found", { n: res.count }));
    },
    onError: (err) => {
      console.error("[market] research failed:", err);
      toast.error(t("opp.market.error"));
    },
  });

  if (query.isPending) return <DashSkeleton label={t("shell.skeleton.loading")} />;
  if (query.isError || !dto || !detail) {
    return <DashError onRetry={() => void query.refetch()} retrying={query.isFetching} />;
  }
  const hasSources = dto.sources.length > 0;
  const more = [
    { key: "customer", label: t("v2.detail.customer"), value: detail.customer },
    { key: "problem", label: t("v2.card.problem"), value: detail.problem },
    { key: "offer", label: t("v2.detail.offer"), value: detail.solution },
    { key: "earn", label: t("v2.detail.earn"), value: detail.businessModel },
  ].filter((m) => m.value);

  return (
    <DashPage data-testid="market-tab">
      <div className="flex flex-col items-start gap-7">
        <BackLink to="/dashboard/opportunities/$id" params={{ id }}>
          {dto.brief.title}
        </BackLink>
        <h1 className="dash-headline">{t("v2.market.title")}</h1>
        <p className="dash-lead max-w-[34em]">
          {hasSources
            ? t("v2.market.leadSources")
            : `${t("opp.market.none")} ${t("opp.market.noneBody")}`}
        </p>
        <div className="flex flex-wrap items-center gap-3.5">
          <ActionButton
            onClick={() => research.mutate()}
            loading={research.isPending}
            data-testid="look-for-sources"
          >
            {hasSources ? t("opp.market.refresh") : t("opp.market.lookFor")}
          </ActionButton>
          <span className="dash-meta max-w-[28em]">{t("opp.market.sourcesNote")}</span>
        </div>
      </div>

      {hasSources && (
        <section aria-labelledby="sources-h" className="flex flex-col gap-4">
          <h2 id="sources-h" className="dash-label">
            {t("opp.market.sourcesTitle")}
          </h2>
          <ul className="flex flex-col gap-3">
            {dto.sources.map((s) => (
              <MistCard
                as="li"
                key={s.id}
                className="gap-3"
                data-kind={s.kind}
                data-testid="market-claim"
              >
                <p className="text-[20px] leading-snug text-sol-ink">{s.claim}</p>
                <div className="flex flex-wrap items-center gap-3">
                  <Tag
                    tone={
                      s.label === "needs_validation" || s.label === "limited_evidence"
                        ? "warning"
                        : "outline"
                    }
                  >
                    {t(`opp.market.label.${s.label}` as const)}
                  </Tag>
                  {s.kind === "sourced" && s.sourceUrl ? (
                    <>
                      <a
                        href={s.sourceUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex min-h-11 items-center gap-2 text-[17px] font-semibold text-sol-cobalt-deep hover:underline"
                      >
                        {s.sourceTitle ?? s.sourceUrl}
                        <ExternalLink className="size-4" aria-hidden="true" />
                      </a>
                      {s.retrievedAt && (
                        <span className="dash-meta" data-testid="source-date">
                          {t("v2.est.checked", { date: formatDate(s.retrievedAt) })}
                        </span>
                      )}
                    </>
                  ) : (
                    <EstimateTag />
                  )}
                </div>
              </MistCard>
            ))}
          </ul>
        </section>
      )}

      <MistCard data-testid="validation-plan">
        <h2 className="dash-statement">
          {detail.criticalAssumptions.length > 0 ? t("opp.plan.title") : t("opp.market.learnTitle")}
        </h2>
        {detail.criticalAssumptions.length > 0 ? (
          <>
            <p className="dash-body">{t("opp.plan.note")}</p>
            <Label as="h3">{t("opp.plan.assumptions")}</Label>
            <ol className="flex flex-col gap-3">
              {detail.criticalAssumptions.map((a, i) => (
                <li
                  key={a}
                  className="flex flex-wrap items-start gap-x-3 gap-y-2 text-[19px] leading-snug text-sol-ink"
                >
                  <span className="font-semibold text-sol-muted" aria-hidden="true">
                    {i + 1}.
                  </span>
                  <span className="min-w-0 flex-1 basis-60">{a}</span>
                  <Tag>
                    {t(
                      `pf.category.${detail.criticalAssumptionCategories[i] ?? "other"}` as MessageKey,
                    )}
                  </Tag>
                </li>
              ))}
            </ol>
            {detail.successCriteria.length > 0 && (
              <>
                <Label as="h3">{t("opp.plan.success")}</Label>
                <ul className="flex flex-col gap-2.5">
                  {detail.successCriteria.map((c) => (
                    <li key={c} className="flex gap-3 text-[19px] leading-snug text-sol-ink">
                      <Check
                        className="mt-1 size-5 shrink-0 text-sol-champagne-deep"
                        aria-hidden="true"
                      />
                      {c}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {detail.reconsiderIf.length > 0 && (
              <>
                <Label as="h3">{t("opp.plan.reconsider")}</Label>
                <ul className="flex flex-col gap-2.5">
                  {detail.reconsiderIf.map((c) => (
                    <li key={c} className="flex gap-3 text-[19px] leading-snug text-sol-ink">
                      <span
                        className="mt-2.5 size-2 shrink-0 rounded-full bg-sol-warning"
                        aria-hidden="true"
                      />
                      {c}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {(["q1", "q2", "q3"] as const).map((q) => (
              <li key={q} className="text-[19px] leading-snug text-sol-ink">
                {t(`opp.market.${q}` as const)}
              </li>
            ))}
          </ul>
        )}
        <ActionLink
          to="/dashboard/proof"
          search={{ opportunity: id }}
          tone="secondary"
          size="md"
          className="self-start"
          data-testid="start-validation"
        >
          {t("opp.market.start")}
        </ActionLink>
      </MistCard>

      {detail.deliveryModel && (
        <MistCard data-testid="block-delivery">
          <Label>{t("opp.ov.delivery")}</Label>
          <p className="dash-statement">{detail.deliveryModel}</p>
        </MistCard>
      )}

      {more.length > 0 && (
        <section aria-labelledby="more-h" className="flex flex-col gap-4">
          <h2 id="more-h" className="dash-label">
            {t("v2.market.moreDetail")}
          </h2>
          <dl className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(420px,100%),1fr))]">
            {more.map((m) => (
              <MistCard as="div" key={m.key} className="gap-2.5">
                <dt className="dash-label">{m.label}</dt>
                <dd className="dash-body flex flex-col items-start gap-3 text-sol-ink">
                  <span>{m.value}</span>
                  {m.key === "earn" && hasNumber(m.value) && <EstimateTag />}
                </dd>
              </MistCard>
            ))}
          </dl>
        </section>
      )}
    </DashPage>
  );
}
