import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Compass, Users } from "lucide-react";

import { FitStrip } from "@/components/founder/dashboard/fit-visual";
import { FitPill } from "@/components/founder/OpportunityCards";
import {
  Button,
  Card,
  EmptyState,
  ErrorPanel,
  LinkButton,
  PageHeader,
  PageSkeleton,
  Pill,
  Skeleton,
} from "@/components/founder/ui";
import type { OpportunityBrief } from "@/lib/actions/founder";
import {
  chooseDirection,
  exploreMoreOpportunities,
  getDirectionFits,
} from "@/lib/actions/opportunities";
import type { FitMatrix } from "@/lib/fit/matrix";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { qk, useFounderState, useInvalidateFounder } from "@/lib/queries";
import { useTranslatedBrief } from "@/lib/use-translation";
import { z } from "zod";

export const Route = createFileRoute("/dashboard/opportunities/")({
  validateSearch: z.object({ consultation: z.string().uuid().optional() }),
  component: OpportunitiesPage,
  head: () => ({
    meta: [{ title: "Opportunities — Solventia" }, { name: "robots", content: "noindex" }],
  }),
});

type Section = "selected" | "alternative" | "previous";

/** Title, who it is for, the four fit rows as a strip, and status. The fit strip is
 * drawn from the same deterministic matrix as the opportunity page. */
