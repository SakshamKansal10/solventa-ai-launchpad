import { createFileRoute, Outlet, useRouter, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { DashboardShell } from "@/components/founder/DashboardShell";
import { DASH_PAGES } from "@/components/founder/dash/tabs";
import { DashPage, DashSkeleton } from "@/components/founder/dash/ui";
import { requireAuthLoader } from "@/lib/route-guards";
import { useResumeFinishedConsultation } from "@/lib/consultation/resume";
import { useFounderState } from "@/lib/queries";

/** Layout for every signed-in screen. Because the shell lives HERE (not inside
 * each page), it persists across navigation: the sidebar, the language switch,
 * and an open Ask Sol panel are never torn down and rebuilt on a route change.
 * Signed-out visitors are bounced to the homepage with a safe `next` so they
 * return to exactly where they were headed after signing in. */
export const Route = createFileRoute("/dashboard")({
  beforeLoad: requireAuthLoader,
  component: DashboardLayout,
});

function DashboardLayout() {
  // Nobody lands on an empty dashboard after finishing the consultation: a finished, unanalysed
  // consultation is sent back to its last step, where generation starts by itself.
  const founder = useFounderState();
  useResumeFinishedConsultation({
    signedIn: true,
    hasAnalysis: founder.data ? founder.data.consultations.length > 0 : null,
  });
  const switching = useSwitchingPage();
  useLoadEveryPage();
  return (
    <DashboardShell>
      {switching ? (
        <DashPage data-testid="page-switching">
          <DashSkeleton />
        </DashPage>
      ) : (
        <Outlet />
      )}
    </DashboardShell>
  );
}

/**
 * A tab was clicked and its route has not resolved yet (its code still loading): the router
 * keeps rendering the OLD page until then, while the navigation already highlights the new tab —
 * the "old page for 6–7 s" bug (owner, 2026-11-16). After a frame's grace (a page that is ready
 * at once never flashes a skeleton), the new page's frame shows instead: its name and skeletons.
 */
function useSwitchingPage() {
  const pending = useRouterState({
    select: (s) =>
      s.resolvedLocation && s.location.pathname !== s.resolvedLocation.pathname
        ? s.location.pathname
        : null,
  });
  const [shown, setShown] = useState<string | null>(null);
  useEffect(() => {
    if (!pending) {
      setShown(null);
      return;
    }
    const id = window.setTimeout(() => setShown(pending), 50);
    return () => window.clearTimeout(id);
  }, [pending]);
  return Boolean(pending && shown === pending);
}

/** Once the dashboard is idle, every signed-in page's code is fetched, so a tab click never waits
 * for a download (only code: each page's data still loads when it opens, or on hover). */
function useLoadEveryPage() {
  const router = useRouter();
  useEffect(() => {
    const load = () => {
      for (const page of DASH_PAGES) {
        const route = router.routesByPath[page.to as keyof typeof router.routesByPath] as
          Parameters<typeof router.loadRouteChunk>[0] | undefined;
        if (route) void router.loadRouteChunk(route)?.catch(() => {});
      }
    };
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
    };
    if (w.requestIdleCallback) w.requestIdleCallback(load, { timeout: 3_000 });
    else window.setTimeout(load, 1_500);
  }, [router]);
}
