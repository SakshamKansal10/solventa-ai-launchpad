import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import {
  chooseDirection,
  getOpportunityDetail,
  prepareOpportunityDetail,
  type OpportunityDetailDTO,
} from "@/lib/actions/opportunities";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { OpportunityDisplayDetail } from "@/lib/opportunity-display";
import { qk, useInvalidateFounder } from "@/lib/queries";
import { useTranslatedEntity, type OpportunityOverlay } from "@/lib/use-translation";
import { ActionButton, ActionLink } from "./ui";

/** One direction's detail in the reader's language (the brief and every detail line overlaid
 * with the cached translation, so no English line slips into Hindi). Shared by the direction
 * page and its two sub-pages. */
export function useDirectionDetail(id: string) {
  const query = useQuery(directionDetailQuery(id));
  usePrepareOldDetail(id, query.data?.detailPreparing ?? false);
  const overlay = useTranslatedEntity<OpportunityOverlay>("opportunity", id);
  if (!query.data) return { query, dto: null, detail: null };
  const brief = {
    ...query.data.brief,
    title: overlay.data?.title ?? query.data.brief.title,
    oneLiner: overlay.data?.oneLiner ?? query.data.brief.oneLiner,
  };
  const dto: OpportunityDetailDTO = { ...query.data, brief };
  const detail: OpportunityDisplayDetail = { ...dto.detail, ...(overlay.data?.detail ?? {}) };
  return { query, dto, detail };
}

/** One direction's saved detail. Shared by the pages and by the route loaders, which start it
 * when a link is hovered or touched (the router's intent preload), so the click usually finds
 * it ready (owner, 2026-11-17, Job I). */
export function directionDetailQuery(id: string) {
  return {
    queryKey: qk.opportunity(id),
    queryFn: () => getOpportunityDetail({ data: { id } }),
    staleTime: 60_000,
  };
}

/** Route loader helper: start loading a direction's detail without making the navigation
 * wait for it (the page shows its saved summary at once, then the rest). Browser only. */
export function preloadDirection(queryClient: QueryClient, id: string) {
  if (typeof window === "undefined") return;
  void queryClient.prefetchQuery(directionDetailQuery(id)).catch(() => {});
}

/** A very old direction without its full detail: ask for it once in the background, then
 * refresh — the page never waits on it. */
function usePrepareOldDetail(id: string, preparing: boolean) {
  const queryClient = useQueryClient();
  const asked = useRef<string | null>(null);
  const prepare = useMutation({
    mutationFn: () => prepareOpportunityDetail({ data: { id } }),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: qk.opportunity(id) }),
  });
  useEffect(() => {
    if (!preparing || asked.current === id) return;
    asked.current = id;
    prepare.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preparing, id]);
}

export function BackLink({
  to,
  params,
  children,
}: {
  to: "/dashboard/opportunities" | "/dashboard/opportunities/$id";
  params?: { id: string };
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      params={params as never}
      className="inline-flex min-h-11 items-center gap-2.5 self-start rounded-full text-[18px] font-medium text-sol-cobalt-deep hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sol-cobalt"
    >
      <ArrowLeft className="size-5" aria-hidden="true" />
      {children}
    </Link>
  );
}

/** The page's one primary action, following the direction's state:
 * Choose this direction → Build my roadmap → Open roadmap. */
export function DirectionAction({ dto }: { dto: OpportunityDetailDTO }) {
  const { t } = useLocale();
  const navigate = useNavigate();
  const invalidate = useInvalidateFounder();
  const choose = useMutation({
    mutationFn: () => chooseDirection({ data: { opportunityId: dto.brief.id } }),
    onSuccess: async () => {
      await invalidate();
      toast.success(t("cc.chosen.toast"));
    },
    onError: (err) => {
      console.error("[direction] choose failed:", err);
      toast.error(t("cc.chosen.error"));
    },
  });

  if (!dto.isCurrentConsultation && !dto.isSelected) {
    return (
      <div className="flex flex-wrap items-center gap-3.5">
        <p className="dash-body max-w-[32em]">{t("opp.earlierNote")}</p>
        <ActionLink to="/dashboard/history" tone="secondary" size="md" arrow={false}>
          {t("cc.earlier.history")}
        </ActionLink>
      </div>
    );
  }
  if (dto.isSelected) {
    if (dto.roadmapStatus === "active" || dto.roadmapStatus === "completed")
      return (
        <ActionLink to="/dashboard/roadmap" className="self-start" data-testid="open-roadmap">
          {t("opp.openRoadmap")}
        </ActionLink>
      );
    return (
      <ActionButton
        className="self-start"
        data-testid="build-roadmap"
        onClick={() =>
          navigate({ to: "/dashboard/roadmap/building", search: { opportunityId: dto.brief.id } })
        }
      >
        {dto.roadmapStatus === "building"
          ? t("v2.today.chosen.progress")
          : dto.roadmapStatus === "failed"
            ? t("v2.today.chosen.retry")
            : dto.roadmapStatus === "archived"
              ? t("cc.b.resumeCta")
              : t("v2.today.chosen.build")}
      </ActionButton>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-3.5">
      <ActionButton
        onClick={() => choose.mutate()}
        loading={choose.isPending}
        data-testid="choose-direction"
      >
        {t("cc.chooseDirection")}
      </ActionButton>
      <span className="dash-meta">{t("v2.detail.chooseNote")}</span>
    </div>
  );
}
