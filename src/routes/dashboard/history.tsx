import { useState, type ReactNode } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { ErrorPanel, PageSkeleton } from "@/components/founder/ui";
import { FIT_WORD, useFounderFits } from "@/components/os/direction";
import {
  ActionArrow,
  OsDisplay,
  OsEyebrow,
  primaryActionClass,
  textActionClass,
} from "@/components/os/os";
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
import type { OpportunityBrief } from "@/lib/actions/founder";
import { getDecisionHistory, restoreDirection, type HistoryEntry } from "@/lib/actions/history";
import { getRoadmapView } from "@/lib/actions/roadmap";
import { formatMoney } from "@/lib/country-currency";
import { statusIdFromEnglish } from "@/components/consultation/labels";
import type { MessageKey } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { qk, useFounderState, useInvalidateFounder } from "@/lib/queries";
import { useTranslatedBrief, useTranslatedTitle } from "@/lib/use-translation";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/history")({
  component: HistoryPage,
  head: () => ({
    meta: [{ title: "History — Solventia" }, { name: "robots", content: "noindex" }],
  }),
});

/** A direction's name in the reader's language (translated once, then cached). */
function TranslatedTitle({ id, title }: { id: string; title: string }) {
  return <>{useTranslatedTitle(id, title) ?? title}</>;
}

/** Why it was chosen — the direction's own first reason it fits this founder (never a stock line). */
function ChoseWhy({ brief }: { brief: OpportunityBrief }) {
  return <>{(useTranslatedBrief(brief) ?? brief).whyFit[0]}</>;
}

type Filter = "all" | "directions" | "roadmap" | "milestones";
const FILTERS: { id: Filter; label: MessageKey }[] = [
  { id: "all", label: "os.hist.f.all" },
  { id: "directions", label: "os.hist.f.directions" },
  { id: "roadmap", label: "os.hist.f.roadmap" },
  { id: "milestones", label: "os.hist.f.milestones" },
];

interface StoryEvent {
  key: string;
  date: string;
  kind: Exclude<Filter, "all">;
  /** The small line: what happened ("You chose"). */
  label: string;
  /** The large line: what it was. */
  headline: ReactNode;
  why?: ReactNode;
  body?: ReactNode;
  testId?: string;
  current?: boolean;
}

/**
 * HISTORY — "How has my business evolved?" Not a log: an editorial timeline of the decisions
 * that shaped the business — the directions found, the one chosen and why, the roadmap
 * starting, adapting and reaching its milestones. Newest first; filter by what you want to see.
 */
