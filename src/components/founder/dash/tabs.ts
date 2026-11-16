import type { MessageKey } from "@/lib/i18n";

/** The signed-in pages, by path, with the name each is called by in the navigation. Shared by the
 * loading state (it names the page being opened, so a tab switch shows the new page at once) and
 * the background loading of every page's code. */
export const DASH_PAGES: { to: string; label: MessageKey; exact?: boolean }[] = [
  { to: "/dashboard", label: "shell.nav.commandCenter", exact: true },
  { to: "/dashboard/opportunities", label: "shell.nav.opportunities" },
  { to: "/dashboard/roadmap", label: "shell.nav.roadmap" },
  { to: "/dashboard/proof", label: "shell.nav.proof" },
  { to: "/dashboard/history", label: "shell.nav.history" },
  { to: "/dashboard/settings", label: "shell.nav.settings" },
];

/** The page a dashboard path belongs to (null outside them). */
export function dashPageFor(pathname: string) {
  const path = pathname.replace(/\/+$/, "") || "/";
  return (
    DASH_PAGES.find((p) =>
      p.exact ? path === p.to : path === p.to || path.startsWith(`${p.to}/`),
    ) ?? null
  );
}
