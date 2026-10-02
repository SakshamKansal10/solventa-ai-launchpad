import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Compass,
  FlaskConical,
  History as HistoryIcon,
  LogOut,
  Map as MapIcon,
  Menu,
  MessageCircle,
  Settings as SettingsIcon,
  Target,
  type LucideIcon,
} from "lucide-react";

import mark from "@/assets/solventia-mark.png";
import { LanguageSwitcher } from "@/components/solventia/LanguageSwitcher";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/lib/actions/auth";
import { getRoadmapView } from "@/lib/actions/roadmap";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { MessageKey } from "@/lib/i18n";
import { qk, useCurrentUserQuery, useFounderState } from "@/lib/queries";
import { useTranslatedTitle } from "@/lib/use-translation";
import { cn } from "@/lib/utils";
import { AskSolPanel, type AskSolRoute } from "./AskSol";
import { Avatar } from "./Avatar";
import { NotificationBell } from "./NotificationBell";

const NAV: { to: string; icon: LucideIcon; label: MessageKey; testId: string; exact?: boolean }[] =
  [
    {
      to: "/dashboard",
      icon: Compass,
      label: "shell.nav.commandCenter",
      testId: "nav-command",
      exact: true,
    },
    {
      to: "/dashboard/opportunities",
      icon: Target,
      label: "shell.nav.opportunities",
      testId: "nav-opportunities",
    },
    { to: "/dashboard/roadmap", icon: MapIcon, label: "shell.nav.roadmap", testId: "nav-roadmap" },
    { to: "/dashboard/proof", icon: FlaskConical, label: "shell.nav.proof", testId: "nav-proof" },
    {
      to: "/dashboard/history",
      icon: HistoryIcon,
      label: "shell.nav.history",
      testId: "nav-history",
    },
    {
      to: "/dashboard/settings",
      icon: SettingsIcon,
      label: "shell.nav.settings",
      testId: "nav-settings",
    },
  ];

function titleKeyFor(pathname: string): MessageKey {
  if (pathname.startsWith("/dashboard/opportunities")) return "shell.nav.opportunities";
  if (pathname.startsWith("/dashboard/roadmap")) return "shell.nav.roadmap";
  if (pathname.startsWith("/dashboard/proof")) return "shell.nav.proof";
  if (pathname.startsWith("/dashboard/history")) return "shell.nav.history";
  if (pathname.startsWith("/dashboard/settings")) return "shell.nav.settings";
  return "shell.nav.commandCenter";
}

interface AskSolContextValue {
  /** Opens Ask Sol, optionally handing it a question to send straight away. */
  open: (question?: string) => void;
  /** Tells Ask Sol which assumption the founder has open in Proof (or none). */
  setAssumption: (title: string | null) => void;
}
const AskSolContext = createContext<AskSolContextValue | null>(null);

/** Lets any page (the roadmap's "Need help with this mission?") open Ask Sol
 * without owning its state. */
export function useAskSol(): AskSolContextValue {
  const ctx = useContext(AskSolContext);
  if (!ctx) throw new Error("useAskSol must be used within DashboardShell");
  return ctx;
}