function HistoryPage() {
  const { t, locale } = useLocale();
  const query = useQuery({
    queryKey: qk.history,
    queryFn: () => getDecisionHistory(),
    staleTime: 15_000,
  });
  const founder = useFounderState();
  const roadmapId = founder.data?.direction.roadmap?.id ?? null;
  const roadmap = useQuery({
    queryKey: qk.roadmap(roadmapId),
    queryFn: () => getRoadmapView({ data: { roadmapId: roadmapId! } }),
    enabled: Boolean(roadmapId),
    staleTime: 15_000,
  });
  const fits = useFounderFits(
    (query.data ?? []).flatMap((entry) => entry.directions.map((d) => d.id)),
  );
  const [filter, setFilter] = useState<Filter>("all");
  const [restoring, setRestoring] = useState<HistoryEntry | null>(null);
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

  if (query.isPending) return <PageSkeleton label={t("shell.skeleton.loading")} />;
  if (query.isError || !query.data) {
    return <ErrorPanel onRetry={() => void query.refetch()} retrying={query.isFetching} />;
  }

  // The story, assembled from real records only.
  const events: StoryEvent[] = [];
  for (const entry of query.data) {
    events.push({
      key: `found-${entry.consultationId}`,
      date: entry.createdAt,
      kind: "directions",
      label: t("os.hist.e.found", { n: entry.directions.length }),
      headline: (
        <ul className="flex flex-col gap-1.5">
          {entry.directions.map((d) => (
            <li
              key={d.id}
              className={d.id === entry.selected?.id ? "text-[#171A27]" : "text-[#454B59]"}
            >
              <TranslatedTitle id={d.id} title={d.title} />
              {fits.data?.[d.id] && (
                <span className="ml-2 text-[0.875rem] font-semibold uppercase tracking-[0.1em] text-[#7A5B2B]">
                  {t(FIT_WORD[fits.data[d.id].overall])}
                </span>
              )}
            </li>
          ))}
        </ul>
      ),
      body: <EntryFooter entry={entry} onRestore={() => setRestoring(entry)} />,
      testId: "history-entry",
      current: entry.isCurrent,
    });
    if (entry.selected) {
      events.push({
        key: `chose-${entry.consultationId}`,
        date: entry.createdAt,
        kind: "directions",
        label: t("os.hist.e.chose"),
        headline: <TranslatedTitle id={entry.selected.id} title={entry.selected.title} />,
        why: founder.data?.briefs[entry.selected.id]?.whyFit[0] ? (
          <ChoseWhy brief={founder.data.briefs[entry.selected.id]} />
        ) : undefined,
        // Where that choice went. The roadmap being viewed tells its own story below (began,
        // adapted, weeks done); any other one still says where it stands.
        body:
          entry.roadmapStatus !== "none" &&
          roadmap.data?.roadmap.opportunityId !== entry.selected.id ? (
            <p
              className="text-[1rem] font-semibold text-[#7A5B2B]"
              data-testid="history-roadmap-status"
            >
              {t("os.hist.roadmapStatus", { status: t(`hist.roadmap.${entry.roadmapStatus}`) })}
            </p>
          ) : undefined,
      });
    }
  }
  const view = roadmap.data;
  if (view) {
    if (view.roadmap.activatedAt) {
      events.push({
        key: "roadmap-began",
        date: view.roadmap.activatedAt,
        kind: "roadmap",
        label: t("os.hist.e.roadmap"),
        headline: (
          <TranslatedTitle id={view.roadmap.opportunityId} title={view.roadmap.opportunityTitle} />
        ),
      });
    }
    for (const w of view.weeks) {
      if (w.adaptationNote && w.unlockedAt) {
        events.push({
          key: `adapted-${w.id}`,
          date: w.unlockedAt,
          kind: "roadmap",
          label: t("os.hist.e.adapted"),
          headline: t("os.rm.week", { n: String(w.number).padStart(2, "0") }),
          why: w.adaptationNote,
        });
      }
      if (w.closedAt) {
        events.push({
          key: `done-${w.id}`,
          date: w.closedAt,
          kind: "milestones",
          label: t("os.hist.e.weekDone", { n: String(w.number).padStart(2, "0") }),
          headline: w.title,
        });
      }
    }
  }
  // Newest first; events of the same moment (found → chose) read as the story ran, latest step first.
  const ordered = events
    .map((e, i) => ({ e, i }))
    .sort((a, b) => b.e.date.localeCompare(a.e.date) || b.i - a.i)
    .map(({ e }) => e);
  const shown = ordered.filter((e) => filter === "all" || e.kind === filter);
  const day = (iso: string) =>
    new Date(iso).toLocaleDateString(locale === "hi" ? "hi-IN" : "en-IN", {
      day: "numeric",
      month: "short",
    });
  const year = (iso: string) => new Date(iso).getFullYear();

  return (
    <div className="flex flex-col gap-14" data-testid="history-page">
      {/* Nothing has happened yet: say so, instead of claiming a story that isn't there. */}
      <OsDisplay>
        {query.data.length === 0 ? (
          t("hist.emptyTitle")
        ) : (
          <>
            {t("os.hist.title.a")}
            <span className="block text-[#454B59]">{t("os.hist.title.b")}</span>
          </>
        )}
      </OsDisplay>

      {query.data.length === 0 ? (
        <div className="flex flex-col items-start gap-6">
          <p className="text-[1.25rem] text-[#2A2F3B]">{t("os.hist.empty")}</p>
          <Link to="/consultation" className={primaryActionClass}>
            {t("nav.findMyBusinessIdea")}
            <ActionArrow />
          </Link>
        </div>
      ) : (
        <>
          <div
            className="flex flex-wrap items-center gap-2"
            role="group"
            aria-label={t("os.hist.filter")}
          >
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={filter === f.id}
                onClick={() => setFilter(f.id)}
                data-testid={`history-filter-${f.id}`}
                className={cn(
                  "min-h-10 rounded-full border px-4 text-[0.9375rem] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2F62D9]",
                  filter === f.id
                    ? "border-[#171A27] bg-[#171A27] text-white"
                    : "border-[#171A27]/15 text-[#171A27] hover:border-[#171A27]/40",
                )}
              >
                {t(f.label)}
              </button>
            ))}
          </div>

          <ol className="flex flex-col" data-testid="history-timeline">
            {shown.map((e) => (
              <li
                key={e.key}
                className="grid gap-4 border-t border-[#171A27]/10 py-9 sm:grid-cols-[10rem_1fr] sm:gap-10"
                data-testid={e.testId}
                data-current={e.current}
              >
                <p className="flex items-baseline gap-2 sm:flex-col sm:gap-1">
                  <span className="font-os text-[1.625rem] font-medium uppercase leading-none tracking-[-0.02em] text-[#171A27]">
                    {day(e.date)}
                  </span>
                  <span className="text-[0.9375rem] font-medium text-[#454B59]">
                    {year(e.date)}
                  </span>
                </p>
                <div className="flex min-w-0 flex-col gap-3">
                  <OsEyebrow tone={e.kind === "milestones" ? "champagne" : "ink"}>
                    {e.label}
                  </OsEyebrow>
                  <div className="text-[clamp(1.25rem,1.05rem+0.6vw,1.6rem)] font-semibold leading-snug">
                    {e.headline}
                  </div>
                  {e.why && (
                    <p className="max-w-[60ch] text-[1.0625rem] leading-relaxed text-[#2A2F3B]">
                      <span className="font-semibold text-[#171A27]">{t("os.hist.why")}: </span>
                      {e.why}
                    </p>
                  )}
                  {e.body}
                </div>
              </li>
            ))}
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
    </div>
  );
}

