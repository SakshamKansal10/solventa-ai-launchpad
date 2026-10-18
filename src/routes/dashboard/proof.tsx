import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import {
  ChevronDown,
  Compass,
  Loader2,
  Repeat,
  Route as RouteIcon,
  Search,
  ShieldCheck,
  Tag,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { AssumptionSheet } from "@/components/founder/proof/AssumptionSheet";
import { formatDate, StateBadge } from "@/components/founder/proof/bits";
import { EvidenceDialog } from "@/components/founder/proof/EvidenceDialog";
import { EvidenceMap } from "@/components/founder/proof/EvidenceMap";
import { PageHero } from "@/components/founder/proof/PageHero";
import { EvidenceStream } from "@/components/founder/proof/EvidenceStream";
import { useAskSol } from "@/components/founder/DashboardShell";
import { ProgressRing } from "@/components/founder/dashboard/graphics";
import {
  Button,
  Card,
  EmptyState,
  ErrorPanel,
  LinkButton,
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
import { useTranslatedEntity, useTranslatedTitle } from "@/lib/use-translation";
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
    /** The mission's assumption category — used to preselect an assumption when
     * the assumptions are only just being written (first visit). */
    category: z.string().optional(),
    mission: z.string().uuid().optional(),
    week: z.string().uuid().optional(),
  }),
  component: ProofPage,
  head: () => ({
    meta: [{ title: "Proof — Solventia" }, { name: "robots", content: "noindex" }],
  }),
});

const CATEGORY_ICON: Record<string, LucideIcon> = {
  problem: Search,
  willingness_to_pay: Wallet,
  distribution: RouteIcon,
  delivery: RouteIcon,
  retention: Repeat,
  pricing: Tag,
  competition: ShieldCheck,
};

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
        <PageHero title={t("pf.title")} subtitle={t("pf.subtitle")} gem="seal" />
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
  const askSol = useAskSol();

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

  const opportunityTitle = useTranslatedTitle(opportunityId, overview.data?.opportunity?.title);
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

  // Ask Sol shows which assumption is open, so its suggestions are about that one.
  const openAssumptionTitle =
    overview.data?.assumptions.find((a) => a.id === detailId)?.title ?? null;
  useEffect(() => {
    askSol.setAssumption(openAssumptionTitle);
    return () => askSol.setAssumption(null);
  }, [openAssumptionTitle, askSol]);

  if (overview.isPending) return <PageSkeleton label={t("shell.skeleton.loading")} />;
  if (overview.isError || !overview.data) {
    return <ErrorPanel onRetry={() => void overview.refetch()} retrying={overview.isFetching} />;
  }
  const data = overview.data;

  if (!data.available) {
    return (
      <div className="flex flex-col gap-8">
        <PageHero title={t("pf.title")} subtitle={t("pf.subtitle")} gem="seal" />
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

  const collected = assumptions.filter((a) => a.evidence.length > 0).length;

  return (
    <div className="flex flex-col gap-8" data-testid="proof-page">
      <PageHero
        title={opportunityTitle ?? t("pf.title")}
        subtitle={t("pf.subtitle")}
        gem="seal"
        action={
          assumptions.length > 0 ? (
            <Button size="lg" onClick={() => openAdd(null)} data-testid="add-evidence-global">
              {t("pf.addEvidenceCta")}
            </Button>
          ) : undefined
        }
      >
        {assumptions.length > 0 && (
          <div
            className="flex items-center gap-5 rounded-2xl border border-sol-border bg-white/70 px-5 py-3 backdrop-blur"
            data-testid="evidence-collected"
          >
            <ProgressRing value={collected} total={assumptions.length} label={t("pf.collected")} />
            <p className="text-[0.9375rem] text-sol-secondary">
              <span className="block text-[1.5rem] font-medium leading-none text-sol-ink">
                {assumptions.length - collected}
              </span>
              <span className="mt-1 block">{t("pf.moreToValidate")}</span>
            </p>
          </div>
        )}
      </PageHero>

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
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,64fr)_minmax(0,36fr)]">
          <div className="flex min-w-0 flex-col gap-6">
            <EvidenceMap assumptions={assumptions} onSelect={setDetailId} />

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
                      "min-h-10 rounded-full border px-4 text-[0.9375rem] font-medium transition-colors",
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
              <ul className="flex flex-col gap-3">
                {shown.map((a) => {
                  const Icon = CATEGORY_ICON[a.category] ?? Compass;
                  return (
                    <li key={a.id}>
                      <Card
                        as="article"
                        className="flex flex-wrap items-center gap-x-4 gap-y-3 border-sol-border px-5 py-4 shadow-none transition-colors hover:border-sol-violet/40"
                        data-testid="assumption-card"
                        data-state={a.state}
                      >
                        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-sol-violet-soft text-sol-violet-deep">
                          <Icon className="size-5" strokeWidth={1.75} aria-hidden="true" />
                        </span>
                        <div className="min-w-[14rem] flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Pill tone="neutral">{t(`pf.category.${a.category}` as const)}</Pill>
                            <StateBadge state={a.state} />
                            {a.evidence.length > 0 && (
                              <span className="text-[0.875rem] text-sol-secondary">
                                {t("pf.evidenceCount", { n: a.evidence.length })}
                              </span>
                            )}
                          </div>
                          <h2 className="sol-h-sm mt-1.5 text-sol-ink">{a.title}</h2>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => openAdd(a.id)}
                            data-testid="add-evidence"
                          >
                            {t("pf.addEvidence")}
                          </Button>
                          <button
                            type="button"
                            onClick={() => setDetailId(a.id)}
                            data-testid="view-details"
                            aria-label={`${t("common.viewDetails")}: ${a.title}`}
                            className="grid size-10 place-items-center rounded-full border border-sol-border text-sol-ink transition-colors hover:bg-sol-ivory focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sol-violet/50"
                          >
                            <ChevronDown className="size-5" aria-hidden="true" />
                          </button>
                        </div>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <aside className="flex min-w-0 flex-col gap-6" aria-label={t("pf.stream.title")}>
            <EvidenceStream
              compact
              assumptions={assumptions}
              onOpenAssumption={setDetailId}
              onAdd={() => openAdd(null)}
              onAskSol={({ summary }) =>
                askSol.open(t("askSol.q.whatChanges", { summary: summary.slice(0, 240) }))
              }
            />
          </aside>
        </div>
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
        // Never show an empty form: on a first visit (arriving from a mission) the
        // dialog waits until the assumptions exist, then opens preselected.
        open={dialog.open && assumptions.length > 0}
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
        presetAssumptionId={
          dialog.assumptionId ??
          (search.category ? assumptions.find((a) => a.category === search.category)?.id : null) ??
          null
        }
        editing={dialog.editing}
        titleSupported={data.titleSupported}
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
