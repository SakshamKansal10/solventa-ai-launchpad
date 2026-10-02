import { dehydrate, hydrate, QueryClient, type DehydratedState } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  // React Query's own defaults (staleTime: 0, refetchOnWindowFocus: true)
  // meant every persisted-workspace query (dashboard, roadmap, opportunity,
  // mentor conversation) refetched on every navigation back to it and every
  // tab refocus — real Supabase round-trips, not Gemini calls, but still
  // the direct cause of "switching tabs feels like a new generation." None
  // of this data changes from outside the current tab except through an
  // explicit mutation, and every mutation already calls invalidateQueries
  // itself — invalidation always refetches regardless of staleTime, so
  // raising it here only removes the WASTED automatic refetches, never the
  // real ones after a task completion / opportunity switch / Sol reply.
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    // The route guards fetch the signed-in user on the SERVER (and that data is
    // used while server-rendering the shell). Handing the same cache to the
    // browser means the first client render matches the server HTML exactly —
    // without it, the avatar/name rendered one thing on the server and another
    // on the client, React discarded the server markup, and the page flashed.
    // (The cache is plain JSON; the router's serialisation typing just cannot
    // see through React Query's `unknown` fields, hence the cast.)
    dehydrate: () => ({ queryState: dehydrate(queryClient) as unknown as Record<string, string> }),
    hydrate: (dehydrated) => {
      hydrate(queryClient, dehydrated.queryState as unknown as DehydratedState);
    },
  });

  return router;
};