/** The consultation's own facts, and the two actions on it (review, restore). */
function EntryFooter({ entry, onRestore }: { entry: HistoryEntry; onRestore: () => void }) {
  const { t, td } = useLocale();
  const p = entry.profile;
  const statusId = p.status ? statusIdFromEnglish(p.status) : null;
  const facts = [
    statusId ? td(`opt.status.${statusId}`, undefined, p.status ?? "") : (p.status ?? ""),
    p.age ? t("hist.age", { n: p.age }) : "",
    [p.state, p.country].filter(Boolean).join(", "),
    p.weeklyHours ? t("common.hoursPerWeek", { n: p.weeklyHours }) : "",
    p.capitalAmount && p.currency ? formatMoney(p.capitalAmount, p.currency) : "",
  ].filter(Boolean);
  return (
    <div className="flex flex-col gap-4 pt-1">
      {facts.length > 0 && (
        <p className="text-[1rem] text-[#454B59]" data-testid="history-profile">
          {facts.join(" · ")}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <Link
          to="/dashboard"
          search={entry.isCurrent ? {} : { consultation: entry.consultationId }}
          className={textActionClass}
          data-testid="history-review"
        >
          {t("hist.review")}
          <ActionArrow />
        </Link>
        {entry.canRestore && (
          <button
            type="button"
            onClick={onRestore}
            className={cn(textActionClass, "text-[#454B59]")}
            data-testid="history-restore"
          >
            {t("hist.restore")}
          </button>
        )}
        {entry.isCurrent && (
          <span className="text-[0.875rem] font-semibold uppercase tracking-[0.1em] text-[#7A5B2B]">
            {t("hist.current")}
          </span>
        )}
      </div>
    </div>
  );
}
