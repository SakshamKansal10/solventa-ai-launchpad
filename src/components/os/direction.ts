import { useQuery } from "@tanstack/react-query";

import type { OpportunityBrief } from "@/lib/actions/founder";
import {
  getDirectionFits,
  getOpportunityDetail,
  type OpportunityDetailDTO,
} from "@/lib/actions/opportunities";
import type { MessageKey } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { OpportunityDisplayDetail } from "@/lib/opportunity-display";
import { qk } from "@/lib/queries";
import { useTranslatedEntity, type OpportunityOverlay } from "@/lib/use-translation";

import { modelKindOf, type GraphicNode, type ModelKind } from "./model";

/**
 * One direction, as every Founder OS screen reads it: the brief (always there), its full detail
 * (when loaded) and the reader-language overlay (when translated) merged into a single view —
 * nothing invented, every field the opportunity's own.
 */
export interface Direction {
  id: string;
  title: string;
  oneLiner: string;
  fit: OpportunityBrief["fit"];
  /** Founder-specific reasons it fits (up to three). */
  why: string[];
  detail: OpportunityDisplayDetail | null;
  dto: OpportunityDetailDTO | null;
  kind: ModelKind;
  /** The model as four steps: who pays → your offer → how it earns → outcome. */
  nodes: GraphicNode[];
  graphicLabel: string;
}

export function useDirection(brief: OpportunityBrief | null | undefined): {
  direction: Direction | null;
  pending: boolean;
} {
  const { t } = useLocale();
  const id = brief?.id ?? null;
  const query = useQuery({
    queryKey: qk.opportunity(id ?? "none"),
    queryFn: () => getOpportunityDetail({ data: { id: id! } }),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
  const overlay = useTranslatedEntity<OpportunityOverlay>("opportunity", id);
  if (!brief) return { direction: null, pending: false };

  const tr = overlay.data;
  const base = query.data?.detail ?? null;
  const detail: OpportunityDisplayDetail | null = base
    ? ({ ...base, ...(tr?.detail ?? {}) } as OpportunityDisplayDetail)
    : null;
  const title = tr?.title ?? brief.title;
  const oneLiner = tr?.oneLiner ?? brief.oneLiner;
  const why = (detail?.whyThisFounder?.length ? detail.whyThisFounder : brief.whyFit).slice(0, 3);

  const kind = modelKindOf(
    brief.title,
    [query.data?.detail.summary, brief.product, detail?.businessModel].filter(Boolean).join(" "),
  );
  const who = detail?.customerHeadline || brief.customer || "";
  const offer = detail?.solutionHeadline || brief.product || oneLiner;
  const earns = detail?.moneyHeadline || detail?.businessModel || "";
  const nodes: GraphicNode[] = [
    { role: t(ROLE.who), text: who },
    { role: t(ROLE.offer), text: offer },
    { role: t(ROLE.earns), text: earns },
    { role: t(ROLE.outcome), text: t("os.graphic.paidCustomer") },
  ].filter((n) => n.text);

  return {
    direction: {
      id: brief.id,
      title,
      oneLiner,
      fit: brief.fit,
      why,
      detail,
      dto: query.data ?? null,
      kind,
      nodes,
      graphicLabel: t("os.graphic.aria", {
        title,
        a: who,
        b: offer,
        c: earns,
        d: t("os.graphic.paidCustomer"),
      }),
    },
    pending: query.isPending,
  };
}

const ROLE: Record<"who" | "offer" | "earns" | "outcome", MessageKey> = {
  who: "os.graphic.whoPays",
  offer: "os.graphic.offer",
  earns: "os.graphic.earns",
  outcome: "os.graphic.outcome",
};

/**
 * The founder-fit verdict per direction — the ONE fit word a founder sees anywhere, from the same
 * matrix that explains it row by row on the opportunity's Overview (the brief's score class only
 * ranks directions; it is never shown as "fit", so the two can never contradict on screen).
 */
export function useFounderFits(ids: string[], enabled = true) {
  const list = ids.slice(0, 40);
  return useQuery({
    queryKey: qk.directionFits(list),
    queryFn: () => getDirectionFits({ data: { ids: list } }),
    enabled: enabled && list.length > 0,
    staleTime: 60_000,
  });
}

/** Plain words for the qualitative fit and difficulty (never a score). */
export const FIT_WORD: Record<OpportunityBrief["fit"], MessageKey> = {
  strong: "os.level.strong",
  moderate: "os.level.medium",
  conditional: "os.level.weak",
};
export const DIFFICULTY_WORD: Record<OpportunityDisplayDetail["difficulty"], MessageKey> = {
  "Beginner-friendly": "os.level.easy",
  Moderate: "os.level.moderate",
  Challenging: "os.level.hard",
};
