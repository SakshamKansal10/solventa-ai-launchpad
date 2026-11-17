import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Link, useNavigate, useParams, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cacheWelcome, clearWelcome } from "@/components/cinematic-home/intro/intro-gate";
import {
  Compass,
  FlaskConical,
  History as HistoryIcon,
  LogOut,
  Map as MapIcon,
  MessageCircle,
  Settings as SettingsIcon,
  Sun,
  type LucideIcon,
} from "lucide-react";

import { BrandLockup } from "@/components/brand/Brand";
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
import { SolText } from "./SolText";

const NAV: {
  to: string;
  icon: LucideIcon;
  label: MessageKey;
  testId: string;
  exact?: boolean;
  /** Visible but disabled until a direction is chosen. */
  needsDirection?: boolean;
}[] = [
  {
    to: "/dashboard",
    icon: Sun,
    label: "shell.nav.commandCenter",
    testId: "nav-command",
    exact: true,
  },
  {
    to: "/dashboard/opportunities",
    icon: Compass,
    label: "shell.nav.opportunities",
    testId: "nav-opportunities",
  },
  {
    to: "/dashboard/roadmap",
    icon: MapIcon,
    label: "shell.nav.roadmap",
    testId: "nav-roadmap",
    needsDirection: true,
  },
  {
    to: "/dashboard/proof",
    icon: FlaskConical,
    label: "shell.nav.proof",
    testId: "nav-proof",
    needsDirection: true,
  },
];

interface AskSolContextValue {
  /** Opens Ask Sol, optionally handing it a question to send straight away. */
  open: (question?: string) => void;
  /** Tells Ask Sol which assumption the founder has open in Proof (or none). */
  setAssumption: (title: string | null) => void;
  isOpen: boolean;
}
const AskSolContext = createContext<AskSolContextValue | null>(null);

/** Lets any page (a mission's "Stuck?" row, Proof) open Ask Sol without owning its state. */
export function useAskSol(): AskSolContextValue {
  const ctx = useContext(AskSolContext);
  if (!ctx) throw new Error("useAskSol must be used within AskSolProvider");
  return ctx;
}

/** The dashboard typography class lives on <html> while a signed-in screen is mounted, because
 * dialogs and side sheets render in a portal outside the page. */
function useAppTypography() {
  useEffect(() => {
    document.documentElement.classList.add("app-inter");
    return () => document.documentElement.classList.remove("app-inter");
  }, []);
}

/**
 * Ask Sol's state and panel, shared by the dashboard shell and the chrome-free mission page.
 * At ≥1280px the panel docks as a real flex sibling (opening it RESIZES the page instead of
 * covering it); below that it is a drawer. `children` is the page column.
 */
export function AskSolProvider({ children }: { children: ReactNode }) {
  useAppTypography();
  const { t } = useLocale();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const params = useParams({ strict: false }) as { id?: string };
  const founder = useFounderState();
  const wide = useMediaQuery("(min-width: 1280px)");
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
  // Where the founder is on the roadmap (only fetched when one exists; usually already cached).
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
  const askValue = useMemo(
    () => ({ open: openAsk, setAssumption: setAssumptionTitle, isOpen: askOpen }),
    [openAsk, askOpen],
  );
  const askRoute: AskSolRoute = pathname.startsWith("/dashboard/proof")
    ? "proof"
    : pathname.startsWith("/dashboard/roadmap")
      ? "roadmap"
      : pathname.startsWith("/dashboard/opportunities/")
        ? "opportunity"
        : "dashboard";

  const panel = (
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
  );

  return (
    <AskSolContext.Provider value={askValue}>
      <div className="app-inter flex h-dvh w-full overflow-hidden bg-white text-sol-ink">
        <div data-testid="main-column" className="flex h-dvh min-w-0 flex-1 flex-col">
          {children}
        </div>
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
            <div className="h-full w-[420px]">{askOpen && panel}</div>
          </aside>
        )}
      </div>
      {!wide && (
        <Sheet open={askOpen} onOpenChange={setAskOpen}>
          <SheetContent
            side="right"
            data-testid="ask-sol-drawer"
            className="w-full max-w-[26rem] border-sol-border bg-sol-surface p-0 sm:max-w-[26rem] [&>button]:hidden"
          >
            <SheetTitle className="sr-only">
              <SolText text={t("askSol.title")} />
            </SheetTitle>
            <SheetDescription className="sr-only">
              <SolText text={t("askSol.tagline")} />
            </SheetDescription>
            {panel}
          </SheetContent>
        </Sheet>
      )}
    </AskSolContext.Provider>
  );
}

