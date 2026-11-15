import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

import { BackLink, DirectionAction, useDirectionDetail } from "@/components/founder/dash/direction";
import { EstimateTag } from "@/components/founder/dash/Estimate";
import { hasNumber } from "@/lib/market/number-kind";
import { FitSummaryCard } from "@/components/founder/dash/FitBar";
import {
  DashError,
  DashPage,
  DashSkeleton,
  Label,
  LinkRow,
  MistCard,
  NavyBlock,
  Tag,
} from "@/components/founder/dash/ui";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { useFounderState } from "@/lib/queries";

export const Route = createFileRoute("/dashboard/opportunities/$id/")({
  // Old deep links (`?tab=fit|market`) land on the sub-pages that replaced the tabs.
  validateSearch: z.object({
    tab: z.enum(["overview", "fit", "market"]).optional().catch(undefined),
  }),
  beforeLoad: ({ search, params }) => {
    if (search.tab === "fit")
      throw redirect({ to: "/dashboard/opportunities/$id/fit", params, replace: true });
    if (search.tab === "market")
      throw redirect({ to: "/dashboard/opportunities/$id/market", params, replace: true });
  },
  component: DirectionPage,
  head: () => ({
    meta: [
      { title: "Direction | Solventia" },
      {
        name: "description",
        content: "One business direction: who it serves, how it fits you, and its first test.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
});

/**
 * Direction detail — "Is this right for me?" (screen 4). The name, one paragraph, the one
 * primary action that follows state, the fit summary beside it; the idea in four lines; the
 * first test on navy; and two rows to the sub-pages that hold the depth (fit reasons, market
 * and sources, how it's delivered, more detail).
 */
function DirectionPage() {
  const { id } = Route.useParams();
  const { t } = useLocale();
  const founder = useFounderState();
  const { query, dto, detail } = useDirectionDetail(id);

  if (query.isPending) return <DashSkeleton label={t("shell.skeleton.loading")} />;
  if (query.isError || !dto || !detail) {
    return <DashError onRetry={() => void query.refetch()} retrying={query.isFetching} />;
  }
  const recommended =
    !founder.data?.direction.selectedId && founder.data?.direction.flagshipId === id;
  const lines = [
    { key: "customer", label: t("v2.detail.customer"), value: detail.customerHeadline },
    { key: "problem", label: t("v2.card.problem"), value: detail.problemHeadline },
    { key: "offer", label: t("v2.detail.offer"), value: detail.solutionHeadline },
    { key: "earn", label: t("v2.detail.earn"), value: detail.moneyHeadline },
  ].filter((l) => l.value);
  const projected = hasNumber(detail.revenuePath);

  return (
    <DashPage className="sm:gap-8" data-testid="opportunity-page">
      <section aria-labelledby="opportunity-title" className="flex flex-wrap items-end gap-10 pb-4">
        <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-7">
          <BackLink to="/dashboard/opportunities">{t("v2.detail.back")}</BackLink>
          <div className="flex flex-wrap items-center gap-2.5">
            {dto.isSelected ? (
              <Tag tone="ink">{t("v2.today.chosen.tag")}</Tag>
            ) : recommended ? (
              <Tag tone="ink">{t("v2.dir.recommended")}</Tag>
            ) : null}
            <Tag>{t(`fit2.label.${dto.fit.assessment.label}` as const)}</Tag>
            {!dto.isCurrentConsultation && <Tag>{t("opp.status.previous")}</Tag>}
          </div>
          <h1
            id="opportunity-title"
            className="dash-headline max-w-[15em]"
            data-testid="opportunity-title"
          >
            {dto.brief.title}
          </h1>
          {(detail.summary || dto.brief.oneLiner) && (
            <p className="dash-lead max-w-[34em]">{detail.summary || dto.brief.oneLiner}</p>
          )}
          <DirectionAction dto={dto} />
        </div>
        <FitSummaryCard
          factors={dto.fit.assessment.factors.map((f) => ({ key: f.key, score: f.score }))}
          className="flex-[1_1_340px]"
        />
      </section>

      {lines.length > 0 && (
        <section
          aria-label={t("v2.detail.fourLines")}
          className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(480px,100%),1fr))]"
        >
          {lines.map((l) => (
            <MistCard key={l.key} as="div" className="gap-3.5" data-testid={`block-${l.key}`}>
              <Label>{l.label}</Label>
              <p className="dash-statement">{l.value}</p>
              {l.key === "earn" && hasNumber(l.value) && <EstimateTag />}
            </MistCard>
          ))}
        </section>
      )}

      {(detail.firstExperiment || detail.revenuePath) && (
        <NavyBlock
          aria-labelledby="first-test"
          className="flex-row flex-wrap items-start gap-10 p-[clamp(28px,4vw,56px)]"
          data-testid="first-test"
        >
          {detail.firstExperiment && (
            <div className="flex min-w-0 flex-[999_1_520px] flex-col gap-[18px]">
              <h2 id="first-test" className="dash-label !text-white/75">
                {t("v2.detail.firstTest")}
              </h2>
              <p
                className="font-display text-[clamp(26px,2.6vw,38px)] font-medium leading-[1.18] tracking-[-0.02em]"
                style={{ textWrap: "pretty" }}
              >
                {detail.firstExperiment}
              </p>
            </div>
          )}
          {detail.revenuePath && (
            <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-3.5">
              <h2 className="dash-label !text-white/75">{t("v2.detail.whereItGoes")}</h2>
              <p className="text-[20px] leading-[1.45]">{detail.revenuePath}</p>
              {projected && <EstimateTag onNavy />}
            </div>
          )}
        </NavyBlock>
      )}

      <nav
        aria-label={t("v2.detail.more")}
        className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(480px,100%),1fr))]"
      >
        <LinkRow
          to="/dashboard/opportunities/$id/fit"
          params={{ id }}
          title={t("v2.fit.title")}
          note={t("v2.detail.fitNote")}
          data-testid="link-fit"
        />
        <LinkRow
          to="/dashboard/opportunities/$id/market"
          params={{ id }}
          title={t("v2.market.title")}
          note={t("v2.detail.marketNote")}
          data-testid="link-market"
        />
      </nav>
    </DashPage>
  );
}
