import { useQuery } from "@tanstack/react-query";

import { getTranslation, type TranslatableEntity } from "@/lib/actions/translate";
import type { OpportunityBrief } from "@/lib/actions/founder";
import type { OpportunityDisplayDetail } from "@/lib/opportunity-display";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { qk } from "@/lib/queries";

type Overlay = object;

/**
 * Fetches the reader-language version of one entity's AI-generated prose.
 * Canonical content renders immediately; the translation overlays it when it
 * arrives (cache hit: near-instant; first time: one translation call, then
 * cached against a hash of the source). A failure yields `null`, so the page
 * simply keeps the canonical text — never blank, never blocked on translation.
 */
export function useTranslatedEntity<T extends Overlay>(
  entityType: TranslatableEntity,
  entityId: string | null | undefined,
  rev?: string,
): { data: T | null; pending: boolean } {
  const { locale } = useLocale();
  const query = useQuery({
    queryKey: qk.translation(entityType, entityId, locale, rev),
    queryFn: () =>
      getTranslation({
        data: { entityType, entityId: entityId as string, locale, rev },
      }),
    enabled: Boolean(entityId),
    staleTime: Infinity,
    gcTime: 30 * 60_000,
    retry: 0,
  });
  const projection =
    query.data?.status === "translated" ? (query.data.projection as unknown as T) : null;
  return { data: projection, pending: query.isFetching && !query.data };
}

interface OpportunityOverlay extends Overlay {
  title?: string;
  oneLiner?: string;
  detail?: Partial<OpportunityDisplayDetail>;
}

export function useTranslatedBrief(
  brief: OpportunityBrief | null | undefined,
): OpportunityBrief | null {
  const { data } = useTranslatedEntity<OpportunityOverlay>("opportunity", brief?.id);
  if (!brief) return null;
  if (!data) return brief;
  const d = data.detail ?? {};
  return {
    ...brief,
    title: data.title ?? brief.title,
    oneLiner: data.oneLiner ?? brief.oneLiner,
    customer: d.customer ?? brief.customer,
    problem: d.problem ?? brief.problem,
    product: d.solution ?? brief.product,
    whyFit: d.whyThisFounder?.slice(0, 2) ?? brief.whyFit,
    scalePath: d.revenuePath ?? brief.scalePath,
  };
}

export type { OpportunityOverlay };
