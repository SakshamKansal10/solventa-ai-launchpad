import { createFileRoute } from "@tanstack/react-router";
import { Check, Minus } from "lucide-react";

import { BackLink, DirectionAction, useDirectionDetail } from "@/components/founder/dash/direction";
import { FitBar, kindOf, sortFactors } from "@/components/founder/dash/FitBar";
import { DashError, DashPage, DashSkeleton, Label, MistCard } from "@/components/founder/dash/ui";
import { useFitReasonText } from "@/components/founder/fit";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/opportunities/$id/fit")({
  component: FitPage,
  head: () => ({
    meta: [
      { title: "How it fits you | Solventia" },
      {
        name: "description",
        content: "The reason behind each fit factor for one business direction.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
});

/** How it fits you — the reason behind each of the five factors (from `assessFit`), what you
 * already bring, and what you would need to learn or accept. (The old Fit tab.) */
function FitPage() {
  const { id } = Route.useParams();
  const { t } = useLocale();
  const reasonText = useFitReasonText();
  const { query, dto, detail } = useDirectionDetail(id);

  if (query.isPending) return <DashSkeleton label={t("shell.skeleton.loading")} />;
  if (query.isError || !dto || !detail) {
    return <DashError onRetry={() => void query.refetch()} retrying={query.isFetching} />;
  }
  const { assessment } = dto.fit;
  const advantages = (
    detail.whyThisFounder.length > 0 ? detail.whyThisFounder : dto.fit.advantages
  ).slice(0, 4);
  const gaps = [
    ...detail.skillsToLearn.map((s) => t("opp.fit.learn", { skill: s })),
    ...detail.tradeoffs,
  ].slice(0, 4);
  const factors = sortFactors(assessment.factors);

  return (
    <DashPage data-testid="founder-fit">
      <div className="flex flex-col items-start gap-7">
        <BackLink to="/dashboard/opportunities/$id" params={{ id }}>
          {dto.brief.title}
        </BackLink>
        <h1 className="dash-headline">{t("v2.fit.title")}</h1>
        <p className="dash-lead max-w-[34em]" data-testid="fit-overall">
          <span className="font-medium text-sol-ink">
            {t(`fit2.label.${assessment.label}` as const)}.
          </span>{" "}
          {t(`fit2.body.${assessment.label}` as const)}
        </p>
        <FitBar
          factors={assessment.factors.map((f) => ({ key: f.key, score: f.score }))}
          className="max-w-[560px] [&_span]:h-4"
        />
      </div>

      <ul className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(420px,100%),1fr))]">
        {factors.map((row) => {
          const kind = kindOf(row.score);
          return (
            <MistCard as="li" key={row.key} data-testid={`fit-row-${row.key}`} className="gap-3">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="dash-statement !text-[clamp(22px,2vw,28px)]">
                  {t(`fit2.factor.${row.key}` as const)}
                </h2>
                <span
                  className={cn(
                    "text-[17px]",
                    kind === "gap" || kind === "critical"
                      ? "dash-warn-text font-semibold"
                      : "text-sol-muted",
                  )}
                >
                  {t(`fit2.level.${row.score ?? "unknown"}` as const)}
                </span>
              </div>
              <p className="dash-body">{reasonText(row.reason, dto.fit.currency)}</p>
            </MistCard>
          );
        })}
      </ul>

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(420px,100%),1fr))]">
        <MistCard>
          <Label>{t("opp.fit.advantages")}</Label>
          <ul className="flex flex-col gap-3">
            {advantages.map((a) => (
              <li key={a} className="flex gap-3 text-[19px] leading-snug text-sol-ink">
                <Check
                  className="mt-1 size-5 shrink-0 text-sol-champagne-deep"
                  strokeWidth={2.6}
                  aria-hidden="true"
                />
                {a}
              </li>
            ))}
          </ul>
        </MistCard>
        <MistCard>
          <Label>{t("opp.fit.gaps")}</Label>
          {gaps.length === 0 ? (
            <p className="dash-body">{t("opp.fit.noGaps")}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {gaps.map((g) => (
                <li key={g} className="flex gap-3 text-[19px] leading-snug text-sol-ink">
                  <Minus
                    className="mt-1 size-5 shrink-0 text-sol-warning"
                    strokeWidth={2.6}
                    aria-hidden="true"
                  />
                  {g}
                </li>
              ))}
            </ul>
          )}
        </MistCard>
      </div>

      <DirectionAction dto={dto} />
    </DashPage>
  );
}
