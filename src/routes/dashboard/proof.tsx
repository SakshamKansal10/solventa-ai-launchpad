import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { Loader2 } from "lucide-react";

import { AssumptionSheet } from "@/components/founder/proof/AssumptionSheet";
import { formatDate, StateBadge } from "@/components/founder/proof/bits";
import { EvidenceDialog } from "@/components/founder/proof/EvidenceDialog";
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
import {
  generateAssumptions,
  getProofOverview,
  updateProofEvidence,
  type AssumptionDTO,
  type EvidenceDTO,
} from "@/lib/actions/proof";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { PROOF_STATES, type ProofState } from "@/lib/proof/state";
import { qk, useFounderState, useInvalidateFounder } from "@/lib/queries";
import { useTranslatedEntity } from "@/lib/use-translation";
import { cn } from "@/lib/utils";

const FILTERS = ["all", ...PROOF_STATES] as const;
type Filter = (typeof FILTERS)[number];

export const Route = createFileRoute("/dashboard/proof")({
  validateSearch: z.object({
    /** Which opportunity's proof workspace to open (defaults to the current direction). */
    opportunity: z.string().uuid().optional(),
    filter: z.enum(FILTERS).optional(),
    /** Open the evidence dialog immediately — prefilled from a roadmap mission. */
    add: z.boolean().optional(),
    assumption: z.string().uuid().optional(),
    mission: z.string().uuid().optional(),
    week: z.string().uuid().optional(),
  }),
  component: ProofPage,
  head: () => ({
    meta: [{ title: "Proof — Solventia" }, { name: "robots", content: "noindex" }],
  }),
});

interface ProofOverlay {
  assumptions?: Record<string, { title?: string; whyItMatters?: string; nextTest?: string }>;
}

function ProofPage() {
  const { t } = useLocale();
  const search = Route.useSearch();
  const founder = useFounderState();

  if (founder.isPending) return <PageSkeleton label={t("shell.skeleton.loading")} />;
  if (founder.isError || !founder.data) {
    return <ErrorPanel onRetry={() => void founder.refetch()} retrying={founder.isFetching} />;
  }
  const opportunityId = search.opportunity ?? founder.data.direction.selectedId ?? null;

  if (!opportunityId) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title={t("pf.title")} subtitle={t("pf.subtitle")} />
        <EmptyState
          title={t("pf.noDirection.title")}
          body={t("pf.noDirection.body")}
          action={
            <LinkButton to="/dashboard/opportunities" variant="primary" size="lg">
              {t("shell.nav.opportunities")}
            </LinkButton>
          }
        />
      </div>
    );
  }
  return <ProofWorkspace opportunityId={opportunityId} />;
}

