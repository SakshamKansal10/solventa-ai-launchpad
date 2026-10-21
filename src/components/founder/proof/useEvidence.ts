import { useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { generateAssumptions, getProofOverview, type AssumptionDTO } from "@/lib/actions/proof";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { qk, useInvalidateFounder } from "@/lib/queries";
import { useTranslatedEntity } from "@/lib/use-translation";

interface ProofOverlay {
  assumptions?: Record<string, { title?: string; whyItMatters?: string; nextTest?: string }>;
}
interface WeekOverlay {
  missions?: Record<string, { title?: string }>;
}

/** The Evidence workspace for one direction, in the reader's language. Shared by
 * the Evidence page and This Week, so both read the same assumptions and status.
 * Whichever opens first writes the assumptions (once — the server single-flights
 * and the database refuses duplicates), so evidence can be recorded from Week 1. */
export function useEvidenceWorkspace(opportunityId: string | null | undefined) {
  const { locale } = useLocale();
  const invalidate = useInvalidateFounder();
  const overview = useQuery({
    queryKey: qk.proof(opportunityId),
    queryFn: () => getProofOverview({ data: { opportunityId: opportunityId! } }),
    enabled: Boolean(opportunityId),
    staleTime: 10_000,
  });
  const generate = useMutation({
    mutationFn: () => generateAssumptions({ data: { opportunityId: opportunityId!, locale } }),
    onSuccess: async () => {
      await invalidate();
    },
  });
  const startedFor = useRef<string | null>(null);
  const needsGeneration = Boolean(overview.data?.available && overview.data.needsGeneration);
  useEffect(() => {
    if (!needsGeneration || !opportunityId || startedFor.current === opportunityId) return;
    startedFor.current = opportunityId;
    generate.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsGeneration, opportunityId]);
  const overlay = useTranslatedEntity<ProofOverlay>(
    "proof",
    opportunityId ?? null,
    String(overview.data?.assumptions.length ?? 0),
  );
  const assumptions: AssumptionDTO[] = (overview.data?.assumptions ?? []).map((a) => {
    const o = overlay.data?.assumptions?.[a.id];
    return o
      ? {
          ...a,
          title: o.title ?? a.title,
          whyItMatters: o.whyItMatters ?? a.whyItMatters,
          nextTest: o.nextTest ?? a.nextTest,
        }
      : a;
  });
  return { overview, assumptions, generate, needsGeneration };
}

/** A mission title in the reader's language — the same cached translation
 * This Week shows (week detail, keyed by its generation status "ready"). */
export function useMissionTitle(weekId: string | null, missionId: string, fallback: string) {
  const { data } = useTranslatedEntity<WeekOverlay>("week_detail", weekId, "ready");
  return data?.missions?.[missionId]?.title || fallback;
}