function OpportunityRow({
  brief: raw,
  section,
  onChoose,
  choosing,
  canChoose,
  matrix,
  fitLoading,
}: {
  brief: OpportunityBrief;
  section: Section;
  onChoose?: () => void;
  choosing?: boolean;
  canChoose: boolean;
  /** Undefined for rows that do not show fit (earlier consultations). */
  matrix?: FitMatrix | null;
  fitLoading?: boolean;
}) {
  const { t } = useLocale();
  const brief = useTranslatedBrief(raw) ?? raw;
  return (
    <Card
      as="article"
      className="flex flex-col gap-4 p-6 md:flex-row md:items-start md:justify-between"
      data-testid={`opp-${section}`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <h3 className="sol-h3">{brief.title}</h3>
          {section === "selected" ? (
            <Pill tone="violet">{t("opp.status.selected")}</Pill>
          ) : section === "previous" ? (
            <Pill tone="neutral">
              {brief.status === "dismissed" ? t("opp.status.dismissed") : t("opp.status.previous")}
            </Pill>
          ) : (
            <FitPill fit={brief.fit} />
          )}
        </div>
        {brief.customer && (
          <p className="mt-3 flex items-start gap-3 text-[1.0625rem] leading-snug text-sol-ink">
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-sol-champagne-soft text-sol-champagne-deep">
              <Users className="size-4" aria-hidden="true" />
            </span>
            <span className="line-clamp-2 min-w-0">
              <span className="sr-only">{t("opp.fact.customer")}: </span>
              {brief.customer}
            </span>
          </p>
        )}
        {section !== "previous" && (
          <div className="mt-4">
            {matrix ? (
              <FitStrip rows={matrix.rows} />
            ) : fitLoading ? (
              <Skeleton className="h-9 w-72 max-w-full" />
            ) : null}
          </div>
        )}
      </div>
      <div className="flex shrink-0 flex-wrap gap-3">
        <LinkButton
          to="/dashboard/opportunities/$id"
          params={{ id: brief.id }}
          variant={section === "selected" ? "primary" : "secondary"}
          size="sm"
        >
          {t("common.open")}
        </LinkButton>
        {section === "alternative" && canChoose && onChoose && (
          <Button variant="primary" size="sm" onClick={onChoose} loading={choosing}>
            {t("cc.choose")}
          </Button>
        )}
      </div>
    </Card>
  );
}

function OpportunitiesPage() {
  const { t, locale } = useLocale();
  const founder = useFounderState();
  const invalidate = useInvalidateFounder();
  const navigate = useNavigate();

  const choose = useMutation({
    mutationFn: (opportunityId: string) => chooseDirection({ data: { opportunityId } }),
    onSuccess: async () => {
      await invalidate();
      toast.success(t("cc.chosen.toast"));
      void navigate({ to: "/dashboard" });
    },
    onError: (err) => {
      console.error("[opportunities] choose failed:", err);
      toast.error(t("cc.chosen.error"));
    },
  });
  const explore = useMutation({
    mutationFn: () => exploreMoreOpportunities({ data: { locale } }),
    onSuccess: async (res) => {
      await invalidate();
      toast.success(t("cc.explore.done", { n: res.added }));
    },
    onError: (err) => {
      console.error("[opportunities] explore more failed:", err);
      toast.error(t("cc.explore.error"));
    },
  });

  // Fit for every direction in view, in one call (hooks run before any early return).
  const fitIds = Object.values(founder.data?.briefs ?? {})
    .filter(
      (b) =>
        b.consultationId === founder.data?.direction.consultationId && b.status !== "dismissed",
    )
    .map((b) => b.id);
  const fits = useQuery({
    queryKey: qk.directionFits(fitIds),
    queryFn: () => getDirectionFits({ data: { ids: fitIds } }),
    staleTime: 30_000,
    enabled: fitIds.length > 0,
  });

  if (founder.isPending) return <PageSkeleton label={t("shell.skeleton.loading")} />;
  if (founder.isError || !founder.data) {
    return <ErrorPanel onRetry={() => void founder.refetch()} retrying={founder.isFetching} />;
  }

  const { direction, briefs } = founder.data;
  const all = Object.values(briefs);
  const inView = all.filter((b) => b.consultationId === direction.consultationId);
  const selected = direction.selectedId ? briefs[direction.selectedId] : null;
  const alternatives = inView
    .filter((b) => b.id !== selected?.id && b.status !== "dismissed")
    .sort((a, b) => direction.viewedIds.indexOf(a.id) - direction.viewedIds.indexOf(b.id));
  const previous = all
    .filter(
      (b) =>
        b.id !== selected?.id &&
        (b.consultationId !== direction.consultationId || b.status === "dismissed"),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const canChoose = direction.isLatestConsultation;

  return (
    <div className="flex flex-col gap-10" data-testid="opportunities-page">
      <PageHeader
        title={t("opp.list.title")}
        subtitle={t("opp.list.subtitle")}
        action={
          canChoose && all.length > 0 ? (
            <Button
              variant="soft"
              onClick={() => explore.mutate()}
              loading={explore.isPending}
              disabled={choose.isPending}
              data-testid="explore-more"
            >
              <Compass className="size-5" aria-hidden="true" />
              {t("cc.exploreMore")}
            </Button>
          ) : undefined
        }
      />

      {all.length === 0 && (
        <EmptyState
          title={t("cc.none.cardTitle")}
          body={t("cc.none.cardBody")}
          action={
            <LinkButton to="/consultation" variant="primary" size="lg">
              {t("nav.findMyBusinessIdea")}
            </LinkButton>
          }
        />
      )}

      {selected && (
        <section aria-labelledby="sel-h" className="flex flex-col gap-4">
          <h2 id="sel-h" className="sol-eyebrow">
            {t("opp.list.selected")}
          </h2>
          <OpportunityRow
            brief={selected}
            section="selected"
            canChoose={false}
            matrix={fits.data?.[selected.id]}
            fitLoading={fits.isLoading}
          />
        </section>
      )}

      {alternatives.length > 0 && (
        <section aria-labelledby="alt-h" className="flex flex-col gap-4">
          <h2 id="alt-h" className="sol-eyebrow">
            {t("opp.list.alternatives")}
          </h2>
          {alternatives.map((b) => (
            <OpportunityRow
              key={b.id}
              brief={b}
              section="alternative"
              canChoose={canChoose}
              choosing={choose.isPending && choose.variables === b.id}
              onChoose={() => choose.mutate(b.id)}
              matrix={fits.data?.[b.id]}
              fitLoading={fits.isLoading}
            />
          ))}
        </section>
      )}

      {previous.length > 0 && (
        <section aria-labelledby="prev-h" className="flex flex-col gap-4">
          <h2 id="prev-h" className="sol-eyebrow">
            {t("opp.list.previous")}
          </h2>
          {previous.map((b) => (
            <OpportunityRow key={b.id} brief={b} section="previous" canChoose={false} />
          ))}
        </section>
      )}
    </div>
  );
}
