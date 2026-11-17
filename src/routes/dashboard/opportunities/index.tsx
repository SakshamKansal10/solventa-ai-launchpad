import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

import { FitBar, FitLegend, kindOf, useFitCounts } from "@/components/founder/dash/FitBar";
import {
  ContradictionRow,
  FitQuestionsPanel,
  useFitQuestions,
} from "@/components/founder/dash/FitQuestions";
import {
  ActionButton,
  ActionLink,
  Arrow,
  DashError,
  DashPage,
  DashSkeleton,
  QuietRow,
} from "@/components/founder/dash/ui";
import type { OpportunityBrief } from "@/lib/actions/founder";
import { getGenerationJob } from "@/lib/actions/opportunities";
import type { FitFactorKey } from "@/lib/fit/model";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { useFounderState } from "@/lib/queries";
import { useTranslatedBrief } from "@/lib/use-translation";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/opportunities/")({
  validateSearch: z.object({ consultation: z.string().uuid().optional() }),
  component: DirectionsPage,
  head: () => ({
    meta: [
      { title: "Directions | Solventia" },
      {
        name: "description",
        content: "The business directions found for you, and how each one fits.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
});

/**
 * Directions — "Which one?" (screen 3). One card per direction, the recommended (or chosen)
 * one first on navy. Each card: number, name, one sentence, the fit bar, the overall fit label
 * with counts, the single strongest reason, and one button: Open direction. Choosing happens
 * on the direction's own page only.
 */
function DirectionsPage() {
  const { t, locale } = useLocale();
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(locale === "hi" ? "hi-IN" : "en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  const founder = useFounderState();
  const navigate = useNavigate();
  const [asking, setAsking] = useState(false);
  // "Find 3 more directions" disables at the first tap (Job N); a job already running shows its
  // progress instead of the button.
  const [finding, setFinding] = useState(false);
  const job = useQuery({
    queryKey: ["generation-job"],
    queryFn: () => getGenerationJob(),
    staleTime: 5_000,
  });
  const jobRunning = job.data?.status === "running";
  // Questions and contradictions are about the latest consultation (answers are saved there).
  const latest = founder.data?.direction.isLatestConsultation ?? false;
  const questions = useFitQuestions(latest);

  if (founder.isPending) return <DashSkeleton label={t("shell.skeleton.loading")} />;
  if (founder.isError || !founder.data) {
    return <DashError onRetry={() => void founder.refetch()} retrying={founder.isFetching} />;
  }

  const { direction, briefs, viewedConsultationAt } = founder.data;
  const allInView = Object.values(briefs)
    .filter((b) => b.consultationId === direction.consultationId && b.status !== "dismissed")
    .sort((a, b) => direction.viewedIds.indexOf(a.id) - direction.viewedIds.indexOf(b.id));
  // The newest set (Job N: "Find 3 more" adds a set; earlier sets stay under History). A chosen
  // direction from an earlier set stays here, leading.
  const latestBatch = Math.max(1, ...allInView.map((b) => b.batch));
  const inView = allInView.filter((b) => b.batch === latestBatch || b.id === direction.selectedId);
  const hasEarlierSets = latestBatch > 1;
  // The chosen direction leads; before a choice, the recommended one does (in the newest set,
  // the first of it).
  const leadId =
    direction.selectedId ??
    (inView.some((b) => b.id === direction.flagshipId) ? direction.flagshipId : inView[0]?.id);
  const ordered = [
    ...inView.filter((b) => b.id === leadId),
    ...inView.filter((b) => b.id !== leadId),
  ];

  if (ordered.length === 0) {
    return (
      <DashPage data-testid="opportunities-page">
        <h1 className="dash-headline max-w-[15em]">{t("v2.today.none.title")}</h1>
        <p className="dash-lead max-w-[32em]">{t("v2.today.none.lead")}</p>
        <ActionLink to="/consultation" className="self-start">
          {t("v2.today.none.cta")}
        </ActionLink>
      </DashPage>
    );
  }

  // A factor no direction could assess is worth asking about (one nudge, not one per card).
  const unknownEverywhere = (
    ["capability", "access", "resources", "time", "goals"] as FitFactorKey[]
  ).find((key) =>
    ordered.every((b) =>
      b.fitFactors
        ? kindOf(b.fitFactors.find((f) => f.key === key)?.score ?? null) === "unknown"
        : false,
    ),
  );
  const canExplore = direction.isLatestConsultation;
  const askable = canExplore && (questions.data?.missing.length ?? 0) > 0;

  return (
    <DashPage data-testid="opportunities-page">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex min-w-0 flex-col gap-[18px]">
          <h1 className="dash-headline">
            {direction.selectedId
              ? t("v2.dir.titleChosen", { n: ordered.length })
              : t("v2.dir.title", { n: ordered.length })}
          </h1>
          <p className="dash-lead max-w-[36em]">
            {viewedConsultationAt
              ? t("v2.dir.builtFrom", { date: formatDate(viewedConsultationAt) })
              : t("v2.dir.builtFromNoDate")}
          </p>
        </div>
        <FitLegend />
      </div>

      <ol className="grid items-stretch gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(360px,100%),1fr))]">
        {ordered.map((b, i) => (
          <li key={b.id} className="flex">
            <DirectionCard
              brief={b}
              index={i}
              lead={b.id === leadId}
              chosen={b.id === direction.selectedId}
            />
          </li>
        ))}
      </ol>

      {canExplore && (
        <section
          aria-labelledby="find-more-title"
          data-testid="find-more"
          className="flex flex-wrap items-center justify-between gap-6 rounded-[32px] border border-sol-border bg-white p-[clamp(24px,2.6vw,36px)]"
        >
          <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-2">
            <h2 id="find-more-title" className="dash-statement">
              {t("v2.dir.more.title")}
            </h2>
            <p className="dash-body text-sol-secondary">{t("gen.more.note")}</p>
            {hasEarlierSets && (
              <p className="dash-meta">
                {t("gen.earlier")}{" "}
                <Link
                  to="/dashboard/history"
                  className="font-medium text-sol-cobalt-deep underline-offset-4 hover:underline"
                  data-testid="earlier-directions"
                >
                  {t("gen.earlier.link")}
                </Link>
              </p>
            )}
          </div>
          {jobRunning ? (
            <ActionLink
              to="/dashboard/directions/finding"
              search={{ kind: job.data?.kind === "refresh" ? "refresh" : "more" }}
              data-testid="find-more-running"
            >
              {t("gen.more.running")}
            </ActionLink>
          ) : (
            <ActionButton
              onClick={() => {
                if (finding) return;
                setFinding(true);
                void navigate({
                  to: "/dashboard/directions/finding",
                  search: { kind: "more", start: true },
                });
              }}
              disabled={finding}
              loading={finding}
              data-testid="explore-more-generate"
            >
              {t("gen.more.cta")}
            </ActionButton>
          )}
        </section>
      )}

      <div className="flex flex-col gap-3">
        {canExplore && <ContradictionRow items={questions.data?.contradictions ?? []} />}
        {unknownEverywhere && !asking && (
          // Ask what is missing (part 4, feature 5): two to four questions for exactly the empty
          // answers, inline; on an older consultation, Settings → Founder profile.
          <QuietRow className="border-0 bg-sol-ivory" data-testid="fit-nudge">
            <p className="flex-[1_1_420px] text-[20px] leading-[1.4] text-sol-ink">
              <span className="font-semibold">
                {t("v2.dir.nudge.title", {
                  factor: t(`fit2.factor.${unknownEverywhere}` as const),
                  n: ordered.length,
                })}
              </span>{" "}
              <span className="text-sol-secondary">{t("v2.dir.nudge.body")}</span>
            </p>
            {askable ? (
              <ActionButton
                tone="secondary"
                size="md"
                arrow={false}
                onClick={() => setAsking(true)}
                data-testid="fit-nudge-open"
              >
                {t("v2.dir.nudge.cta")}
              </ActionButton>
            ) : (
              <ActionLink to="/dashboard/settings" tone="secondary" size="md">
                {t("v2.dir.nudge.cta")}
              </ActionLink>
            )}
          </QuietRow>
        )}
        {asking && questions.data && questions.data.missing.length > 0 && (
          <FitQuestionsPanel data={questions.data} onDone={() => setAsking(false)} />
        )}
      </div>
    </DashPage>
  );
}

function DirectionCard({
  brief: raw,
  index,
  lead,
  chosen,
}: {
  brief: OpportunityBrief;
  index: number;
  lead: boolean;
  chosen: boolean;
}) {
  const { t } = useLocale();
  const brief = useTranslatedBrief(raw) ?? raw;
  const counts = useFitCounts();
  const reason = brief.whyFit[0] ?? null;
  return (
    <article
      data-testid={chosen ? "opp-selected" : "opp-alternative"}
      data-lead={lead || undefined}
      aria-labelledby={`dir-${raw.id}`}
      className={cn(
        "flex w-full min-w-0 flex-col gap-[22px] rounded-[36px] p-[clamp(24px,2.6vw,36px)]",
        lead ? "bg-sol-navy text-white" : "bg-sol-ivory text-sol-ink",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <span
          aria-hidden="true"
          className="font-display text-[44px] font-medium leading-[0.9] tracking-[-0.04em]"
        >
          {String(index + 1).padStart(2, "0")}
        </span>
        {lead && (
          <span className="inline-flex min-h-9 items-center rounded-full bg-white px-3.5 text-[15px] font-semibold text-sol-ink">
            {chosen ? t("v2.today.chosen.tag") : t("v2.dir.recommended")}
          </span>
        )}
      </div>
      <h2
        id={`dir-${raw.id}`}
        className="font-display text-[clamp(26px,2.4vw,32px)] font-medium leading-[1.08] tracking-[-0.02em]"
        style={{ textWrap: "balance" }}
      >
        {brief.title}
      </h2>
      {brief.oneLiner && (
        <p
          className={cn("text-[18px] leading-[1.5]", lead ? "text-white/75" : "text-sol-secondary")}
        >
          {brief.oneLiner}
        </p>
      )}
      <div className="flex flex-col gap-2.5">
        {raw.fitFactors && <FitBar factors={raw.fitFactors} onNavy={lead} />}
        <p className="text-[17px] font-semibold" data-testid="fit-label">
          {t(`fit2.label.${brief.fit}` as const)}
          {raw.fitFactors && (
            <span className={cn("font-normal", lead ? "text-white/75" : "text-sol-secondary")}>
              {" · "}
              {counts(raw.fitFactors)}
            </span>
          )}
        </p>
      </div>
      {reason && (
        <p className="flex items-start gap-3 text-[17px] leading-[1.45]">
          <Check className="mt-0.5 size-[22px] shrink-0" strokeWidth={2.4} aria-hidden="true" />
          <span className="min-w-0">{reason}</span>
        </p>
      )}
      <Link
        to="/dashboard/opportunities/$id"
        params={{ id: raw.id }}
        data-testid="open-direction"
        aria-label={`${t("v2.dir.open")}: ${brief.title}`}
        className={cn(
          "mt-auto inline-flex min-h-[62px] items-center justify-center gap-3 rounded-full px-7 text-[19px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
          lead
            ? "bg-white text-sol-ink hover:bg-sol-ivory focus-visible:outline-white"
            : "border border-sol-ink/35 text-sol-ink hover:border-sol-ink/60 focus-visible:outline-sol-cobalt",
        )}
      >
        {t("v2.dir.open")}
        <Arrow />
      </Link>
    </article>
  );
}
