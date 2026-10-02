import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

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
import { getDecisionHistory, restoreDirection, type HistoryEntry } from "@/lib/actions/history";
import { formatMoney } from "@/lib/country-currency";
import { statusIdFromEnglish } from "@/components/consultation/labels";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { qk, useFounderState, useInvalidateFounder } from "@/lib/queries";
import { formatDate } from "@/components/founder/proof/bits";
import { useTranslatedTitle } from "@/lib/use-translation";

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
  const { t } = useLocale();
  const query = useQuery({
    queryKey: qk.history,
    queryFn: () => getDecisionHistory(),
    staleTime: 15_000,
  });
  const founder = useFounderState();
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
  const currentTitle = currentDirectionTitle;

  return (
    <div className="flex flex-col gap-8" data-testid="history-page">
      <PageHeader title={t("hist.title")} subtitle={t("hist.subtitle")} />

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
        <ol className="flex flex-col gap-5">
          {query.data.map((entry) => (
            <li key={entry.consultationId}>
              <EntryCard entry={entry} onRestore={() => setRestoring(entry)} />
            </li>
          ))}
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
    </div>
  );
}

function EntryCard({ entry, onRestore }: { entry: HistoryEntry; onRestore: () => void }) {
  const { t, td, locale } = useLocale();
  const p = entry.profile;
  const statusId = p.status ? statusIdFromEnglish(p.status) : null;
  const facts = [
    statusId ? td(`opt.status.${statusId}`, undefined, p.status ?? "") : p.status,
    p.age ? t("hist.age", { n: p.age }) : null,
    [p.state, p.country].filter(Boolean).join(", ") || null,
    p.weeklyHours ? t("common.hoursPerWeek", { n: p.weeklyHours }) : null,
    p.capitalAmount && p.currency ? formatMoney(p.capitalAmount, p.currency) : null,
  ].filter(Boolean);

  const roadmapTone =
    entry.roadmapStatus === "active"
      ? "violet"
      : entry.roadmapStatus === "completed"
        ? "champagne"
        : entry.roadmapStatus === "failed"
          ? "warning"
          : "neutral";

  return (
    <Card
      as="article"
      className="flex flex-col gap-5 p-6 sm:p-7"
      data-testid="history-entry"
      data-current={entry.isCurrent}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="sol-h3">{formatDate(entry.createdAt, locale)}</h2>
        {entry.isCurrent && <Pill tone="violet">{t("hist.current")}</Pill>}
      </div>

      {facts.length > 0 && (
        <p
          className="text-[1.0625rem] leading-snug text-sol-secondary"
          data-testid="history-profile"
        >
          {facts.join(" · ")}
        </p>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <p className="sol-eyebrow">{t("hist.generated", { n: entry.directions.length })}</p>
          <ul className="mt-2 flex flex-col gap-2">
            {entry.directions.map((d) => (
              <li
                key={d.id}
                className="flex items-start justify-between gap-3 text-[1.0625rem] text-sol-ink"
              >
                <span className={d.id === entry.selected?.id ? "font-semibold" : undefined}>
                  <TranslatedTitle id={d.id} title={d.title} />
                </span>
                <FitPill fit={d.fit} />
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-3">
          <div>
            <p className="sol-eyebrow">{t("hist.selected")}</p>
            <p className="mt-2 text-[1.0625rem] font-semibold text-sol-ink">
              {entry.selected ? (
                <TranslatedTitle id={entry.selected.id} title={entry.selected.title} />
              ) : (
                t("hist.noneSelected")
              )}
            </p>
          </div>
          <div>
            <p className="sol-eyebrow">{t("hist.roadmap")}</p>
            <div className="mt-2">
              <Pill tone={roadmapTone}>{t(`hist.roadmap.${entry.roadmapStatus}` as const)}</Pill>
            </div>
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
      </div>
    </Card>
  );
}
