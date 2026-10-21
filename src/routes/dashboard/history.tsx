import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Check,
  CircleCheck,
  Compass,
  FileText,
  GitCompareArrows,
  Map as MapIcon,
  X,
  type LucideIcon,
} from "lucide-react";

import { FitPill } from "@/components/founder/OpportunityCards";
import {
  Button,
  Card,
  EmptyState,
  ErrorPanel,
  LinkButton,
  PageSkeleton,
  Pill,
  type PillTone,
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
import {
  deleteConsultation,
  getDecisionHistory,
  restoreDirection,
  type HistoryEntry,
  type HistoryRoadmapStatus,
} from "@/lib/actions/history";
import { useRangeText } from "@/components/founder/fit";
import { statusIdFromEnglish, useLabels } from "@/components/consultation/labels";
import {
  compareConsultations,
  directionDiff,
  type CompareField,
  type RowState,
} from "@/lib/history/compare";
import type { MessageKey } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { qk, useFounderState, useInvalidateFounder } from "@/lib/queries";
import { formatDate } from "@/components/founder/proof/bits";
import { PageHero } from "@/components/founder/proof/PageHero";
import { useTranslatedTitle } from "@/lib/use-translation";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/history")({
  component: HistoryPage,
  head: () => ({
    meta: [{ title: "History — Solventia" }, { name: "robots", content: "noindex" }],
  }),
});

const ROADMAP_TONE: Record<HistoryRoadmapStatus, PillTone> = {
  none: "neutral",
  building: "cobalt",
  active: "cobalt",
  completed: "champagne",
  archived: "neutral",
  failed: "warning",
};

/** A direction's name in the reader's language (translated once, then cached). */
function TranslatedTitle({ id, title }: { id: string; title: string }) {
  return <>{useTranslatedTitle(id, title)}</>;
}

