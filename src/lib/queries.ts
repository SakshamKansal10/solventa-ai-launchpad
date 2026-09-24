import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";

import { getCurrentUser } from "@/lib/actions/auth";
import { getFounderState } from "@/lib/actions/founder";

/** One place for every query key, so invalidation after a mutation can never
 * miss a screen that shows the same data. */
export const qk = {
  currentUser: ["current-user"] as const,
  founder: (consultation?: string | null) => ["founder-state", consultation ?? null] as const,
  founderAll: ["founder-state"] as const,
  roadmap: (roadmapId: string | null | undefined) => ["roadmap-view", roadmapId ?? null] as const,
  roadmapAll: ["roadmap-view"] as const,
  proof: (opportunityId: string | null | undefined) => ["proof", opportunityId ?? null] as const,
  proofAll: ["proof"] as const,
  opportunity: (id: string) => ["opportunity", id] as const,
  opportunityAll: ["opportunity"] as const,
  notifications: ["notifications"] as const,
  history: ["history"] as const,
  settings: ["settings"] as const,
  mentor: (opportunityId: string | null) => ["mentor-conversation", opportunityId] as const,
  translation: (
    entityType: string,
    entityId: string | null | undefined,
    locale: string,
    rev?: string,
  ) => ["translation", entityType, entityId ?? null, locale, rev ?? ""] as const,
};

export function useCurrentUserQuery() {
  return useQuery({
    queryKey: qk.currentUser,
    queryFn: () => getCurrentUser(),
    staleTime: 5 * 60_000,
  });
}

/** The single shared read behind the shell, Command Center, Opportunities,
 * History links and Ask Sol. `?consultation=` (a deep link from an "ideas
 * ready" email or History → Review) pins which consultation is viewed. */
export function useFounderState() {
  const search = useSearch({ strict: false }) as { consultation?: string };
  const consultation = search.consultation ?? null;
  return useQuery({
    queryKey: qk.founder(consultation),
    queryFn: () => getFounderState({ data: { consultationId: consultation ?? undefined } }),
    staleTime: 30_000,
  });
}

/** After anything that changes direction, roadmap or evidence. */
export function useInvalidateFounder() {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: qk.founderAll }),
      queryClient.invalidateQueries({ queryKey: qk.roadmapAll }),
      queryClient.invalidateQueries({ queryKey: qk.proofAll }),
      queryClient.invalidateQueries({ queryKey: qk.opportunityAll }),
      queryClient.invalidateQueries({ queryKey: qk.notifications }),
    ]);
  };
}