/** The Ask Sol trigger in a top bar: an outline pill with a cobalt dot. */
export function AskSolButton({ className }: { className?: string }) {
  const { t } = useLocale();
  const ask = useAskSol();
  return (
    <button
      type="button"
      onClick={() => ask.open()}
      aria-label={t("askSol.open")}
      aria-expanded={ask.isOpen}
      data-testid="ask-sol-launcher"
      className={cn(
        "inline-flex min-h-[46px] items-center gap-2.5 rounded-full border border-sol-ink/20 bg-white px-5 text-[16px] font-medium text-sol-ink transition-colors hover:border-sol-ink/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sol-cobalt",
        className,
      )}
    >
      <span aria-hidden="true" className="size-2 rounded-full bg-sol-cobalt" />
      <SolText text={t("askSol.open")} />
    </button>
  );
}

export function useSignOut() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  return async () => {
    try {
      await signOut();
      clearWelcome();
    } catch (err) {
      console.error("[dashboard] sign out failed:", err);
    } finally {
      // The QueryClient survives client-side navigation; clearing it stops the
      // next account on this tab from seeing the previous one's cached data.
      queryClient.clear();
      navigate({ to: "/" });
    }
  };
}

function AccountMenu() {
  const { t } = useLocale();
  const user = useCurrentUserQuery();
  const handleSignOut = useSignOut();
  const founder = useFounderState();
  // The next opening's welcome ("Welcome back, <name>.", and whether a plan is waiting) comes
  // from this cache, read before the first paint — never from a server call on the homepage.
  const firstName = user.data?.fullName?.trim().split(/\s+/)[0] ?? null;
  const status = founder.data?.direction.roadmap?.status;
  useEffect(() => {
    if (!firstName && status === undefined) return;
    cacheWelcome(
      firstName,
      status === undefined ? undefined : status === "active" || status === "completed",
    );
  }, [firstName, status]);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          data-testid="topbar-avatar"
          aria-label={t("v2.account.aria")}
          className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sol-cobalt"
        >
          <Avatar
            url={user.data?.avatar.url ?? null}
            initials={user.data?.initials ?? "S"}
            size={46}
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 rounded-3xl p-2">
        <DropdownMenuLabel className="px-3 py-2 font-normal" data-testid="account-name">
          <span className="block truncate text-[17px] font-semibold text-sol-ink">
            {user.data?.fullName ?? user.data?.email}
          </span>
          <span className="block truncate text-[15px] text-sol-secondary">{user.data?.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link
            to="/dashboard/history"
            data-testid="nav-history"
            className="min-h-11 cursor-pointer rounded-2xl px-3 text-[17px]"
          >
            <HistoryIcon className="size-5" aria-hidden="true" />
            {t("shell.nav.history")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            to="/dashboard/settings"
            data-testid="nav-settings"
            className="min-h-11 cursor-pointer rounded-2xl px-3 text-[17px]"
          >
            <SettingsIcon className="size-5" aria-hidden="true" />
            {t("shell.nav.settings")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/consultation" className="min-h-11 cursor-pointer rounded-2xl px-3 text-[17px]">
            <Compass className="size-5" aria-hidden="true" />
            {t("shell.account.newConsultation")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          data-testid="sign-out"
          className="min-h-11 cursor-pointer rounded-2xl px-3 text-[17px]"
        >
          <LogOut className="size-5" aria-hidden="true" />
          {t("shell.account.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function useNavState() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const founder = useFounderState();
  // While the founder's state loads, nothing is shown as locked (no flash of disabled items).
  const locked = founder.data ? !founder.data.direction.selectedId : false;
  return NAV.map((item) => ({
    ...item,
    active: item.exact
      ? pathname === item.to || pathname === `${item.to}/`
      : pathname.startsWith(item.to),
    disabled: Boolean(item.needsDirection && locked),
  }));
}

/** Centred pill navigation (≥768px). */
function TopNav() {
  const { t } = useLocale();
  const items = useNavState();
  return (
    <nav
      aria-label={t("v2.nav.aria")}
      data-testid="topnav"
      className="flex flex-wrap gap-1 rounded-full bg-sol-ivory p-1.5"
    >
      {items.map((item) =>
        item.disabled ? (
          <span
            key={item.to}
            role="link"
            aria-disabled="true"
            title={t("v2.nav.locked")}
            data-testid={item.testId}
            className="inline-flex min-h-[46px] cursor-not-allowed items-center rounded-full px-6 text-[17px] font-medium text-sol-muted/60"
          >
            {t(item.label)}
          </span>
        ) : (
          <Link
            key={item.to}
            to={item.to}
            data-testid={item.testId}
            aria-current={item.active ? "page" : undefined}
            className={cn(
              "inline-flex min-h-[46px] items-center rounded-full px-6 text-[17px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sol-cobalt",
              item.active
                ? "bg-sol-ink font-semibold text-white"
                : "font-medium text-sol-secondary hover:text-sol-ink",
            )}
          >
            {t(item.label)}
          </Link>
        ),
      )}
    </nav>
  );
}

/** Fixed bottom navigation (<768px): icon and label for each of the four pages. */
function BottomNav() {
  const { t } = useLocale();
  const items = useNavState();
  return (
    <nav
      aria-label={t("v2.nav.aria")}
      data-testid="bottomnav"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-sol-border bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon;
          const body = (
            <>
              <Icon className="size-6" strokeWidth={1.75} aria-hidden="true" />
              <span className="max-w-full truncate px-1">{t(item.label)}</span>
            </>
          );
          const cls =
            "flex min-h-[68px] flex-col items-center justify-center gap-1 text-[15px] leading-tight";
          return (
            <li key={item.to} className="min-w-0">
              {item.disabled ? (
                <span
                  role="link"
                  aria-disabled="true"
                  title={t("v2.nav.locked")}
                  data-testid={`bottom-${item.testId}`}
                  className={cn(cls, "cursor-not-allowed text-sol-muted/60")}
                >
                  {body}
                </span>
              ) : (
                <Link
                  to={item.to}
                  data-testid={`bottom-${item.testId}`}
                  aria-current={item.active ? "page" : undefined}
                  className={cn(
                    cls,
                    "focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-sol-cobalt",
                    item.active ? "font-semibold text-sol-cobalt-deep" : "text-sol-secondary",
                  )}
                >
                  {body}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Below 768px Ask Sol is a round button above the bottom bar. */
function AskSolFab() {
  const { t } = useLocale();
  const ask = useAskSol();
  if (ask.isOpen) return null;
  return (
    <button
      type="button"
      onClick={() => ask.open()}
      aria-label={t("askSol.open")}
      data-testid="ask-sol-fab"
      className="fixed bottom-[calc(84px+env(safe-area-inset-bottom))] right-4 z-30 flex size-14 items-center justify-center rounded-full bg-sol-cobalt text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sol-cobalt md:hidden"
    >
      <MessageCircle className="size-6" aria-hidden="true" />
    </button>
  );
}

/**
 * Shared page frame — the top bar, every page and the tab-switch skeleton sit in it, so their
 * edges line up and nothing jumps when a page arrives. Desktop (owner, 2026-11-17: the column
 * looked unfinished on wide screens): side padding 5vw − 32px — 32px at 1280, ~46px at 1568,
 * 64px at 1920 — and content up to 1792px (what 64px gives at 1920; wider monitors stop there).
 * Below 1024px the padding is unchanged (clamp(20px, 4vw, 64px)): the phone layout stays as it is.
 * Text does not grow with the width; reading lines keep their ~68ch limit (styles.css).
 */
export const DASH_FRAME =
  "mx-auto w-full max-w-[1920px] px-[clamp(20px,4vw,64px)] lg:px-[clamp(32px,calc(5vw-32px),64px)]";

/** The signed-in frame: a top bar (lockup · pill nav · language · notifications · Ask Sol ·
 * avatar) that scrolls with the page, the page, and on phones a fixed bottom bar. History and
 * Settings live in the avatar menu. */
export function DashboardShell({ children }: { children: ReactNode }) {
  const { t } = useLocale();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // The page's entrance (dash-rise) plays once per visit. Switching tabs swaps the page inside
  // a shell that stays mounted; replaying the rise there blanked the page for ~0.5 s each time —
  // the "tab flash" (go-live step 6).
  const [firstPath] = useState(pathname);
  const switched = pathname !== firstPath;
  return (
    <AskSolProvider>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-sol-ink focus:px-5 focus:py-3 focus:text-white"
      >
        {t("common.skipToContent")}
      </a>
      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain"
        data-testid="scroll-area"
        data-dash-switched={switched ? "" : undefined}
      >
        <header
          data-testid="topbar"
          className={cn(
            DASH_FRAME,
            "flex flex-wrap items-center justify-between gap-x-4 gap-y-4 pb-[clamp(20px,3vw,44px)] pt-5 sm:pt-[26px]",
          )}
        >
          <Link
            to="/dashboard"
            aria-label={t("nav.homeAria")}
            className="inline-flex min-h-11 items-center rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sol-cobalt"
          >
            <BrandLockup preset="compact" />
          </Link>
          <div className="order-last hidden basis-full justify-center md:flex xl:order-none xl:basis-auto">
            <TopNav />
          </div>
          <div className="flex items-center gap-2 sm:gap-2.5">
            <LanguageSwitcher className="inline-flex min-h-[46px] items-center rounded-full border border-sol-ink/20 bg-white px-[18px] text-[16px] font-medium text-sol-ink transition-colors hover:border-sol-ink/50" />
            <NotificationBell />
            <AskSolButton className="hidden md:inline-flex" />
            <AccountMenu />
          </div>
        </header>
        <main
          id="main"
          key={pathname}
          data-testid="main-content"
          className={cn(DASH_FRAME, "pb-[calc(120px+env(safe-area-inset-bottom))] md:pb-[72px]")}
        >
          {children}
        </main>
      </div>
      <BottomNav />
      <AskSolFab />
    </AskSolProvider>
  );
}
