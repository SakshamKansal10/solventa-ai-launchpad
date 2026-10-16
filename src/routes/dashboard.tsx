import { createFileRoute, Outlet } from "@tanstack/react-router";

import { DashboardShell } from "@/components/founder/DashboardShell";
import { requireAuthLoader } from "@/lib/route-guards";

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
  return (
    <DashboardShell>
      <Outlet />
    </DashboardShell>
  );
}