function HistoryPage() {
  const { t, locale } = useLocale();
  const query = useQuery({
    queryKey: qk.history,
    queryFn: () => getDecisionHistory(),
    staleTime: 15_000,
  });
  const founder = useFounderState();
  const [restoring, setRestoring] = useState<HistoryEntry | null>(null);
  const [deleting, setDeleting] = useState<HistoryEntry | null>(null);
  const [comparing, setComparing] = useState<string[]>([]);
  const invalidate = useInvalidateFounder();
  const navigate = useNavigate();
  const restoringTitle = useTranslatedTitle(restoring?.selected?.id, restoring?.selected?.title);
  const currentDirectionTitle = useTranslatedTitle(
    founder.data?.direction.selectedId,
    founder.data?.direction.selectedId
      ? founder.data.briefs[founder.data.direction.selectedId]?.title
      : null,
  );

  const restore = useMutation({
    mutationFn: (opportunityId: string) => restoreDirection({ data: { opportunityId } }),
    onSuccess: async () => {
      await invalidate();
      toast.success(t("hist.restored"));
      setRestoring(null);
      void navigate({ to: "/dashboard" });
    },
    onError: (err) => {
      console.error("[history] restore failed:", err);
      toast.error(t("hist.restoreError"));
    },
  });

  const remove = useMutation({
    mutationFn: (consultationId: string) => deleteConsultation({ data: { consultationId } }),
    onSuccess: async (_res, consultationId) => {
      await Promise.all([invalidate(), query.refetch()]);
      setComparing((ids) => ids.filter((id) => id !== consultationId));
      toast.success(t("hist.deleted"));
      setDeleting(null);
    },
    onError: (err) => {
      console.error("[history] delete failed:", err);
      toast.error(t("hist.deleteError"));
    },
  });

  if (query.isPending) return <PageSkeleton label={t("shell.skeleton.loading")} />;
  if (query.isError || !query.data) {
    return <ErrorPanel onRetry={() => void query.refetch()} retrying={query.isFetching} />;
  }
  const entries = query.data;
  const pair = comparing
    .map((id) => entries.find((e) => e.consultationId === id))
    .filter((e): e is HistoryEntry => Boolean(e));
  const toggleCompare = (id: string) =>
    setComparing((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id].slice(-2),
    );
  const monthFmt = new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", {
    month: "long",
    year: "numeric",
  });
  const weekdayFmt = new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", {
    weekday: "long",
  });
  const weekdayOf = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "" : weekdayFmt.format(d);
  };
  const monthOf = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "" : monthFmt.format(d);
  };

  return (
    <div className="flex flex-col gap-8" data-testid="history-page">
      <PageHero title={t("hist.title")} subtitle={t("hist.subtitle2")} />

      {entries.length === 0 ? (
        <EmptyState
          title={t("hist.emptyTitle")}
          body={t("hist.emptyBody")}
          action={
            <LinkButton to="/consultation" variant="primary" size="lg">
              {t("nav.findMyBusinessIdea")}
            </LinkButton>
          }
        />
      ) : (
        <>
          {pair.length === 2 && (
            <ComparePanel a={pair[0]} b={pair[1]} onClear={() => setComparing([])} />
          )}
          {pair.length === 1 && entries.length > 1 && (
            <p
              role="status"
              className="rounded-2xl border border-sol-cobalt/25 bg-sol-cobalt-ultralight px-5 py-3 text-[0.9375rem] text-sol-ink"
            >
              {t("hist.compare.hint")}
            </p>
          )}

          <ol className="flex flex-col" data-testid="history-timeline">
            {entries.map((entry, i) => {
              const month = monthOf(entry.createdAt);
              const showMonth = month && (i === 0 || monthOf(entries[i - 1].createdAt) !== month);
              return (
                <li key={entry.consultationId} className="flex flex-col">
                  {showMonth && (
                    <p className="pb-3 pt-2 text-[0.9375rem] font-semibold uppercase tracking-[0.12em] text-sol-secondary">
                      {month}
                    </p>
                  )}
                  <div className="grid gap-x-6 pb-8 @2xl:grid-cols-[9rem_1fr]">
                    <div className="hidden @2xl:flex @2xl:flex-col @2xl:items-end @2xl:pt-6">
                      <p className="text-[1.75rem] font-semibold leading-none text-sol-ink">
                        {new Date(entry.createdAt).getDate()}
                      </p>
                      <p className="mt-1 text-[0.9375rem] text-sol-secondary">
                        {weekdayOf(entry.createdAt)}
                      </p>
                    </div>
                    <EntryCard
                      entry={entry}
                      comparing={comparing.includes(entry.consultationId)}
                      canCompare={entries.length > 1}
                      onCompare={() => toggleCompare(entry.consultationId)}
                      onRestore={() => setRestoring(entry)}
                      onDelete={() => setDeleting(entry)}
                    />
                  </div>
                </li>
              );
            })}
          </ol>
        </>
      )}

      <AlertDialog
        open={Boolean(restoring)}
        onOpenChange={(open) => !open && !restore.isPending && setRestoring(null)}
      >
        <AlertDialogContent data-testid="restore-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("hist.restoreTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {restoring?.selected
                ? t("hist.restoreBody", { title: restoringTitle ?? restoring.selected.title })
                : t("hist.restoreBodyGeneric")}
              {currentDirectionTitle
                ? ` ${t("hist.restoreArchive", { current: currentDirectionTitle })}`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restore.isPending}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              data-testid="confirm-restore"
              disabled={restore.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (restoring?.selected) restore.mutate(restoring.selected.id);
              }}
            >
              {restore.isPending ? t("common.saving") : t("hist.restoreConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && !remove.isPending && setDeleting(null)}
      >
        <AlertDialogContent data-testid="delete-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("hist.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("hist.deleteBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              data-testid="confirm-delete"
              disabled={remove.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (deleting) remove.mutate(deleting.consultationId);
              }}
            >
              {remove.isPending ? t("common.saving") : t("hist.deleteConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** Each stored profile value in the reader's language, or null when it was never given. */
function useSnapshotText() {
  const { t, td } = useLocale();
  const L = useLabels();
  const range = useRangeText();
  return (entry: HistoryEntry, field: CompareField): string | null => {
    const p = entry.profile;
    switch (field) {
      case "status": {
        if (!p.status) return null;
        const id = statusIdFromEnglish(p.status);
        return id ? td(`opt.status.${id}`, undefined, p.status) : p.status;
      }
      case "location": {
        const parts = [
          p.place.city,
          p.place.state ? L.state(p.place.state) : null,
          p.place.country ? L.country(p.place.country) : null,
        ].filter(Boolean);
        return parts.length > 0 ? parts.join(", ") : null;
      }
      case "hours":
        return p.hours ? range.hours(p.hours.min, p.hours.max ?? -1) : null;
      case "capital":
        return p.capital && p.currency
          ? range.money(p.capital.min, p.capital.max ?? -1, p.currency)
          : null;
      case "scale":
        return p.scale ? L.label("scale", p.scale) : null;
      case "skills":
        return p.skills.length > 0 ? p.skills.map((s) => L.skill(s)).join(" · ") : null;
      case "experienceYears":
        return p.experienceYears ? t("hist.years", { n: p.experienceYears }) : null;
    }
  };
}

/** One consultation, told as what happened: completed → directions → choice →
 * roadmap → progress. Only stored facts and dates; a step that never happened
 * says so instead of being filled in. */
function EntryCard({
  entry,
  comparing,
  canCompare,
  onCompare,
  onRestore,
  onDelete,
}: {
  entry: HistoryEntry;
  comparing: boolean;
  canCompare: boolean;
  onCompare: () => void;
  onRestore: () => void;
  onDelete: () => void;
}) {
  const { t, locale } = useLocale();
  const snapshot = useSnapshotText();
  const facts = (["status", "location", "hours", "capital", "scale"] as const)
    .map((f) => ({ field: f, text: snapshot(entry, f) }))
    .filter((f): f is { field: (typeof f)["field"]; text: string } => Boolean(f.text));

  const steps: { icon: LucideIcon; done: boolean; body: React.ReactNode; testId: string }[] = [
    {
      icon: FileText,
      done: true,
      testId: "event-consultation",
      body: (
        <>
          <p className="font-medium text-sol-ink">{t("hist.ev.consultation")}</p>
          <p className="text-[0.9375rem] text-sol-secondary @2xl:hidden">
            {formatDate(entry.createdAt, locale)}
          </p>
        </>
      ),
    },
    {
      icon: Compass,
      done: entry.directions.length > 0,
      testId: "event-directions",
      body: (
        <>
          <p className="font-medium text-sol-ink">
            {t("hist.ev.directions", { n: entry.directions.length })}
          </p>
          {entry.directions.length > 0 && (
            <ul className="mt-2 flex flex-col gap-2">
              {entry.directions.map((d) => (
                <li
                  key={d.id}
                  className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[0.9375rem] text-sol-ink"
                >
                  <span className={cn("min-w-0", d.id === entry.selected?.id && "font-semibold")}>
                    <TranslatedTitle id={d.id} title={d.title} />
                  </span>
                  <FitPill fit={d.fit} />
                </li>
              ))}
            </ul>
          )}
        </>
      ),
    },
    {
      icon: CircleCheck,
      done: Boolean(entry.selected),
      testId: "event-chosen",
      body: entry.selected ? (
        <p className="text-sol-ink">
          <span className="text-sol-secondary">{t("hist.ev.chosen")} </span>
          <span className="font-semibold">
            <TranslatedTitle id={entry.selected.id} title={entry.selected.title} />
          </span>
        </p>
      ) : (
        <p className="text-sol-secondary">{t("hist.ev.noChoice")}</p>
      ),
    },
    {
      icon: MapIcon,
      done: entry.roadmapStatus !== "none",
      testId: "event-roadmap",
      body: (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <p
              className={cn(
                "font-medium",
                entry.roadmapStatus === "none" ? "text-sol-secondary" : "text-sol-ink",
              )}
            >
              {entry.roadmapStatus === "none"
                ? t("hist.ev.roadmapNone")
                : t(`hist.ev.${entry.roadmapStatus}` as MessageKey)}
            </p>
            {entry.roadmapStatus !== "none" && (
              <Pill tone={ROADMAP_TONE[entry.roadmapStatus]}>
                {t(`hist.roadmap.${entry.roadmapStatus}` as const)}
              </Pill>
            )}
          </div>
          {(entry.roadmapBuiltAt || entry.roadmapCompletedAt) && (
            <p className="text-[0.9375rem] text-sol-secondary">
              {[entry.roadmapBuiltAt, entry.roadmapCompletedAt]
                .filter((d): d is string => Boolean(d))
                .map((d) => formatDate(d, locale))
                .join(" → ")}
            </p>
          )}
          {entry.progress && entry.progress.weeksTotal > 0 && (
            <p className="mt-1 text-[0.9375rem] text-sol-ink" data-testid="history-progress">
              {t("hist.ev.progress", {
                w: entry.progress.weeksCompleted,
                t: entry.progress.weeksTotal,
                m: entry.progress.missionsCompleted,
                e: entry.progress.evidence,
              })}
            </p>
          )}
        </>
      ),
    },
  ];

  return (
    <Card
      as="article"
      className={cn(
        "flex flex-col gap-6 p-5 shadow-none sm:p-7",
        entry.isCurrent ? "border-sol-cobalt/40" : "border-sol-border",
        comparing && "ring-2 ring-sol-cobalt/40",
      )}
      data-testid="history-entry"
      data-current={entry.isCurrent}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[1.25rem] font-semibold text-sol-ink">
          {formatDate(entry.createdAt, locale)}
        </h2>
        {entry.isCurrent && <Pill tone="cobalt">{t("hist.current")}</Pill>}
      </div>

      {facts.length > 0 && (
        <div>
          <p className="text-[0.9375rem] font-semibold text-sol-secondary">{t("hist.snapshot")}</p>
          <ul className="mt-2 flex flex-wrap gap-2" data-testid="history-profile">
            {facts.map((f) => (
              <li
                key={f.field}
                className="rounded-full border border-sol-border bg-sol-pearl px-3.5 py-1.5 text-[0.9375rem] text-sol-ink"
              >
                {f.text}
              </li>
            ))}
          </ul>
        </div>
      )}

      <ol className="flex flex-col" aria-label={t("hist.title")}>
        {steps.map((s, i) => (
          <li key={s.testId} className="relative flex gap-4 pb-5 last:pb-0" data-testid={s.testId}>
            {i < steps.length - 1 && (
              <span
                aria-hidden="true"
                className={cn(
                  "absolute left-[1.0625rem] top-9 bottom-0 w-px",
                  steps[i + 1].done ? "bg-sol-cobalt/40" : "bg-sol-border",
                )}
              />
            )}
            <span
              aria-hidden="true"
              className={cn(
                "relative flex size-9 shrink-0 items-center justify-center rounded-full border",
                s.done
                  ? "border-sol-cobalt/30 bg-sol-cobalt-soft text-sol-cobalt-deep"
                  : "border-sol-border bg-sol-surface text-sol-secondary",
              )}
            >
              <s.icon className="size-4" strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1 pt-1.5 text-[0.9375rem] leading-snug">{s.body}</div>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap gap-3 border-t border-sol-border pt-5">
        <LinkButton
          to="/dashboard"
          search={entry.isCurrent ? {} : { consultation: entry.consultationId }}
          variant="secondary"
          data-testid="history-review"
        >
          {t("hist.review")}
        </LinkButton>
        {canCompare && (
          <Button
            variant={comparing ? "soft" : "ghost"}
            onClick={onCompare}
            aria-pressed={comparing}
            data-testid="history-compare"
          >
            {comparing ? (
              <Check className="size-4" aria-hidden="true" />
            ) : (
              <GitCompareArrows className="size-4" aria-hidden="true" />
            )}
            {comparing ? t("hist.compare.selected") : t("hist.compare")}
          </Button>
        )}
        {entry.canRestore && (
          <Button variant="soft" onClick={onRestore} data-testid="history-restore">
            {t("hist.restore")}
          </Button>
        )}
        {!entry.isCurrent && (
          <Button variant="danger" onClick={onDelete} data-testid="history-delete">
            {t("hist.delete")}
          </Button>
        )}
      </div>
    </Card>
  );
}

const STATE_TONE: Record<RowState, PillTone> = {
  same: "neutral",
  changed: "cobalt",
  unknown: "neutral",
};

/** Two consultations side by side — the stored values and whether each changed. */
function ComparePanel({
  a,
  b,
  onClear,
}: {
  a: HistoryEntry;
  b: HistoryEntry;
  onClear: () => void;
}) {
  const { t, locale } = useLocale();
  const snapshot = useSnapshotText();
  // Oldest on the left, so the table reads as "then → now".
  const [older, newer] = a.createdAt <= b.createdAt ? [a, b] : [b, a];
  const rows = compareConsultations(older.profile, newer.profile);
  const dirs = directionDiff(older.directions, newer.directions);
  // Both chose → compare the titles; one chose and the other did not → changed.
  const sameChoice =
    older.selected && newer.selected
      ? older.selected.title.trim().toLowerCase() === newer.selected.title.trim().toLowerCase()
      : older.selected || newer.selected
        ? false
        : null;
  const notRecorded = <span className="text-sol-secondary">{t("hist.notProvided")}</span>;
  const directionsOf = (entry: HistoryEntry, only: string[]) => (
    <ul className="flex flex-col gap-1.5">
      {entry.directions.map((d) => (
        <li key={d.id} className="flex flex-wrap items-center gap-2">
          <TranslatedTitle id={d.id} title={d.title} />
          {only.includes(d.title) && (
            <span className="text-[0.9375rem] font-semibold text-sol-cobalt-deep">
              {t("hist.compare.onlyHere")}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
  const roadmapOf = (e: HistoryEntry) => (
    <>
      {t(`hist.roadmap.${e.roadmapStatus}` as const)}
      {e.progress && e.progress.weeksTotal > 0 && (
        <span className="block text-[0.9375rem] text-sol-secondary">
          {t("hist.ev.progress", {
            w: e.progress.weeksCompleted,
            t: e.progress.weeksTotal,
            m: e.progress.missionsCompleted,
            e: e.progress.evidence,
          })}
        </span>
      )}
    </>
  );
  const chosenOf = (e: HistoryEntry) =>
    e.selected ? (
      <TranslatedTitle id={e.selected.id} title={e.selected.title} />
    ) : (
      <span className="text-sol-secondary">{t("hist.noneSelected")}</span>
    );
  const dirsChanged = dirs.onlyA.length + dirs.onlyB.length > 0;
  // One list of lines, drawn as a table on wide screens and as stacked rows on phones.
  const lines: {
    key: string;
    label: string;
    older: React.ReactNode;
    newer: React.ReactNode;
    state: RowState | null;
  }[] = [
    ...rows.map((r) => ({
      key: r.field,
      label: t(`hist.compare.field.${r.field}` as const),
      older: snapshot(older, r.field) ?? notRecorded,
      newer: snapshot(newer, r.field) ?? notRecorded,
      state: r.state,
    })),
    {
      key: "directions",
      label: t("hist.compare.directions"),
      older: directionsOf(older, dirs.onlyA),
      newer: directionsOf(newer, dirs.onlyB),
      state: dirsChanged ? "changed" : "same",
    },
    {
      key: "chosen",
      label: t("hist.compare.chosen"),
      older: chosenOf(older),
      newer: chosenOf(newer),
      state: sameChoice === null ? "unknown" : sameChoice ? "same" : "changed",
    },
    {
      key: "roadmap",
      label: t("hist.compare.roadmap"),
      older: roadmapOf(older),
      newer: roadmapOf(newer),
      state: null,
    },
  ];
  const statePill = (state: RowState | null) =>
    state && <Pill tone={STATE_TONE[state]}>{t(`hist.compare.state.${state}` as const)}</Pill>;
  const cell = "px-3 py-3 align-top text-[0.9375rem] leading-snug text-sol-ink";

  return (
    <Card className="flex flex-col gap-5 p-5 sm:p-7" data-testid="history-compare-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[1.25rem] font-semibold text-sol-ink">{t("hist.compare.title")}</h2>
          <p className="mt-1 text-[0.9375rem] text-sol-secondary">{t("hist.compare.body")}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClear} data-testid="history-compare-clear">
          <X className="size-4" aria-hidden="true" />
          {t("hist.compare.clear")}
        </Button>
      </div>

      <table className="hidden w-full border-collapse @2xl:table">
        <caption className="sr-only">{t("hist.compare.aria")}</caption>
        <thead>
          <tr className="border-b border-sol-border text-left">
            <th scope="col" className="px-3 pb-3 text-[0.9375rem] font-semibold text-sol-secondary">
              {t("hist.compare.field")}
            </th>
            {[older, newer].map((e) => (
              <th
                key={e.consultationId}
                scope="col"
                className="px-3 pb-3 text-[0.9375rem] font-semibold text-sol-ink"
              >
                {formatDate(e.createdAt, locale)}
              </th>
            ))}
            <th scope="col" className="px-3 pb-3">
              <span className="sr-only">{t("hist.compare.state.changed")}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => (
            <tr
              key={l.key}
              className="border-b border-sol-border/70 last:border-b-0"
              data-testid={`compare-row-${l.key}`}
              data-state={l.state ?? undefined}
            >
              <th scope="row" className={cn(cell, "font-medium text-sol-secondary")}>
                {l.label}
              </th>
              <td className={cell}>{l.older}</td>
              <td className={cell}>{l.newer}</td>
              <td className={cn(cell, "text-right")}>{statePill(l.state)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <dl
        className="flex flex-col divide-y divide-sol-border @2xl:hidden"
        aria-label={t("hist.compare.aria")}
      >
        {lines.map((l) => (
          <div
            key={l.key}
            className="flex flex-col gap-2 py-3.5"
            data-testid={`compare-item-${l.key}`}
          >
            <dt className="flex items-center justify-between gap-3 text-[0.9375rem] font-semibold text-sol-secondary">
              {l.label}
              {statePill(l.state)}
            </dt>
            {[
              { e: older, v: l.older },
              { e: newer, v: l.newer },
            ].map(({ e, v }) => (
              <dd
                key={e.consultationId}
                className="flex gap-3 text-[0.9375rem] leading-snug text-sol-ink"
              >
                <span className="w-20 shrink-0 text-[0.9375rem] text-sol-secondary">
                  {formatDate(e.createdAt, locale)}
                </span>
                <span className="min-w-0 flex-1">{v}</span>
              </dd>
            ))}
          </div>
        ))}
      </dl>
    </Card>
  );
}
