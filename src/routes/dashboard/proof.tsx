import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Compass,
  ExternalLink,
  FileText,
  Loader2,
  Plus,
  Repeat,
  Route as RouteIcon,
  Search,
  ShieldCheck,
  Tag,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { PageHero } from "@/components/founder/proof/PageHero";
import { EvidenceDialog } from "@/components/founder/proof/EvidenceDialog";
import { SignalBadge, StatusBadge, formatDate } from "@/components/founder/proof/bits";
import { useEvidenceWorkspace, useMissionTitle } from "@/components/founder/proof/useEvidence";
import { useAskSol } from "@/components/founder/DashboardShell";
import {
  Button,
  Card,
  EmptyState,
  ErrorPanel,
  LinkButton,
  PageSkeleton,
  Pill,
} from "@/components/founder/ui";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getOpportunityDetail } from "@/lib/actions/opportunities";
import {
  deleteProofEvidence,
  getProofFileUrl,
  type AssumptionDTO,
  type EvidenceDTO,
  type LinkedMissionDTO,
} from "@/lib/actions/proof";
import { ASSUMPTION_STATUSES, type AssumptionStatus } from "@/lib/proof/links";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { qk, useFounderState, useInvalidateFounder } from "@/lib/queries";
import {
  useTranslatedEntity,
  useTranslatedTitle,
  type OpportunityOverlay,
} from "@/lib/use-translation";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/proof")({
  validateSearch: z.object({
    /** Which opportunity to explain (defaults to the current direction). */
    opportunity: z.string().uuid().optional().catch(undefined),
    /** An assumption to open on arrival (from a mission's "Tests" link). */
    assumption: z.string().uuid().optional().catch(undefined),
  }),
  component: ProofPage,
  head: () => ({
    meta: [{ title: "Evidence — Solventia" }, { name: "robots", content: "noindex" }],
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

/** The status bar's segment colours, in the same order as the legend. */
const STATUS_FILL: Record<AssumptionStatus, string> = {
  not_tested: "bg-sol-border-strong",
  testing: "bg-sol-cobalt",
  inconclusive: "bg-sol-cobalt/35",
  supported: "bg-sol-champagne",
  contradicted: "bg-sol-warning",
};

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
        <PageHero title={t("pf.title")} subtitle={t("pf.page.sub")} />
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
  return <EvidenceWorkspace opportunityId={opportunityId} openFirst={search.assumption ?? null} />;
}

/** Evidence: what has to be true for the direction to work, the missions that
 * test each assumption, and what the founder has actually recorded. Statuses
 * come only from recorded evidence — a finished mission is never proof. */
function EvidenceWorkspace({
  opportunityId,
  openFirst,
}: {
  opportunityId: string;
  openFirst: string | null;
}) {
  const { t, locale } = useLocale();
  const invalidate = useInvalidateFounder();
  const askSol = useAskSol();
  const { overview, assumptions, generate, needsGeneration } = useEvidenceWorkspace(opportunityId);
  const detailQuery = useQuery({
    queryKey: qk.opportunity(opportunityId),
    queryFn: () => getOpportunityDetail({ data: { id: opportunityId } }),
    staleTime: 15_000,
  });
  const oppOverlay = useTranslatedEntity<OpportunityOverlay>("opportunity", opportunityId);
  const opportunityTitle = useTranslatedTitle(opportunityId, overview.data?.opportunity?.title);
  const [openId, setOpenId] = useState<string | null>(openFirst);
  const [dialog, setDialog] = useState<{
    assumptionId: string | null;
    editing: EvidenceDTO | null;
  } | null>(null);
  const [deleting, setDeleting] = useState<EvidenceDTO | null>(null);

  // Arriving from a mission's "Tests" link: bring that assumption into view.
  useEffect(() => {
    if (!openFirst || assumptions.length === 0) return;
    document.getElementById(`assumption-${openFirst}`)?.scrollIntoView({ block: "start" });
  }, [openFirst, assumptions.length]);

  // Ask Sol shows which assumption is open, so its suggestions are about that one.
  const openAssumptionTitle = assumptions.find((a) => a.id === openId)?.title ?? null;
  useEffect(() => {
    askSol.setAssumption(openAssumptionTitle);
    return () => askSol.setAssumption(null);
  }, [openAssumptionTitle, askSol]);

  const remove = useMutation({
    mutationFn: (id: string) => deleteProofEvidence({ data: { id } }),
    onSuccess: async () => {
      await invalidate();
      toast.success(t("pf.deleted"));
      setDeleting(null);
    },
    onError: (err) => {
      console.error("[evidence] delete failed:", err);
      toast.error(t("pf.deleteError"));
    },
  });

  if (overview.isPending) return <PageSkeleton label={t("shell.skeleton.loading")} />;
  if (overview.isError || !overview.data) {
    return <ErrorPanel onRetry={() => void overview.refetch()} retrying={overview.isFetching} />;
  }
  const data = overview.data;

  if (!data.available) {
    return (
      <div className="flex flex-col gap-8">
        <PageHero title={t("pf.title")} subtitle={t("pf.page.sub")} />
        <ErrorPanel title={t("pf.unavailable.title")} body={t("pf.unavailable.body")} />
      </div>
    );
  }

  const dto = detailQuery.data;
  const detail = dto ? { ...dto.detail, ...(oppOverlay.data?.detail ?? {}) } : null;
  const advantages = dto
    ? (detail && detail.whyThisFounder.length > 0
        ? detail.whyThisFounder
        : dto.fit.advantages
      ).slice(0, 4)
    : [];
  // The first assumption that still needs evidence is where "Record evidence" starts.
  const firstOpen =
    assumptions.find((a) => a.status !== "supported" && a.status !== "contradicted") ??
    assumptions[0];

  return (
    <div className="flex flex-col gap-8" data-testid="proof-page">
      <PageHero
        title={t("pf.title")}
        subtitle={opportunityTitle ? `${opportunityTitle} — ${t("pf.page.sub")}` : t("pf.page.sub")}
        action={
          assumptions.length > 0 ? (
            <Button
              size="lg"
              onClick={() => setDialog({ assumptionId: firstOpen?.id ?? null, editing: null })}
              data-testid="add-evidence"
            >
              <Plus className="size-4" aria-hidden="true" />
              {t("pf.record")}
            </Button>
          ) : undefined
        }
      />

      {generate.isPending || (needsGeneration && !generate.isError) ? (
        <div
          role="status"
          className="flex items-center gap-3 rounded-2xl border border-sol-cobalt/25 bg-sol-cobalt-soft px-5 py-4 text-[1.0625rem] text-sol-ink"
        >
          <Loader2 className="size-5 animate-spin text-sol-cobalt" aria-hidden="true" />
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
        <StatusSummary counts={data.statusCounts} total={assumptions.length} />
      )}

      {assumptions.length > 0 && (
        <section aria-labelledby="assume-h" className="flex flex-col gap-4">
          <div>
            <h2 id="assume-h" className="sol-h-sm !text-[1.125rem]">
              {t("pf.assume.title")}
            </h2>
            <p className="mt-1 text-[0.9375rem] text-sol-secondary">{t("pf.assume.sub")}</p>
          </div>
          <ul className="flex flex-col gap-3">
            {assumptions.map((a) => (
              <li key={a.id} id={`assumption-${a.id}`} className="scroll-mt-24">
                <AssumptionCard
                  assumption={a}
                  open={openId === a.id}
                  onToggle={() => setOpenId(openId === a.id ? null : a.id)}
                  onRecord={() => setDialog({ assumptionId: a.id, editing: null })}
                  onEdit={(e) => setDialog({ assumptionId: a.id, editing: e })}
                  onDelete={(e) => setDeleting(e)}
                  roadmapId={data.roadmapId}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.unassigned.length > 0 && (
        <section aria-labelledby="unassigned-h" className="flex flex-col gap-3">
          <div>
            <h2 id="unassigned-h" className="sol-h-sm !text-[1.0625rem]">
              {t("pf.unassigned.title")}
            </h2>
            <p className="mt-1 text-[0.9375rem] text-sol-secondary">{t("pf.unassigned.body")}</p>
          </div>
          <ul className="flex flex-col gap-3">
            {data.unassigned.map((e) => (
              <li key={e.id}>
                <EvidenceItem
                  evidence={e}
                  onEdit={() => setDialog({ assumptionId: firstOpen?.id ?? null, editing: e })}
                  onDelete={() => setDeleting(e)}
                  editLabel={t("pf.unassigned.link")}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {dto && (
        <div className="grid gap-4 @2xl:grid-cols-2">
          <Card className="flex flex-col gap-4 p-5 sm:p-6" data-testid="proof-fit">
            <h2 className="sol-h-sm !text-[1.0625rem]">{t("pf.fitLink.title")}</h2>
            {advantages.length > 0 && (
              <ul className="flex flex-col gap-2.5">
                {advantages.map((reason) => (
                  <li
                    key={reason}
                    className="flex items-start gap-3 text-[0.9375rem] leading-snug text-sol-ink"
                  >
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-sol-cobalt-soft text-sol-cobalt-deep">
                      <Check className="size-3" strokeWidth={3} aria-hidden="true" />
                    </span>
                    <span className="min-w-0">{reason}</span>
                  </li>
                ))}
              </ul>
            )}
            <Link
              to="/dashboard/opportunities/$id"
              params={{ id: opportunityId }}
              search={{ tab: "fit" }}
              className="mt-auto inline-flex min-h-10 w-fit items-center gap-2 text-[0.9375rem] font-medium text-sol-cobalt-deep hover:underline"
            >
              {t("pf.fitLink.open")}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Card>
          <Card className="flex flex-col gap-4 p-5 sm:p-6">
            <h2 className="sol-h-sm !text-[1.0625rem]">{t("pf.marketLink")}</h2>
            <p className="text-[0.9375rem] leading-snug text-sol-secondary">
              {dto.sources.length > 0 ? t("opp.market.sourcesTitle") : t("opp.market.none")}
            </p>
            {dto.sources.length > 0 && (
              <ul className="flex flex-col gap-2">
                {dto.sources.slice(0, 3).map((s) => (
                  <li key={s.id} className="text-[0.9375rem] leading-snug text-sol-ink">
                    {s.claim}
                  </li>
                ))}
              </ul>
            )}
            <Link
              to="/dashboard/opportunities/$id"
              params={{ id: opportunityId }}
              search={{ tab: "market" }}
              className="mt-auto inline-flex min-h-10 w-fit items-center gap-2 text-[0.9375rem] font-medium text-sol-cobalt-deep hover:underline"
            >
              {t("pf.marketLink.open")}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Card>
        </div>
      )}

      {dialog && (
        <EvidenceDialog
          open
          onOpenChange={(o) => !o && setDialog(null)}
          opportunityId={opportunityId}
          assumptions={assumptions}
          presetAssumptionId={dialog.assumptionId}
          editing={dialog.editing}
          titleSupported={data.titleSupported}
        />
      )}

      <AlertDialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("pf.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("pf.deleteBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              data-testid="confirm-delete-evidence"
              onClick={(e) => {
                e.preventDefault();
                if (deleting) remove.mutate(deleting.id);
              }}
            >
              {t("pf.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** One bar for the whole direction: how many assumptions sit in each status. */
function StatusSummary({
  counts,
  total,
}: {
  counts: Record<AssumptionStatus, number>;
  total: number;
}) {
  const { t } = useLocale();
  return (
    <Card className="flex flex-col gap-4 p-5 sm:p-6" data-testid="assumption-summary">
      <p className="text-[0.9375rem] font-semibold text-sol-ink">
        {t("pf.summary.total", { n: total })}
      </p>
      <div
        className="flex h-2.5 overflow-hidden rounded-full bg-sol-pearl"
        role="img"
        aria-label={ASSUMPTION_STATUSES.map(
          (s) => `${t(`pf.status.${s}` as const)}: ${counts[s]}`,
        ).join(", ")}
      >
        {ASSUMPTION_STATUSES.filter((s) => counts[s] > 0).map((s) => (
          <span
            key={s}
            className={cn("h-full border-r-2 border-sol-surface last:border-r-0", STATUS_FILL[s])}
            style={{ width: `${(counts[s] / total) * 100}%` }}
          />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-6 gap-y-2" aria-label={t("pf.summary.aria")}>
        {ASSUMPTION_STATUSES.map((s) => (
          <li key={s} className="flex items-center gap-2 text-[0.9375rem] text-sol-secondary">
            <span className={cn("size-2.5 rounded-full", STATUS_FILL[s])} aria-hidden="true" />
            {t(`pf.status.${s}` as const)}
            <span className="font-semibold text-sol-ink" data-testid={`count-${s}`}>
              {counts[s]}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function AssumptionCard({
  assumption: a,
  open,
  onToggle,
  onRecord,
  onEdit,
  onDelete,
  roadmapId,
}: {
  assumption: AssumptionDTO;
  open: boolean;
  onToggle: () => void;
  onRecord: () => void;
  onEdit: (e: EvidenceDTO) => void;
  onDelete: (e: EvidenceDTO) => void;
  roadmapId: string | null;
}) {
  const { t, locale } = useLocale();
  const Icon = CATEGORY_ICON[a.category] ?? Compass;
  const actionMission = a.missions.find((m) => m.id === a.nextAction.missionId) ?? null;
  return (
    <Card
      as="article"
      className={cn(
        "p-0 shadow-none transition-colors",
        open ? "border-sol-cobalt/40" : "border-sol-border hover:border-sol-cobalt/40",
      )}
      data-testid="assumption-card"
      data-status={a.status}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`assume-${a.id}`}
        onClick={onToggle}
        data-testid="view-details"
        className="flex w-full cursor-pointer items-start gap-4 rounded-2xl px-5 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sol-cobalt/50"
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-sol-cobalt-soft text-sol-cobalt-deep">
          <Icon className="size-5" strokeWidth={1.75} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <Pill tone="neutral">{t(`pf.category.${a.category}` as const)}</Pill>
            <StatusBadge status={a.status} />
          </span>
          <span className="sol-h-sm mt-1.5 block text-sol-ink">{a.title}</span>
          {!open && (
            <span className="mt-1 block text-[0.9375rem] leading-snug text-sol-secondary">
              <NextActionText assumption={a} mission={actionMission} />
            </span>
          )}
        </span>
        <ChevronDown
          className={cn(
            "mt-3 size-5 shrink-0 text-sol-secondary transition-transform duration-200",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div
          id={`assume-${a.id}`}
          className="flex flex-col gap-6 border-t border-sol-border px-5 py-5 sm:px-6"
        >
          <div
            className="flex flex-col gap-3 rounded-2xl border border-sol-cobalt/25 bg-sol-cobalt-ultralight px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
            data-testid="next-action"
          >
            <div className="min-w-0">
              <p className="text-[0.9375rem] font-semibold text-sol-cobalt-deep">
                {t("pf.next.title")}
              </p>
              <p className="mt-1 text-[1rem] leading-snug text-sol-ink">
                <NextActionText assumption={a} mission={actionMission} />
              </p>
            </div>
            <Button size="md" onClick={onRecord} data-testid="record-evidence">
              <Plus className="size-4" aria-hidden="true" />
              {t("pf.record")}
            </Button>
          </div>

          <div className="grid gap-6 @2xl:grid-cols-2">
            <div className="flex flex-col gap-4">
              {a.whyItMatters && (
                <div>
                  <p className="text-[0.9375rem] font-semibold text-sol-secondary">
                    {t("pf.detail.whyMatters")}
                  </p>
                  <p className="mt-1 text-[1rem] leading-relaxed text-sol-ink">{a.whyItMatters}</p>
                </div>
              )}
              {a.nextTest && (
                <div>
                  <p className="text-[0.9375rem] font-semibold text-sol-secondary">
                    {t("pf.testMethod")}
                  </p>
                  <p className="mt-1 text-[1rem] leading-relaxed text-sol-ink">{a.nextTest}</p>
                </div>
              )}
            </div>
            <div>
              <p className="text-[0.9375rem] font-semibold text-sol-secondary">
                {t("pf.missions.title")}
              </p>
              {a.missions.length === 0 ? (
                <p className="mt-1 text-[0.9375rem] text-sol-secondary">{t("pf.missions.none")}</p>
              ) : (
                <ul className="mt-2 flex flex-col gap-2" data-testid="assumption-missions">
                  {a.missions.map((m) => (
                    <li key={m.id}>
                      <LinkedMission mission={m} roadmapId={roadmapId} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-[0.9375rem] font-semibold text-sol-secondary">
                {t("pf.evidence.title")} · {a.evidence.length}
              </p>
              <p className="text-[0.9375rem] text-sol-secondary">
                {t("pf.updated", { date: formatDate(a.updatedAt, locale) })}
              </p>
            </div>
            {a.evidence.length === 0 ? (
              <p className="mt-1 text-[0.9375rem] leading-snug text-sol-secondary">
                {t("pf.evidence.none")}
              </p>
            ) : (
              <ul className="mt-2 flex flex-col gap-2.5" data-testid="assumption-evidence">
                {a.evidence.map((e) => (
                  <li key={e.id}>
                    <EvidenceItem
                      evidence={e}
                      onEdit={() => onEdit(e)}
                      onDelete={() => onDelete(e)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

function NextActionText({
  assumption: a,
  mission,
}: {
  assumption: AssumptionDTO;
  mission: LinkedMissionDTO | null;
}) {
  const { t } = useLocale();
  const title = useMissionTitle(mission?.weekId ?? null, mission?.id ?? "", mission?.title ?? "");
  const code = a.nextAction.code;
  // A mission action whose mission isn't on this page falls back to the plain test.
  if (
    !mission &&
    (code === "start_mission" || code === "finish_mission" || code === "record_mission")
  ) {
    return <>{t("pf.next.run_test")}</>;
  }
  return <>{t(`pf.next.${code}` as const, { mission: title, n: a.nextAction.n ?? 1 })}</>;
}

function LinkedMission({
  mission: m,
  roadmapId,
}: {
  mission: LinkedMissionDTO;
  roadmapId: string | null;
}) {
  const { t } = useLocale();
  const title = useMissionTitle(m.weekId, m.id, m.title);
  const body = (
    <>
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full border text-[0.9375rem] font-semibold",
          m.state === "completed"
            ? "border-sol-champagne bg-sol-champagne text-sol-ink"
            : m.state === "in_progress"
              ? "border-sol-cobalt bg-sol-cobalt text-white"
              : "border-sol-border-strong bg-sol-surface text-sol-secondary",
        )}
        aria-hidden="true"
      >
        {m.state === "completed" ? (
          <Check className="size-3.5" strokeWidth={3} />
        ) : (
          (m.weekNumber ?? "·")
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[0.9375rem] font-medium leading-snug text-sol-ink">
          {title}
        </span>
        <span className="block text-[0.9375rem] text-sol-secondary">
          {m.weekNumber ? `${t("pf.missions.week", { n: m.weekNumber })} · ` : ""}
          {t(`pf.missions.state.${m.state}` as const)}
          {m.evidenceCount > 0 && ` · ${t("pf.mission.recorded", { n: m.evidenceCount })}`}
        </span>
      </span>
    </>
  );
  const cls =
    "flex items-center gap-3 rounded-xl border border-sol-border bg-sol-surface px-3 py-2.5 transition-colors";
  return roadmapId && m.weekNumber ? (
    <Link
      to="/dashboard/roadmap"
      search={{ week: m.weekNumber, mission: m.id }}
      className={cn(cls, "hover:border-sol-cobalt/40")}
      data-testid="linked-mission"
    >
      {body}
    </Link>
  ) : (
    <div className={cls} data-testid="linked-mission">
      {body}
    </div>
  );
}

function EvidenceItem({
  evidence: e,
  onEdit,
  onDelete,
  editLabel,
}: {
  evidence: EvidenceDTO;
  onEdit: () => void;
  onDelete: () => void;
  editLabel?: string;
}) {
  const { t, locale } = useLocale();
  const file = useMutation({
    mutationFn: () => getProofFileUrl({ data: { evidenceId: e.id } }),
    onSuccess: (res) => {
      if (res.url) window.open(res.url, "_blank", "noopener,noreferrer");
      else toast.error(t("pf.file.unavailable"));
    },
    onError: () => toast.error(t("pf.file.unavailable")),
  });
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-xl border bg-sol-surface px-4 py-3",
        e.signal === "contradicts" ? "border-sol-warning/40" : "border-sol-border",
      )}
      data-testid="evidence-item"
      data-signal={e.signal}
    >
      <div className="flex flex-wrap items-center gap-2">
        <SignalBadge signal={e.signal} />
        <span className="text-[0.9375rem] text-sol-secondary">
          {t(`pf.type.${e.type}` as const)} · {formatDate(e.occurredOn, locale)}
          {e.sourcePerson ? ` · ${e.sourcePerson}` : ""}
        </span>
      </div>
      {e.title && <p className="text-[0.9375rem] font-semibold text-sol-ink">{e.title}</p>}
      <p className="whitespace-pre-line text-[0.9375rem] leading-relaxed text-sol-ink" dir="auto">
        {e.summary}
      </p>
      {e.taskTitle && (
        <p className="text-[0.9375rem] text-sol-secondary">
          {t("pf.fromMission", { title: e.taskTitle })}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {e.url && (
          <a
            href={e.url}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex min-h-9 items-center gap-1.5 text-[0.9375rem] font-medium text-sol-cobalt-deep hover:underline"
          >
            {t("pf.link")}
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
        )}
        {e.hasFile && (
          <button
            type="button"
            onClick={() => file.mutate()}
            className="inline-flex min-h-9 items-center gap-1.5 text-[0.9375rem] font-medium text-sol-cobalt-deep hover:underline"
          >
            <FileText className="size-3.5" aria-hidden="true" />
            {e.fileName ?? t("pf.file.open")}
          </button>
        )}
        <span className="ml-auto flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={onEdit} data-testid="edit-evidence">
            {editLabel ?? t("pf.edit")}
          </Button>
          <Button size="sm" variant="ghost" onClick={onDelete} data-testid="delete-evidence">
            {t("pf.delete")}
          </Button>
        </span>
      </div>
    </div>
  );
}
