import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowRight,
  CircleCheck,
  Clock3,
  Compass,
  GraduationCap,
  History as HistoryIcon,
  Map as MapIcon,
  MapPin,
  UserRound,
  Wallet,
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
} from "@/lib/actions/history";
import { formatMoney } from "@/lib/country-currency";
import { statusIdFromEnglish } from "@/components/consultation/labels";
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
    onSuccess: async () => {
      await Promise.all([invalidate(), query.refetch()]);
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
  const currentTitle = currentDirectionTitle;
  const monthFmt = new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", {
    month: "long",
    year: "numeric",
  });
  const monthOf = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "" : monthFmt.format(d);
  };

  return (
    <div className="flex flex-col gap-8" data-testid="history-page">
      <PageHero title={t("hist.title")} subtitle={t("hist.subtitle")} />

      {query.data.length === 0 ? (
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
        <ol className="relative flex flex-col gap-5" data-testid="history-timeline">
          {/* The rail the consultations hang from, newest first. */}
          <span
            aria-hidden="true"
            className="absolute bottom-8 left-5 top-8 w-0.5 rounded-full bg-gradient-to-b from-sol-cobalt/50 via-sol-border-strong to-transparent"
          />
          {query.data.map((entry, i) => {
            const month = monthOf(entry.createdAt);
            const showMonth = month && (i === 0 || monthOf(query.data[i - 1].createdAt) !== month);
            return (
              <li key={entry.consultationId} className="relative pl-12 sm:pl-14">
                {showMonth && (
                  <p className="mb-3 text-[0.875rem] font-medium text-sol-secondary">{month}</p>
                )}
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute left-0 flex size-10 items-center justify-center rounded-full border",
                    showMonth ? "top-14" : "top-6",
                    entry.isCurrent
                      ? "border-sol-cobalt bg-sol-cobalt text-white shadow-[0_6px_18px_rgba(112,88,215,0.3)]"
                      : "border-sol-border-strong bg-sol-surface text-sol-secondary",
                  )}
                >
                  {entry.isCurrent ? (
                    <Compass className="size-5" />
                  ) : (
                    <HistoryIcon className="size-5" />
                  )}
                </span>
                <EntryCard
                  entry={entry}
                  onRestore={() => setRestoring(entry)}
                  onDelete={() => setDeleting(entry)}
                />
              </li>
            );
          })}
        </ol>
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
              {currentTitle ? ` ${t("hist.restoreArchive", { current: currentTitle })}` : ""}
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

/** One consultation as a small flow: what was found → what was chosen → where the
 * roadmap stands, so the history reads as a path rather than a table of text. */
function EntryCard({
  entry,
  onRestore,
  onDelete,
}: {
  entry: HistoryEntry;
  onRestore: () => void;
  onDelete: () => void;
}) {
  const { t, td, locale } = useLocale();
  const p = entry.profile;
  const statusId = p.status ? statusIdFromEnglish(p.status) : null;
  const facts: { icon: LucideIcon; text: string }[] = [
    {
      icon: GraduationCap,
      text: statusId ? td(`opt.status.${statusId}`, undefined, p.status ?? "") : (p.status ?? ""),
    },
    { icon: UserRound, text: p.age ? t("hist.age", { n: p.age }) : "" },
    { icon: MapPin, text: [p.state, p.country].filter(Boolean).join(", ") },
    { icon: Clock3, text: p.weeklyHours ? t("common.hoursPerWeek", { n: p.weeklyHours }) : "" },
    {
      icon: Wallet,
      text: p.capitalAmount && p.currency ? formatMoney(p.capitalAmount, p.currency) : "",
    },
  ].filter((f) => f.text);

  const roadmapTone =
    entry.roadmapStatus === "active"
      ? "violet"
      : entry.roadmapStatus === "completed"
        ? "champagne"
        : entry.roadmapStatus === "failed"
          ? "warning"
          : "neutral";

  const nodeClass =
    "relative flex flex-col gap-3 rounded-2xl border border-sol-border bg-sol-pearl p-4";
  const nodeIcon =
    "flex size-9 shrink-0 items-center justify-center rounded-xl bg-sol-champagne-soft text-sol-champagne-deep";
  const arrow = (
    <span
      aria-hidden="true"
      className="absolute -right-[1.15rem] top-1/2 z-10 hidden size-7 -translate-y-1/2 items-center justify-center rounded-full border border-sol-border bg-sol-surface text-sol-cobalt shadow-sm md:flex"
    >
      <ArrowRight className="size-3.5" />
    </span>
  );

  return (
    <Card
      as="article"
      className="flex flex-col gap-5 border-sol-border p-5 shadow-none sm:p-7"
      data-testid="history-entry"
      data-current={entry.isCurrent}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="sol-h3">{formatDate(entry.createdAt, locale)}</h2>
        {entry.isCurrent && <Pill tone="cobalt">{t("hist.current")}</Pill>}
      </div>

      {facts.length > 0 && (
        <ul className="flex flex-wrap gap-2" data-testid="history-profile">
          {facts.map((f) => (
            <li
              key={f.text}
              className="flex items-center gap-2 rounded-full bg-sol-ivory px-3.5 py-1.5 text-[0.9375rem] font-medium text-sol-ink"
            >
              <f.icon className="size-4 text-sol-champagne-deep" aria-hidden="true" />
              {f.text}
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-4 md:grid-cols-[1.7fr_1fr_1fr]">
        <div className={nodeClass}>
          <div className="flex items-center gap-3">
            <span className={nodeIcon}>
              <Compass className="size-5" aria-hidden="true" />
            </span>
            <p className="sol-eyebrow">{t("hist.generated", { n: entry.directions.length })}</p>
          </div>
          <ul className="flex flex-col gap-2.5">
            {entry.directions.map((d) => (
              <li
                key={d.id}
                className="flex flex-col items-start gap-1.5 text-[1.0625rem] text-sol-ink sm:flex-row sm:justify-between sm:gap-3"
              >
                <span className={d.id === entry.selected?.id ? "font-semibold" : undefined}>
                  <TranslatedTitle id={d.id} title={d.title} />
                </span>
                <FitPill fit={d.fit} />
              </li>
            ))}
          </ul>
          {arrow}
        </div>

        <div className={nodeClass}>
          <div className="flex items-center gap-3">
            <span className={nodeIcon}>
              <CircleCheck className="size-5" aria-hidden="true" />
            </span>
            <p className="sol-eyebrow">{t("hist.selected")}</p>
          </div>
          <p
            className={cn(
              "text-[1.0625rem] text-sol-ink",
              entry.selected ? "font-semibold" : "text-sol-secondary",
            )}
          >
            {entry.selected ? (
              <TranslatedTitle id={entry.selected.id} title={entry.selected.title} />
            ) : (
              t("hist.noneSelected")
            )}
          </p>
          {arrow}
        </div>

        <div className={nodeClass}>
          <div className="flex items-center gap-3">
            <span className={nodeIcon}>
              <MapIcon className="size-5" aria-hidden="true" />
            </span>
            <p className="sol-eyebrow">{t("hist.roadmap")}</p>
          </div>
          <div>
            <Pill tone={roadmapTone}>{t(`hist.roadmap.${entry.roadmapStatus}` as const)}</Pill>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <LinkButton
          to="/dashboard"
          search={entry.isCurrent ? {} : { consultation: entry.consultationId }}
          variant="secondary"
          data-testid="history-review"
        >
          {t("hist.review")}
        </LinkButton>
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
