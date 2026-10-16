import type { RoadmapView, WeekDTO } from "@/lib/roadmap/view";
import { useTranslatedEntity } from "@/lib/use-translation";

interface SkeletonOverlay {
  northStar?: string;
  phases?: Record<string, { title?: string; description?: string }>;
  weeks?: Record<string, { title?: string; objective?: string }>;
}
interface WeekOverlay {
  mission?: string;
  successThreshold?: string;
  evidenceRequired?: string;
  adaptationNote?: string;
  mistakes?: string[];
  missions?: Record<
    string,
    {
      title?: string;
      why?: string;
      doneWhen?: string;
      timeEstimate?: string;
      how?: string;
      steps?: string[];
    }
  >;
}

/** Reader-language text for a roadmap and (optionally) one week's detail,
 * overlaid on the canonical content. Every accessor falls back to the original
 * string, so a slow or failed translation can never blank the page. */
export function useRoadmapText(
  view: RoadmapView | null | undefined,
  week: WeekDTO | null | undefined,
) {
  const sk = useTranslatedEntity<SkeletonOverlay>("roadmap_skeleton", view?.roadmap.id);
  const wk = useTranslatedEntity<WeekOverlay>(
    "week_detail",
    week?.hasDetail ? week.id : null,
    week?.generationStatus,
  );
  return {
    northStar: (fallback: string | null) => sk.data?.northStar || fallback,
    phaseTitle: (id: string, fallback: string) => sk.data?.phases?.[id]?.title || fallback,
    weekTitle: (id: string, fallback: string) => sk.data?.weeks?.[id]?.title || fallback,
    weekObjective: (id: string, fallback: string) => sk.data?.weeks?.[id]?.objective || fallback,
    detail: {
      successThreshold: (fallback: string | null) => wk.data?.successThreshold || fallback,
      adaptationNote: (fallback: string | null) => wk.data?.adaptationNote || fallback,
      mistakes: (fallback: string[]) =>
        wk.data?.mistakes && wk.data.mistakes.length === fallback.length
          ? wk.data.mistakes
          : fallback,
      mission: (id: string) => wk.data?.missions?.[id],
    },
  };
}
