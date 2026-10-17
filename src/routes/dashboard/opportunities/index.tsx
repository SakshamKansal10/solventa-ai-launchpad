import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { z } from "zod";

import { ErrorPanel, PageSkeleton } from "@/components/founder/ui";
import { FIT_WORD, useDirection, useFounderFits } from "@/components/os/direction";
import { BusinessGraphic } from "@/components/os/graphics";
import {
  ActionArrow,
  OsDisplay,
  OsEyebrow,
  OsFact,
  OsFrame,
  OsLead,
  primaryActionClass,
  textActionClass,
} from "@/components/os/os";
import type { OpportunityBrief } from "@/lib/actions/founder";
import { chooseDirection, exploreMoreOpportunities } from "@/lib/actions/opportunities";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { useFounderState, useInvalidateFounder } from "@/lib/queries";
import { useTranslatedBrief } from "@/lib/use-translation";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/opportunities/")({
  validateSearch: z.object({ consultation: z.string().uuid().optional() }),
  component: OpportunitiesPage,
  head: () => ({
    meta: [{ title: "Opportunities — Solventia" }, { name: "robots", content: "noindex" }],
  }),
});

/**
 * OPPORTUNITIES — "What could I build?" The direction that leads (the one chosen, else the
 * strongest) dominates with its own model; the alternatives sit below it, smaller. Not a
 * marketplace: a short list of real options, each with who pays, what it costs and how to start.
 */
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

  if (founder.isPending) return <PageSkeleton label={t("shell.skeleton.loading")} />;
  if (founder.isError || !founder.data) {
    return <ErrorPanel onRetry={() => void founder.refetch()} retrying={founder.isFetching} />;
  }

  const { direction, briefs } = founder.data;
  const all = Object.values(briefs);
  const inView = all.filter((b) => b.consultationId === direction.consultationId);
  const selected = direction.selectedId ? briefs[direction.selectedId] : null;
  const ordered = inView
    .filter((b) => b.id !== selected?.id && b.status !== "dismissed")
    .sort((a, b) => direction.viewedIds.indexOf(a.id) - direction.viewedIds.indexOf(b.id));
  const lead = selected ?? ordered[0] ?? null;
  const alternatives = selected ? ordered : ordered.slice(1);
  const previous = all
    .filter(
      (b) =>
        b.id !== selected?.id &&
        (b.consultationId !== direction.consultationId || b.status === "dismissed"),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const canChoose = direction.isLatestConsultation;
  const count = (lead ? 1 : 0) + alternatives.length;

  if (all.length === 0) {
    return (
      <div className="flex flex-col items-start gap-8" data-testid="opportunities-page">
        <OsDisplay>{t("cc.none.cardTitle")}</OsDisplay>
        <OsLead>{t("cc.none.cardBody")}</OsLead>
        <Link to="/consultation" className={primaryActionClass}>
          {t("nav.findMyBusinessIdea")}
          <ActionArrow />
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-16 sm:gap-20" data-testid="opportunities-page">
      <OsDisplay>
        {t("os.opps.title.n", { n: count })}
        <span className="block text-[#454B59]">{t("os.opps.title.fit")}</span>
      </OsDisplay>

      {lead && (
        <LeadDirection
          brief={lead}
          chosen={Boolean(selected)}
          canChoose={canChoose && !selected}
          choosing={choose.isPending && choose.variables === lead.id}
          onChoose={() => choose.mutate(lead.id)}
        />
      )}

      {alternatives.length > 0 && (
        <section className="grid gap-6 @2xl:grid-cols-2" aria-label={t("opp.list.alternatives")}>
          {alternatives.map((b) => (
            <AlternativeDirection
              key={b.id}
              brief={b}
              canChoose={canChoose}
              choosing={choose.isPending && choose.variables === b.id}
              onChoose={() => choose.mutate(b.id)}
            />
          ))}
        </section>
      )}

      {canChoose && (
        <div className="flex flex-col items-start gap-2">
          <button
            type="button"
            onClick={() => explore.mutate()}
            disabled={explore.isPending || choose.isPending}
            className={textActionClass}
            data-testid="explore-more"
          >
            {explore.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {t("os.reveal.more")}
            <ActionArrow />
          </button>
        </div>
      )}

      {previous.length > 0 && (
        <section className="flex flex-col gap-4" aria-labelledby="prev-h">
          <h2
            id="prev-h"
            className="text-[0.875rem] font-semibold uppercase tracking-[0.12em] text-[#3C4250] [font-family:inherit]"
          >
            {t("os.opps.earlier")}
          </h2>
          <ul className="flex flex-col border-t border-[#171A27]/10">
            {previous.map((b) => (
              <PreviousDirection key={b.id} brief={b} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function LeadDirection({
  brief,
  chosen,
  canChoose,
  choosing,
  onChoose,
}: {
  brief: OpportunityBrief;
  chosen: boolean;
  canChoose: boolean;
  choosing: boolean;
  onChoose: () => void;
}) {
  const { t } = useLocale();
  const { direction } = useDirection(brief);
  const fit = useFounderFits([brief.id]).data?.[brief.id]?.overall;
  if (!direction) return null;
  const d = direction.detail;
  return (
    <article
      className="grid items-center gap-10 @4xl:grid-cols-[1.12fr_1fr] @4xl:gap-14"
      data-testid={chosen ? "opp-selected" : "opp-alternative"}
    >
      <div className="flex flex-col gap-6">
        <OsEyebrow tone="champagne">
          {chosen ? t("os.opps.yourDirection") : t("os.reveal.recommended")}
        </OsEyebrow>
        <OsDisplay as="h2" size="title">
          {direction.title}
        </OsDisplay>
        <OsLead>{direction.oneLiner}</OsLead>
        <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          {d?.customerHeadline && (
            <OsFact label={t("os.opps.whoPays")} value={d.customerHeadline} />
          )}
          {d?.startingCapital && <OsFact label={t("os.opps.cost")} value={d.startingCapital} />}
          {fit && <OsFact label={t("os.opps.fit")} value={t(FIT_WORD[fit])} />}
          {d?.firstExperiment && (
            <OsFact
              label={t("os.opps.firstMove")}
              value={d.firstExperiment}
              className="sm:col-span-2"
            />
          )}
        </dl>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-1">
          <Link
            to="/dashboard/opportunities/$id"
            params={{ id: direction.id }}
            className={primaryActionClass}
          >
            {t("os.opps.open")}
            <ActionArrow />
          </Link>
          {canChoose && (
            <button
              type="button"
              onClick={onChoose}
              disabled={choosing}
              className={textActionClass}
            >
              {choosing && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {t("cc.chooseDirection")}
            </button>
          )}
        </div>
      </div>
      <OsFrame className="p-4 sm:p-6">
        <BusinessGraphic
          kind={direction.kind}
          nodes={direction.nodes}
          label={direction.graphicLabel}
        />
      </OsFrame>
    </article>
  );
}

function AlternativeDirection({
  brief,
  canChoose,
  choosing,
  onChoose,
}: {
  brief: OpportunityBrief;
  canChoose: boolean;
  choosing: boolean;
  onChoose: () => void;
}) {
  const { t } = useLocale();
  const { direction } = useDirection(brief);
  if (!direction) return null;
  const d = direction.detail;
  return (
    <article
      className="flex flex-col gap-5 rounded-[24px] border border-[#171A27]/10 bg-white/70 p-6 sm:p-7"
      data-testid="opp-alternative"
    >
      <BusinessGraphic
        kind={direction.kind}
        nodes={direction.nodes}
        size="mini"
        label={direction.graphicLabel}
        className="rounded-xl border border-[#171A27]/[0.06] bg-[#FCFAF7]"
      />
      <div className="flex flex-col gap-2">
        <h3 className="font-os text-[1.5rem] font-medium uppercase leading-[1.05] tracking-[-0.02em] text-[#171A27]">
          {direction.title}
        </h3>
        <p className="text-[1rem] leading-snug text-[#2A2F3B]">{direction.oneLiner}</p>
      </div>
      <dl className="grid gap-4 sm:grid-cols-2">
        {d?.customerHeadline && <OsFact label={t("os.opps.whoPays")} value={d.customerHeadline} />}
        {d?.startingCapital && <OsFact label={t("os.opps.cost")} value={d.startingCapital} />}
      </dl>
      <div className="mt-auto flex flex-wrap items-center gap-x-6 gap-y-2 pt-2">
        <Link
          to="/dashboard/opportunities/$id"
          params={{ id: direction.id }}
          className={textActionClass}
        >
          {t("os.opps.open")}
          <ActionArrow />
        </Link>
        {canChoose && (
          <button
            type="button"
            onClick={onChoose}
            disabled={choosing}
            className={cn(textActionClass, "text-[#454B59]")}
          >
            {choosing && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {t("cc.choose")}
          </button>
        )}
      </div>
    </article>
  );
}

function PreviousDirection({ brief: raw }: { brief: OpportunityBrief }) {
  const { t, locale } = useLocale();
  const brief = useTranslatedBrief(raw) ?? raw;
  return (
    <li
      className="flex flex-wrap items-center justify-between gap-4 border-b border-[#171A27]/10 py-4"
      data-testid="opp-previous"
    >
      <div className="min-w-0">
        <p className="text-[1.0625rem] font-semibold text-[#171A27]">{brief.title}</p>
        <p className="text-[0.9375rem] text-[#454B59]">
          {new Date(brief.createdAt).toLocaleDateString(locale === "hi" ? "hi-IN" : "en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
          {" · "}
          {brief.status === "dismissed" ? t("opp.status.dismissed") : t("opp.status.previous")}
        </p>
      </div>
      <Link to="/dashboard/opportunities/$id" params={{ id: brief.id }} className={textActionClass}>
        {t("os.opps.open")}
        <ActionArrow />
      </Link>
    </li>
  );
}
