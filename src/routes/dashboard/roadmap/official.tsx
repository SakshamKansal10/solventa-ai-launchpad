import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink } from "lucide-react";

import {
  DashError,
  DashPage,
  DashSkeleton,
  Label,
  MistCard,
  QuietRow,
  Tag,
} from "@/components/founder/dash/ui";
import {
  isStepNeeded,
  isStepPublished,
  MINOR_NOTE,
  OFFICIAL_STEPS,
  type OfficialStep,
  type PhaseKey,
} from "@/content/make-official";
import { getOfficialGuideProfile } from "@/lib/actions/official";
import { getRoadmapView } from "@/lib/actions/roadmap";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { qk, useFounderState } from "@/lib/queries";

export const Route = createFileRoute("/dashboard/roadmap/official")({
  component: MakeItOfficialPage,
  head: () => ({
    meta: [
      { title: "Make it official | Solventia" },
      {
        name: "description",
        content:
          "Formalising a small business in India: structure, Udyam registration, a current account and GST.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
});

/** The roadmap's current phase key, or null without an active roadmap. */
function useCurrentPhaseKey() {
  const founder = useFounderState();
  const roadmapId = founder.data?.direction.roadmap?.id ?? null;
  const roadmap = useQuery({
    queryKey: qk.roadmap(roadmapId),
    queryFn: () => getRoadmapView({ data: { roadmapId: roadmapId! } }),
    enabled: Boolean(roadmapId),
    staleTime: 10_000,
  });
  const view = roadmap.data;
  const key = view?.phases.find((p) => p.id === view.currentPhaseId)?.key ?? null;
  return {
    pending: founder.isPending || (Boolean(roadmapId) && roadmap.isPending),
    error: founder.isError,
    retry: () => void founder.refetch(),
    phase: (key as PhaseKey | null) ?? null,
  };
}

/**
 * Make it official (screen 9). Reviewed static content (src/content/make-official.ts), never
 * generated. Every step is visible from the start and says "Not needed yet" until the roadmap
 * reaches its phase; a step the owner has not reviewed shows "Being reviewed" instead of its
 * content; the footer line is always there.
 */
function MakeItOfficialPage() {
  const { t, locale } = useLocale();
  const current = useCurrentPhaseKey();
  const profile = useQuery({
    queryKey: ["official-guide-profile"],
    queryFn: () => getOfficialGuideProfile(),
    staleTime: 5 * 60_000,
  });
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(locale === "hi" ? "hi-IN" : "en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  if (current.pending) return <DashSkeleton label={t("shell.skeleton.loading")} />;
  if (current.error) return <DashError onRetry={current.retry} />;

  return (
    <DashPage data-testid="official-page">
      <div className="flex flex-col items-start gap-7">
        <Link
          to="/dashboard/roadmap"
          className="inline-flex min-h-11 items-center gap-2.5 self-start rounded-full text-[18px] font-medium text-sol-cobalt-deep hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sol-cobalt"
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
          {t("v2.official.back")}
        </Link>
        <h1 className="dash-headline">{t("v2.rm.official")}</h1>
        <p className="dash-lead max-w-[36em]">{t("v2.official.lead")}</p>
      </div>

      {profile.data?.under18 && (
        <QuietRow className="border-0 bg-sol-pearl" data-testid="official-minor">
          <p className="flex-[1_1_420px] text-[20px] leading-[1.45] text-sol-ink">
            {MINOR_NOTE.reviewed && MINOR_NOTE.lastChecked
              ? MINOR_NOTE.text[locale]
              : t("v2.official.minorSafe")}
          </p>
        </QuietRow>
      )}

      <ol className="flex flex-col gap-4">
        {OFFICIAL_STEPS.map((step, i) => (
          <StepCard
            key={step.id}
            step={step}
            n={i + 1}
            needed={isStepNeeded(step, current.phase)}
            formatDate={formatDate}
          />
        ))}
      </ol>

      <p className="dash-meta border-t border-sol-border pt-6" data-testid="official-footer">
        {t("v2.official.footer")}
      </p>
    </DashPage>
  );
}

function StepCard({
  step,
  n,
  needed,
  formatDate,
}: {
  step: OfficialStep;
  n: number;
  needed: boolean;
  formatDate: (iso: string) => string;
}) {
  const { t, locale } = useLocale();
  const text = step.text[locale];
  const published = isStepPublished(step);
  return (
    <MistCard
      as="li"
      className="gap-5"
      data-testid={`official-step-${step.id}`}
      data-needed={needed ? "true" : "false"}
      data-reviewed={published ? "true" : "false"}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="dash-statement flex items-baseline gap-3">
          <span className="text-sol-muted" aria-hidden="true">
            {n}.
          </span>
          {text.title}
        </h2>
        <span className="flex flex-wrap gap-2">
          <Tag tone={needed ? "ink" : "outline"}>
            {needed ? t("v2.official.needed") : t("v2.official.notYet")}
          </Tag>
          {!published && <Tag tone="warning">{t("v2.official.reviewing")}</Tag>}
        </span>
      </div>

      {!published ? (
        <p className="dash-body text-sol-secondary">{t("v2.official.reviewingNote")}</p>
      ) : (
        <>
          <p className="dash-body text-sol-ink">{text.summary}</p>
          <div className="flex flex-col gap-2">
            <Label as="h3">{t("v2.official.when")}</Label>
            <p className="dash-body text-sol-ink">{text.when}</p>
          </div>
          <div className="flex flex-col gap-2">
            <Label as="h3">{t("v2.official.documents")}</Label>
            <ul className="flex list-disc flex-col gap-1.5 pl-6 text-[19px] leading-snug text-sol-ink">
              {text.documents.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-2">
            <Label as="h3">{t("v2.official.steps")}</Label>
            <ol className="flex list-decimal flex-col gap-1.5 pl-6 text-[19px] leading-snug text-sol-ink">
              {text.steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <a
              href={step.officialUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex min-h-11 items-center gap-2 text-[18px] font-semibold text-sol-cobalt-deep hover:underline"
            >
              {t("v2.official.open", { site: step.officialName })}
              <ExternalLink className="size-4" aria-hidden="true" />
            </a>
            {step.lastChecked && (
              <span className="dash-meta" data-testid="official-checked">
                {t("v2.official.checked", { date: formatDate(step.lastChecked) })}
              </span>
            )}
          </div>
        </>
      )}
    </MistCard>
  );
}