function SidebarContent({
  onNavigate,
  onSignOut,
}: {
  onNavigate: () => void;
  onSignOut: () => void;
}) {
  const { t } = useLocale();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const user = useCurrentUserQuery();
  const name = user.data?.fullName ?? user.data?.email?.split("@")[0] ?? t("shell.account.founder");

  return (
    <div className="flex h-full flex-col">
      <Link
        to="/"
        onClick={onNavigate}
        aria-label={t("nav.homeAria")}
        className="flex h-[72px] shrink-0 items-center gap-3 px-6"
      >
        <img src={mark} alt="" width={298} height={436} className="h-9 w-auto" />
        <span className="flex flex-col leading-none">
          <span className="font-display text-[1.15rem] font-semibold tracking-[0.16em] text-sol-ink">
            SOLVENTIA
          </span>
        </span>
      </Link>

      <nav aria-label={t("shell.nav.aria")} className="flex flex-1 flex-col gap-1 px-3 py-2">
        {NAV.map((item) => {
          const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              data-testid={item.testId}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-11 items-center gap-3 rounded-xl px-3.5 text-[1rem] font-medium transition-colors duration-[180ms]",
                active
                  ? "bg-sol-violet-soft text-sol-violet-deep"
                  : "text-sol-ink hover:bg-sol-ivory",
              )}
            >
              <Icon className="size-5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
              <span className="truncate">{t(item.label)}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sol-border p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              data-testid="sidebar-account"
              aria-label={t("shell.account.menu")}
              className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-sol-ivory"
            >
              <Avatar
                url={user.data?.avatar.url ?? null}
                initials={user.data?.initials ?? "S"}
                size={38}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[1rem] font-semibold text-sol-ink">
                  {name}
                </span>
                <span className="block truncate text-[0.875rem] text-sol-secondary">
                  {user.data?.email}
                </span>
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" className="w-60">
            <DropdownMenuLabel className="font-normal">
              <span className="block text-[0.875rem] text-sol-secondary">
                {t("shell.account.signedInAs")}
              </span>
              <span className="block truncate text-[1rem] font-semibold text-sol-ink">
                {user.data?.email}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link
                to="/dashboard/settings"
                onClick={onNavigate}
                className="cursor-pointer text-[1rem]"
              >
                <SettingsIcon className="size-4" aria-hidden="true" />
                {t("shell.account.settings")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onSignOut}
              className="cursor-pointer text-[1rem]"
              data-testid="sign-out"
            >
              <LogOut className="size-4" aria-hidden="true" />
              {t("shell.account.signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

/** The persistent Founder OS frame: a light 244px sidebar, a 72px top bar
 * (page title · language · notifications · avatar), and the page. Ask Sol is a
 * docked 420px panel at ≥1280px — a real flex sibling, so opening it RESIZES the
 * page instead of covering it — and a drawer below that. */
export function DashboardShell({ children }: { children: ReactNode }) {
  const { t } = useLocale();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const params = useParams({ strict: false }) as { id?: string };
  const founder = useFounderState();
  const user = useCurrentUserQuery();
  const wide = useMediaQuery("(min-width: 1280px)");
  const [navOpen, setNavOpen] = useState(false);
  const [askOpen, setAskOpen] = useState(false);

  // Ask Sol's context: the opportunity being viewed, else the founder's direction.
  const viewingId = pathname.startsWith("/dashboard/opportunities/") ? (params.id ?? null) : null;
  const contextId = viewingId ?? founder.data?.direction.selectedId ?? null;
  const contextTitle = useTranslatedTitle(
    contextId,
    contextId ? (founder.data?.briefs[contextId]?.title ?? null) : null,
  );
  const hasRoadmap = Boolean(
    founder.data &&
    ["roadmap_active", "roadmap_building", "roadmap_completed"].includes(
      founder.data.direction.stage,
    ),
  );

  // Ask Sol's context header (spec: "this visually demonstrates that Sol
  // knows where the founder currently is") — only fetched when a roadmap
  // actually exists; reuses the exact query every roadmap page already
  // populates, so it's usually already cached and free.
  const roadmapId =
    founder.data?.direction.roadmap?.status === "active" ||
    founder.data?.direction.roadmap?.status === "completed"
      ? (founder.data.direction.roadmap.id ?? null)
      : null;
  const roadmapView = useQuery({
    queryKey: qk.roadmap(roadmapId),
    queryFn: () => getRoadmapView({ data: { roadmapId: roadmapId! } }),
    enabled: Boolean(roadmapId),
    staleTime: 15_000,
  });
  const currentWeek = roadmapView.data?.weeks.find((w) => w.id === roadmapView.data?.currentWeekId);
  const currentPhase = roadmapView.data?.phases.find(
    (p) => p.id === roadmapView.data?.currentPhaseId,
  );
  const currentMission = currentWeek?.missions.find((m) => m.state === "in_progress");

  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [assumptionTitle, setAssumptionTitle] = useState<string | null>(null);
  const openAsk = useCallback((question?: string) => {
    if (typeof question === "string" && question.trim()) setPendingQuestion(question);
    setAskOpen(true);
  }, []);
  const closeAsk = useCallback(() => setAskOpen(false), []);
  const clearQuestion = useCallback(() => setPendingQuestion(null), []);
  const askValue = useMemo(() => ({ open: openAsk, setAssumption: setAssumptionTitle }), [openAsk]);
  const askRoute: AskSolRoute = pathname.startsWith("/dashboard/proof")
    ? "proof"
    : pathname.startsWith("/dashboard/roadmap")
      ? "roadmap"
      : pathname.startsWith("/dashboard/opportunities/")
        ? "opportunity"
        : "dashboard";

  async function handleSignOut() {
    try {
      await signOut();
    } catch (err) {
      console.error("[dashboard] sign out failed:", err);
    } finally {
      // The QueryClient survives client-side navigation; clearing it stops the
      // next account on this tab from seeing the previous one's cached data.
      queryClient.clear();
      navigate({ to: "/" });
    }
  }

  return (
    <AskSolContext.Provider value={askValue}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-xl focus:bg-sol-navy focus:px-4 focus:py-2 focus:text-white"
      >
        {t("common.skipToContent")}
      </a>
      <div className="flex h-dvh w-full overflow-hidden bg-sol-pearl text-sol-ink">
        <aside
          data-testid="sidebar"
          className="hidden h-dvh w-[244px] shrink-0 border-r border-sol-border bg-gradient-to-b from-sol-ivory-light to-sol-pearl lg:block"
        >
          <SidebarContent onNavigate={() => undefined} onSignOut={handleSignOut} />
        </aside>

        <div data-testid="main-column" className="flex h-dvh min-w-0 flex-1 flex-col">
          <header
            data-testid="topbar"
            className="flex h-[72px] shrink-0 items-center justify-between gap-3 border-b border-sol-border bg-sol-pearl/95 px-5 backdrop-blur md:px-7 lg:px-10"
          >
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setNavOpen(true)}
                aria-label={t("shell.nav.open")}
                className="flex size-11 items-center justify-center rounded-full border border-sol-border lg:hidden"
              >
                <Menu className="size-5" aria-hidden="true" />
              </button>
              <p
                className="truncate text-[1.0625rem] font-semibold text-sol-ink"
                data-testid="page-title"
              >
                {t(titleKeyFor(pathname))}
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <LanguageSwitcher compact />
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    data-testid="topbar-avatar"
                    aria-label={t("shell.account.menu")}
                    className="rounded-full focus-visible:outline-2"
                  >
                    <Avatar
                      url={user.data?.avatar.url ?? null}
                      initials={user.data?.initials ?? "S"}
                      size={44}
                    />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuLabel className="font-normal">
                    <span className="block truncate text-[1rem] font-semibold text-sol-ink">
                      {user.data?.fullName ?? user.data?.email}
                    </span>
                    <span className="block truncate text-[0.875rem] text-sol-secondary">
                      {user.data?.email}
                    </span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard/settings" className="cursor-pointer text-[1rem]">
                      <SettingsIcon className="size-4" aria-hidden="true" />
                      {t("shell.account.settings")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/consultation" className="cursor-pointer text-[1rem]">
                      <Compass className="size-4" aria-hidden="true" />
                      {t("shell.account.newConsultation")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-[1rem]">
                    <LogOut className="size-4" aria-hidden="true" />
                    {t("shell.account.signOut")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto" data-testid="scroll-area">
            <main
              id="main"
              data-testid="main-content"
              className="mx-auto w-full max-w-[1440px] px-5 pb-28 pt-8 md:px-7 lg:px-10 lg:pt-10"
            >
              {children}
            </main>
          </div>
        </div>

        {/* Docked Ask Sol — a flex sibling, so the main column genuinely shrinks. */}
        {wide && (
          <aside
            data-testid="ask-sol-dock"
            data-open={askOpen}
            aria-hidden={!askOpen}
            inert={!askOpen}
            className={cn(
              "h-dvh shrink-0 overflow-hidden border-l border-sol-border bg-sol-surface transition-[width] duration-[260ms] ease-[var(--sol-ease)]",
              askOpen ? "w-[420px]" : "w-0 border-l-0",
            )}
          >
            <div className="h-full w-[420px]">
              {askOpen && (
                <AskSolPanel
                  opportunityId={contextId}
                  opportunityTitle={contextTitle}
                  hasRoadmap={hasRoadmap}
                  route={askRoute}
                  assumptionTitle={askRoute === "proof" ? assumptionTitle : null}
                  initialQuestion={pendingQuestion}
                  onQuestionConsumed={clearQuestion}
                  weekNumber={currentWeek?.number ?? null}
                  phaseTitle={currentPhase?.title ?? null}
                  missionTitle={currentMission?.title ?? null}
                  onClose={closeAsk}
                />
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Below 1280px there is no room to dock — a drawer overlay is fine. */}
      {!wide && (
        <Sheet open={askOpen} onOpenChange={setAskOpen}>
          <SheetContent
            side="right"
            data-testid="ask-sol-drawer"
            className="w-full max-w-[26rem] border-sol-border bg-sol-surface p-0 sm:max-w-[26rem] [&>button]:hidden"
          >
            <SheetTitle className="sr-only">{t("askSol.title")}</SheetTitle>
            <SheetDescription className="sr-only">{t("askSol.tagline")}</SheetDescription>
            <AskSolPanel
              opportunityId={contextId}
              opportunityTitle={contextTitle}
              hasRoadmap={hasRoadmap}
              route={askRoute}
              assumptionTitle={askRoute === "proof" ? assumptionTitle : null}
              initialQuestion={pendingQuestion}
              onQuestionConsumed={clearQuestion}
              weekNumber={currentWeek?.number ?? null}
              phaseTitle={currentPhase?.title ?? null}
              missionTitle={currentMission?.title ?? null}
              onClose={closeAsk}
            />
          </SheetContent>
        </Sheet>
      )}

      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent side="left" className="w-[280px] border-sol-border bg-sol-pearl p-0">
          <SheetTitle className="sr-only">{t("shell.nav.aria")}</SheetTitle>
          <SheetDescription className="sr-only">{t("shell.nav.aria")}</SheetDescription>
          <SidebarContent onNavigate={() => setNavOpen(false)} onSignOut={handleSignOut} />
        </SheetContent>
      </Sheet>

      {/* The launcher hides while the panel is open, and the page reserves 112px
          at the bottom (pb-28) so it can never hide the last thing on a page. */}
      {!askOpen && (
        <button
          type="button"
          onClick={() => openAsk()}
          aria-label={t("askSol.open")}
          data-testid="ask-sol-launcher"
          className="fixed bottom-5 right-4 z-30 flex h-14 items-center gap-2 rounded-full bg-sol-navy px-5 text-[1rem] font-semibold text-white shadow-[0_12px_32px_rgba(24,33,61,.28)] transition-transform duration-[180ms] hover:-translate-y-0.5 sm:right-7"
        >
          <MessageCircle className="size-5 text-sol-champagne" aria-hidden="true" />
          <span className="hidden sm:inline">{t("askSol.open")}</span>
        </button>
      )}
    </AskSolContext.Provider>
  );
}