function ProofWorkspace({ opportunityId }: { opportunityId: string }) {
  const { t, locale } = useLocale();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const invalidate = useInvalidateFounder();

  const overview = useQuery({
    queryKey: qk.proof(opportunityId),
    queryFn: () => getProofOverview({ data: { opportunityId } }),
    staleTime: 10_000,
  });
  const overlay = useTranslatedEntity<ProofOverlay>(
    "proof",
    opportunityId,
    String(overview.data?.assumptions.length ?? 0),
  );

  const [detailId, setDetailId] = useState<string | null>(search.assumption ?? null);
  const [dialog, setDialog] = useState<{
    open: boolean;
    assumptionId: string | null;
    editing: EvidenceDTO | null;
  }>({ open: Boolean(search.add), assumptionId: search.assumption ?? null, editing: null });

  // The founder's first visit: set up the critical assumptions exactly once.
  const generate = useMutation({
    mutationFn: () => generateAssumptions({ data: { opportunityId, locale } }),
    onSuccess: async () => {
      await invalidate();
    },
  });
  const generatedRef = useRef(false);
  const needsGeneration = overview.data?.available && overview.data.needsGeneration;
  useEffect(() => {
    if (needsGeneration && !generatedRef.current && !generate.isPending) {
      generatedRef.current = true;
      generate.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsGeneration]);

  if (overview.isPending) return <PageSkeleton label={t("shell.skeleton.loading")} />;
  if (overview.isError || !overview.data) {
    return <ErrorPanel onRetry={() => void overview.refetch()} retrying={overview.isFetching} />;
  }
  const data = overview.data;

  if (!data.available) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title={t("pf.title")} subtitle={t("pf.subtitle")} />
        <ErrorPanel title={t("pf.unavailable.title")} body={t("pf.unavailable.body")} />
      </div>
    );
  }

  const applyOverlay = (a: AssumptionDTO): AssumptionDTO => {
    const o = overlay.data?.assumptions?.[a.id];
    return o
      ? {
          ...a,
          title: o.title ?? a.title,
          whyItMatters: o.whyItMatters ?? a.whyItMatters,
          nextTest: o.nextTest ?? a.nextTest,
        }
      : a;
  };
  const assumptions = data.assumptions.map(applyOverlay);
  const filter: Filter = search.filter ?? "all";
  const shown = filter === "all" ? assumptions : assumptions.filter((a) => a.state === filter);
  const detail = assumptions.find((a) => a.id === detailId) ?? null;

  const setFilter = (next: Filter) =>
    navigate({
      to: "/dashboard/proof",
      search: { ...search, filter: next === "all" ? undefined : next },
      replace: true,
    });

  const openAdd = (assumptionId: string | null, editing: EvidenceDTO | null = null) =>
    setDialog({ open: true, assumptionId, editing });

  return (
    <div className="flex flex-col gap-8" data-testid="proof-page">
      <PageHeader
        title={t("pf.title")}
        subtitle={t("pf.subtitle")}
        eyebrow={data.opportunity?.title}
      />

      {generate.isPending || (needsGeneration && !generate.isError) ? (
        <div
          role="status"
          className="flex items-center gap-3 rounded-2xl border border-sol-violet/25 bg-sol-violet-soft px-5 py-4 text-[1.0625rem] text-sol-ink"
        >
          <Loader2 className="size-5 animate-spin text-sol-violet" aria-hidden="true" />
          {t("pf.generating")}
        </div>
      ) : generate.isError ? (
        <ErrorPanel
          title={t("pf.generateError.title")}
          body={t("pf.generateError.body")}
          onRetry={() => generate.mutate()}
          retrying={generate.isPending}
        />
      ) : null}

      {assumptions.length > 0 && (
        <>
          <div
            role="group"
            aria-label={t("pf.filters.aria")}
            className="flex flex-wrap gap-2"
            data-testid="proof-filters"
          >
            {FILTERS.map((f) => {
              const count = f === "all" ? assumptions.length : data.counts[f as ProofState];
              return (
                <button
                  key={f}
                  type="button"
                  aria-pressed={filter === f}
                  data-testid={`filter-${f}`}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "min-h-11 rounded-full border px-4 text-[1rem] font-semibold transition-colors",
                    filter === f
                      ? "border-sol-violet bg-sol-violet-soft text-sol-violet-deep"
                      : "border-sol-border bg-sol-surface text-sol-ink hover:border-sol-violet/45",
                  )}
                >
                  {f === "all" ? t("common.all") : t(`pf.state.${f}` as const)}{" "}
                  <span className="text-sol-secondary">{count}</span>
                </button>
              );
            })}
          </div>

          {shown.length === 0 ? (
            <EmptyState title={t("pf.filters.emptyTitle")} body={t("pf.filters.emptyBody")} />
          ) : (
            <ul className="flex flex-col gap-4">
              {shown.map((a) => (
                <li key={a.id}>
                  <Card
                    as="article"
                    className="flex flex-col gap-4 p-6 sm:p-7"
                    data-testid="assumption-card"
                    data-state={a.state}
                  >
                    <div className="flex flex-wrap items-center gap-2.5">
                      <Pill tone="neutral">{t(`pf.category.${a.category}` as const)}</Pill>
                      <StateBadge state={a.state} />
                      <span className="text-[0.9375rem] text-sol-secondary">
                        {t("pf.evidenceCount", { n: a.evidence.length })}
                      </span>
                    </div>
                    <h2 className="font-display text-[1.5rem] font-semibold leading-[1.25] text-sol-ink">
                      {a.title}
                    </h2>
                    {a.nextTest && (
                      <p className="text-[1.0625rem] leading-relaxed text-sol-secondary">
                        <span className="font-semibold text-sol-ink">{t("pf.nextTest")}: </span>
                        {a.nextTest}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-3">
                      <Button size="md" onClick={() => openAdd(a.id)} data-testid="add-evidence">
                        {t("pf.addEvidence")}
                      </Button>
                      <Button
                        size="md"
                        variant="secondary"
                        onClick={() => setDetailId(a.id)}
                        data-testid="view-details"
                      >
                        {t("common.viewDetails")}
                      </Button>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {data.unassigned.length > 0 && (
        <UnassignedNotes evidence={data.unassigned} assumptions={assumptions} locale={locale} />
      )}

      <AssumptionSheet
        assumption={detail}
        onOpenChange={(open) => !open && setDetailId(null)}
        onAddEvidence={(id) => openAdd(id)}
        onEditEvidence={(e) => openAdd(e.assumptionId, e)}
      />

      <EvidenceDialog
        open={dialog.open}
        onOpenChange={(open) => {
          setDialog((d) => ({ ...d, open }));
          if (!open && (search.add || search.mission)) {
            void navigate({
              to: "/dashboard/proof",
              search: { opportunity: opportunityId, filter: search.filter },
              replace: true,
            });
          }
        }}
        opportunityId={opportunityId}
        assumptions={assumptions}
        presetAssumptionId={dialog.assumptionId}
        editing={dialog.editing}
        taskId={search.mission ?? null}
        weekId={search.week ?? null}
      />
    </div>
  );
}

/** Notes carried over from the old Evidence Vault, before assumptions existed.
 * Nothing is lost: each can be linked to the assumption it speaks to. */
function UnassignedNotes({
  evidence,
  assumptions,
  locale,
}: {
  evidence: EvidenceDTO[];
  assumptions: AssumptionDTO[];
  locale: "en" | "hi";
}) {
  const { t } = useLocale();
  const invalidate = useInvalidateFounder();
  const link = useMutation({
    mutationFn: (v: { id: string; assumptionId: string }) =>
      updateProofEvidence({ data: { id: v.id, assumptionId: v.assumptionId } }),
    onSuccess: async () => {
      await invalidate();
      toast.success(t("pf.linked"));
    },
    onError: () => toast.error(t("pf.saveError")),
  });
  if (assumptions.length === 0) return <Skeleton className="h-24" />;
  return (
    <section
      aria-labelledby="unassigned-h"
      className="flex flex-col gap-3"
      data-testid="unassigned-notes"
    >
      <h2 id="unassigned-h" className="sol-eyebrow">
        {t("pf.unassigned.title")}
      </h2>
      <p className="sol-support">{t("pf.unassigned.body")}</p>
      <ul className="flex flex-col gap-3">
        {evidence.map((e) => (
          <li key={e.id}>
            <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-[1rem] leading-relaxed text-sol-ink">{e.summary}</p>
                <p className="mt-1 text-[0.875rem] text-sol-secondary">
                  {formatDate(e.occurredOn, locale)}
                </p>
              </div>
              <label className="flex shrink-0 flex-col gap-1 text-[0.875rem] font-semibold text-sol-ink">
                {t("pf.unassigned.link")}
                <select
                  className="min-h-11 max-w-[18rem] rounded-xl border border-sol-border bg-sol-surface px-3 text-[0.9375rem] font-normal"
                  defaultValue=""
                  disabled={link.isPending}
                  onChange={(ev) =>
                    ev.target.value && link.mutate({ id: e.id, assumptionId: ev.target.value })
                  }
                >
                  <option value="" disabled>
                    {t("common.chooseOne")}
                  </option>
                  {assumptions.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title}
                    </option>
                  ))}
                </select>
              </label>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
