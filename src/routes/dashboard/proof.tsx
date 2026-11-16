import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { ExternalLink, FileText, Loader2 } from "lucide-react";

import { useAskSol } from "@/components/founder/DashboardShell";
import { isProofChecked } from "@/components/founder/dash/missions";
import { StatusShape } from "@/components/founder/dash/StatusShape";
import {
  ActionButton,
  ActionLink,
  Arrow,
  DashError,
  DashPage,
  DashSkeleton,
  Label,
  MistCard,
  QuietRow,
} from "@/components/founder/dash/ui";
import { EvidenceDialog } from "@/components/founder/proof/EvidenceDialog";
import { SignalBadge, formatDate } from "@/components/founder/proof/bits";
import { useEvidenceWorkspace, useMissionTitle } from "@/components/founder/proof/useEvidence";
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
import {
  deleteProofEvidence,
  getProofFileUrl,
  type AssumptionDTO,
  type EvidenceDTO,
  type LinkedMissionDTO,
} from "@/lib/actions/proof";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { useFounderState, useInvalidateFounder } from "@/lib/queries";
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
    meta: [
      { title: "Proof | Solventia" },
      { name: "description", content: "What you have proved so far, and what is still to check." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function ProofPage() {
  const { t } = useLocale();
  const search = Route.useSearch();
  const founder = useFounderState();

  if (founder.isPending) return <DashSkeleton label={t("shell.skeleton.loading")} />;
  if (founder.isError || !founder.data) {
    return <DashError onRetry={() => void founder.refetch()} retrying={founder.isFetching} />;
  }
  const opportunityId = search.opportunity ?? founder.data.direction.selectedId ?? null;
  if (!opportunityId) {
    return (
      <DashPage>
        <h1 className="dash-headline">{t("v2.proof.title")}</h1>
        <p className="dash-lead max-w-[32em]">{t("pf.noDirection.body")}</p>
        <ActionLink to="/dashboard/opportunities" className="self-start">
          {t("v2.dir.open")}
        </ActionLink>
      </DashPage>
    );
  }
  return (
    <ProofWorkspace
      opportunityId={opportunityId}
      openFirst={search.assumption ?? null}
      hasRoadmap={Boolean(founder.data.direction.roadmap)}
    />
  );
}

/** Proof — "What have I proved?" (screen 8). What has to be true for the direction to work,
 * how each one is checked, and the count of things with a result. Statuses come only from
 * recorded proof — a finished mission is never proof by itself. */
function ProofWorkspace({
  opportunityId,
  openFirst,
  hasRoadmap,
}: {
  opportunityId: string;
  openFirst: string | null;
  hasRoadmap: boolean;
}) {
  const { t } = useLocale();
  const invalidate = useInvalidateFounder();
  const askSol = useAskSol();
  const { overview, assumptions, generate, needsGeneration } = useEvidenceWorkspace(opportunityId);
  const [openId, setOpenId] = useState<string | null>(openFirst);
  const [dialog, setDialog] = useState<{
    assumptionId: string | null;
    editing: EvidenceDTO | null;
    /** From "Add other proof": outside any mission. */
    outside?: boolean;
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
      console.error("[proof] delete failed:", err);
      toast.error(t("pf.deleteError"));
    },
  });

  if (overview.isPending) return <DashSkeleton label={t("shell.skeleton.loading")} />;
  if (overview.isError || !overview.data) {
    return <DashError onRetry={() => void overview.refetch()} retrying={overview.isFetching} />;
  }
  const data = overview.data;
  if (!data.available) {
    return (
      <DashPage>
        <h1 className="dash-headline">{t("v2.proof.title")}</h1>
        <p className="dash-lead max-w-[32em]">{t("pf.unavailable.body")}</p>
      </DashPage>
    );
  }

  const total = assumptions.length;
  const checked = assumptions.filter((a) => isProofChecked(a.status)).length;
  // "Add other proof" starts on the first assumption that still needs a result.
  const firstOpen = assumptions.find((a) => !isProofChecked(a.status)) ?? assumptions[0];

  return (
    <DashPage data-testid="proof-page">
      <div className="flex flex-wrap items-end justify-between gap-8">
        <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-[18px]">
          <h1 className="dash-headline">{t("v2.proof.title")}</h1>
          <p className="dash-lead max-w-[33em]">
            {total > 0 ? t("v2.proof.lead", { n: total }) : t("pf.page.sub")}
          </p>
          <div className="flex flex-wrap items-center gap-3.5">
            {hasRoadmap ? (
              <ActionLink to="/dashboard/roadmap">{t("v2.proof.continue")}</ActionLink>
            ) : (
              <ActionLink to="/dashboard/opportunities/$id" params={{ id: opportunityId }}>
                {t("v2.proof.toDirection")}
              </ActionLink>
            )}
            {total > 0 && (
              <ActionButton
                tone="secondary"
                arrow={false}
                onClick={() =>
                  setDialog({ assumptionId: firstOpen?.id ?? null, editing: null, outside: true })
                }
                data-testid="add-evidence"
              >
                {t("v2.proof.add")}
              </ActionButton>
            )}
          </div>
        </div>
        {total > 0 && (
          <div className="flex flex-[0_1_320px] flex-col gap-4" data-testid="proof-count">
            <span className="whitespace-nowrap font-display text-[clamp(80px,8.4vw,124px)] font-medium leading-[0.85] tracking-[-0.05em] text-sol-ink">
              {checked}
              <span className="text-sol-muted"> / {total}</span>
            </span>
            <p className="text-[19px] text-sol-secondary">{t("v2.today.proof.checked")}</p>
            <span aria-hidden="true" className="flex max-w-[320px] gap-1.5">
              {assumptions.map((a) => (
                <span
                  key={a.id}
                  className={cn(
                    "h-3 flex-1 rounded-full",
                    a.status === "supported"
                      ? "bg-sol-champagne"
                      : a.status === "contradicted"
                        ? "dash-hatch"
                        : a.status === "inconclusive"
                          ? "bg-sol-muted"
                          : a.status === "testing"
                            ? "border-2 border-sol-cobalt"
                            : "bg-sol-ivory-depth",
                  )}
                />
              ))}
            </span>
          </div>
        )}
      </div>

      {generate.isPending || (needsGeneration && !generate.isError) ? (
        <p role="status" className="dash-lead flex items-center gap-3">
          <Loader2 className="size-6 shrink-0 animate-spin text-sol-cobalt" aria-hidden="true" />
          {t("pf.generating")}
        </p>
      ) : generate.isError ? (
        <div
          role="alert"
          className="flex flex-col items-start gap-4 rounded-[32px] border border-sol-warning/50 bg-sol-warning-soft p-[clamp(24px,2.8vw,40px)]"
        >
          <p className="dash-statement">{t("pf.generateError.title")}</p>
          <p className="dash-body text-sol-ink">{t("pf.generateError.body")}</p>
          <ActionButton
            tone="secondary"
            size="md"
            arrow={false}
            onClick={() => generate.mutate()}
            loading={generate.isPending}
          >
            {t("common.retry")}
          </ActionButton>
        </div>
      ) : null}

      {total > 0 && (
        <ul className="grid items-stretch gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(480px,100%),1fr))]">
          {assumptions.map((a) => (
            <li key={a.id} id={`assumption-${a.id}`} className="flex scroll-mt-24">
              <AssumptionCard
                assumption={a}
                open={openId === a.id}
                onToggle={() => setOpenId(openId === a.id ? null : a.id)}
                onRecord={() => setDialog({ assumptionId: a.id, editing: null })}
                onEdit={(e) => setDialog({ assumptionId: a.id, editing: e })}
                onDelete={(e) => setDeleting(e)}
              />
            </li>
          ))}
        </ul>
      )}

      {data.unassigned.length > 0 && (
        <section aria-labelledby="unassigned-h" className="flex flex-col gap-3">
          <h2 id="unassigned-h" className="dash-label">
            {t("pf.unassigned.title")}
          </h2>
          <p className="dash-body">{t("pf.unassigned.body")}</p>
          <ul className="flex flex-col">
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

      {total > 0 && (
        <QuietRow className="gap-x-8 py-7" data-testid="if-check-fails">
          <h2 className="font-display text-[26px] font-medium tracking-[-0.015em] text-sol-ink">
            {t("v2.proof.fails.title")}
          </h2>
          <p className="flex-[1_1_480px] text-[19px] leading-[1.45] text-sol-secondary">
            {t("v2.proof.fails.body")}
          </p>
        </QuietRow>
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
          addedByUser={dialog.outside}
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
    </DashPage>
  );
}

/** One assumption: type, status (shape + word), the statement, and how you check it. The
 * recorded proof opens below it. */
function AssumptionCard({
  assumption: a,
  open,
  onToggle,
  onRecord,
  onEdit,
  onDelete,
}: {
  assumption: AssumptionDTO;
  open: boolean;
  onToggle: () => void;
  onRecord: () => void;
  onEdit: (e: EvidenceDTO) => void;
  onDelete: (e: EvidenceDTO) => void;
}) {
  const { t, locale } = useLocale();
  const actionMission = a.missions.find((m) => m.id === a.nextAction.missionId) ?? null;
  const checkMission =
    actionMission ?? a.missions.find((m) => m.state !== "completed") ?? a.missions[0];
  return (
    <MistCard
      as="article"
      className="w-full gap-[18px] rounded-[36px]"
      data-testid="assumption-card"
      data-status={a.status}
    >
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <Label>{t(`pf.category.${a.category}` as const)}</Label>
        <StatusShape status={a.status} className="bg-white" />
      </div>
      <p className="font-display text-[clamp(22px,2vw,28px)] font-medium leading-[1.2] tracking-[-0.015em] text-sol-ink">
        {a.title}
      </p>
      <div className="mt-auto flex flex-col gap-1.5 border-t border-sol-ink/10 pt-[18px]">
        <Label as="p" className="!tracking-[0.06em]">
          {t("v2.proof.howCheck")}
        </Label>
        {a.rule ? (
          // Proof that updates itself: the checking mission's live count against its rule.
          <Link
            to="/dashboard/roadmap/mission/$missionId"
            params={{ missionId: a.rule.missionId }}
            data-testid="rule-progress"
            className="inline-flex min-h-11 flex-wrap items-center gap-2.5 text-[18px] font-medium leading-[1.3] text-sol-cobalt-deep hover:underline"
          >
            {t("v2.proof.live", {
              logged: a.rule.logged,
              outOf: a.rule.outOf,
              yes: a.rule.matching,
            })}
            <Arrow />
          </Link>
        ) : checkMission ? (
          <MissionLink mission={checkMission} />
        ) : (
          <p className="flex min-h-11 items-center text-[18px] leading-[1.35] text-sol-secondary">
            {t("v2.proof.laterMission")}
          </p>
        )}
        <p className="text-[17px] leading-snug text-sol-secondary">
          <NextActionText assumption={a} mission={actionMission} />
        </p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-2">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={`assume-${a.id}`}
            onClick={onToggle}
            data-testid="view-details"
            className="inline-flex min-h-11 items-center text-[17px] font-medium text-sol-cobalt-deep hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sol-cobalt"
          >
            {open ? t("v2.proof.hide") : t("v2.proof.show", { n: a.evidence.length })}
          </button>
          <button
            type="button"
            onClick={onRecord}
            data-testid="record-evidence"
            className="inline-flex min-h-11 items-center text-[17px] font-medium text-sol-cobalt-deep hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sol-cobalt"
          >
            {t("v2.proof.record")}
          </button>
        </div>
      </div>
      {open && (
        <div
          id={`assume-${a.id}`}
          className="flex flex-col gap-4 border-t border-sol-ink/10 pt-[18px]"
        >
          {a.whyItMatters && (
            <div className="flex flex-col gap-1.5">
              <Label as="p">{t("pf.detail.whyMatters")}</Label>
              <p className="dash-body text-sol-ink">{a.whyItMatters}</p>
            </div>
          )}
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <Label as="p">
              {t("pf.evidence.title")} · {a.evidence.length}
            </Label>
            <p className="dash-meta">
              {t("pf.updated", { date: formatDate(a.updatedAt, locale) })}
            </p>
          </div>
          {a.evidence.length === 0 ? (
            <p className="dash-body">{t("pf.evidence.none")}</p>
          ) : (
            <ul className="flex flex-col" data-testid="assumption-evidence">
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
      )}
    </MistCard>
  );
}

function MissionLink({ mission: m }: { mission: LinkedMissionDTO }) {
  const { t } = useLocale();
  const title = useMissionTitle(m.weekId, m.id, m.title);
  const label = [m.weekNumber ? t("pf.missions.week", { n: m.weekNumber }) : null, title]
    .filter(Boolean)
    .join(": ");
  return m.weekNumber ? (
    <Link
      to="/dashboard/roadmap/mission/$missionId"
      params={{ missionId: m.id }}
      data-testid="linked-mission"
      className="inline-flex min-h-11 flex-wrap items-center gap-2.5 text-[18px] font-medium leading-[1.3] text-sol-cobalt-deep hover:underline"
    >
      {label}
      <span className="font-normal text-sol-secondary">
        · {t(`pf.missions.state.${m.state}` as const)}
      </span>
      <Arrow />
    </Link>
  ) : (
    <p className="flex min-h-11 items-center text-[18px] text-sol-ink" data-testid="linked-mission">
      {label}
    </p>
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

/** One recorded piece of proof, as a row (no card inside the card). */
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
  const link =
    "inline-flex min-h-11 items-center gap-1.5 text-[17px] font-medium text-sol-cobalt-deep hover:underline";
  return (
    <div
      className="flex flex-col gap-2 border-b border-sol-ink/10 py-4 first:pt-0 last:border-b-0"
      data-testid="evidence-item"
      data-signal={e.signal}
    >
      <div className="flex flex-wrap items-center gap-2.5">
        <SignalBadge signal={e.signal} />
        {e.addedByUser && (
          <span className="dash-meta font-semibold" data-testid="added-by-you">
            {t("v2.proof.addedByYou")}
          </span>
        )}
        <span className="dash-meta">
          {t(`pf.type.${e.type}` as const)} · {formatDate(e.occurredOn, locale)}
          {e.sourcePerson ? ` · ${e.sourcePerson}` : ""}
        </span>
      </div>
      {e.title && <p className="text-[18px] font-semibold text-sol-ink">{e.title}</p>}
      <p className="whitespace-pre-line text-[18px] leading-relaxed text-sol-ink" dir="auto">
        {e.summary}
      </p>
      {e.taskTitle && <p className="dash-meta">{t("pf.fromMission", { title: e.taskTitle })}</p>}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
        {e.url && (
          <a href={e.url} target="_blank" rel="noreferrer noopener" className={link}>
            {t("pf.link")}
            <ExternalLink className="size-4" aria-hidden="true" />
          </a>
        )}
        {e.hasFile && (
          <button type="button" onClick={() => file.mutate()} className={link}>
            <FileText className="size-4" aria-hidden="true" />
            {e.fileName ?? t("pf.file.open")}
          </button>
        )}
        <button type="button" onClick={onEdit} data-testid="edit-evidence" className={link}>
          {editLabel ?? t("pf.edit")}
        </button>
        <button type="button" onClick={onDelete} data-testid="delete-evidence" className={link}>
          {t("pf.delete")}
        </button>
      </div>
    </div>
  );
}
