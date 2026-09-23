import { createContext, useContext, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronRight,
  Compass,
  FlaskConical,
  History,
  Lock,
  LogOut,
  Map,
  MessageSquarePlus,
  Menu,
  Settings,
  Target,
} from "lucide-react";
import mark from "@/assets/solventia-mark.png";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MentorPanel } from "@/components/dashboard/MentorPanel";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import { FeedbackDialog } from "@/components/dashboard/FeedbackDialog";
import { getCurrentUser, signOut } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { translateDashboardText } from "@/lib/i18n/dashboard-dictionary";

/** Lets any page rendered inside DashboardShell trigger the mentor panel
 * (e.g. a page-level "Ask Sol" section), without lifting mentorOpen state
 * out of the shell that actually owns the panel. */
const OpenMentorContext = createContext<(() => void) | null>(null);

export function useOpenMentor(): () => void {
  const open = useContext(OpenMentorContext);
  if (!open) throw new Error("useOpenMentor must be used within DashboardShell");
  return open;
}

interface DashboardShellProps {
  children: ReactNode;
  /** Scopes Sol's mentor context to the opportunity currently being viewed —
   * null on the dashboard home, set on an opportunity/roadmap page. Also
   * doubles as the target for the Ideas/Proof nav items, which have
   * nowhere to go without a currently-relevant opportunity. */
  opportunityId?: string | null;
  /** Title of that same opportunity, purely for Sol's opening state
   * ("Working with you on X") — never fetched, just threaded down from
   * whatever the page already loaded. */
  opportunityTitle?: string | null;
  /** Whether the founder's currently-selected opportunity actually has a
   * built roadmap yet. `undefined` (the default, for pages that haven't
   * loaded this data) leaves the Roadmap nav item in its normal state;
   * `false` renders it visibly locked instead of a normal clickable item
   * that would otherwise just land on an empty state. */
  hasRoadmap?: boolean;
}

interface NavItem {
  label: string;
  icon: typeof Compass;
  to?: string;
  /** Whether this item currently points at a real, distinct destination —
   * Ideas/Proof fall back to /dashboard when there's no opportunityId
   * yet, and shouldn't compete with Command Center for the active
   * highlight while they're just placeholders. */
  isRealDestination: boolean;
  /** Rendered as a visibly locked, non-navigable row instead of a normal
   * link — for Roadmap before a roadmap has actually been built, so the
   * nav item itself teaches "this exists once you build it" rather than
   * silently landing on an empty state. */
  locked?: boolean;
}

/** Six items only — Business DNA lives inside Command Center, Market
 * Validation lives inside Proof, and Ask Sol is the floating button only
 * (never duplicated as a nav row too). */
function useNavItems(opportunityId: string | null, hasRoadmap?: boolean): NavItem[] {
  return [
    { label: "Command Center", icon: Compass, to: "/dashboard", isRealDestination: true },
    {
      label: "Ideas",
      icon: Target,
      to: opportunityId ? `/dashboard/opportunities/${opportunityId}` : "/dashboard",
      isRealDestination: opportunityId !== null,
    },
    {
      label: "Roadmap",
      icon: Map,
      to: "/dashboard/roadmap",
      isRealDestination: true,
      locked: hasRoadmap === false,
    },
    {
      label: "Proof",
      icon: FlaskConical,
      to: opportunityId ? `/dashboard/opportunities/${opportunityId}/proof` : "/dashboard",
      isRealDestination: opportunityId !== null,
    },
    { label: "History", icon: History, to: "/dashboard/history", isRealDestination: true },
    { label: "Settings", icon: Settings, to: "/dashboard/settings", isRealDestination: true },
  ];
}

/** Label text next to a nav icon — on the desktop rail (collapsible=true)
 * it's collapsed to zero width by default and only grows/fades in while
 * the rail itself is hovered (see the `group` on its expanding ancestor
 * in DashboardShell), so the rail can sit icon-only at rest, Supabase-
 * style. The mobile drawer (collapsible=false) always shows it — there's
 * no hover on a touch drawer, so collapsing there would just hide it
 * permanently. */
function NavLabel({ collapsible, children }: { collapsible: boolean; children: ReactNode }) {
  if (!collapsible) return <span className="whitespace-nowrap">{children}</span>;
  return (
    <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 ease-out group-hover:max-w-[160px] group-hover:opacity-100">
      {children}
    </span>
  );
}

function NavLink({
  item,
  currentPath,
  onNavigate,
  collapsible,
}: {
  item: NavItem;
  currentPath: string;
  onNavigate: () => void;
  collapsible: boolean;
}) {
  const { locale } = useLocale();
  const tr = (s: string) => translateDashboardText(s, locale) ?? s;
  const Icon = item.icon;
  const isActive = item.isRealDestination && item.to !== undefined && currentPath === item.to;

  if (item.locked) {
    return (
      <div
        className="relative flex h-12 cursor-default items-center gap-3 rounded-xl px-3.5 text-[15px] font-medium text-[#9B95A2]"
        title={tr("Build your roadmap after selecting a direction.")}
      >
        <Lock className="size-[18px] shrink-0" aria-hidden="true" strokeWidth={1.75} />
        <NavLabel collapsible={collapsible}>{tr(item.label)}</NavLabel>
      </div>
    );
  }

  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      title={collapsible ? tr(item.label) : undefined}
      className={cn(
        "relative flex h-12 items-center gap-3 rounded-xl px-3.5 text-[15px] font-medium transition-colors duration-150",
        isActive
          ? "bg-sol-violet-mist text-sol-violet-deep"
          : "text-[#4E5161] hover:bg-[#F1ECFA] hover:text-[#302A4D]",
      )}
    >
      {isActive && (
        <span
          className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-sol-champagne"
          aria-hidden="true"
        />
      )}
      <Icon className="size-[18px] shrink-0" aria-hidden="true" strokeWidth={1.75} />
      <NavLabel collapsible={collapsible}>{tr(item.label)}</NavLabel>
    </Link>
  );
}

function initials(email: string | null | undefined): string {
  return email ? email[0].toUpperCase() : "S";
}

function firstNameFromEmail(email: string | null | undefined): string {
  if (!email) return "Founder";
  const local = email.split("@")[0];
  return local.charAt(0).toUpperCase() + local.slice(1);
}

function SidebarContent({
  opportunityId,
  hasRoadmap,
  onNavigate,
  onSignOut,
  onOpenFeedback,
  collapsible = false,
}: {
  opportunityId: string | null;
  hasRoadmap?: boolean;
  onNavigate: () => void;
  onSignOut: () => void;
  onOpenFeedback: () => void;
  /** True only for the desktop rail, which sits icon-only at rest and
   * expands on hover (see the `group` + width transition on its
   * containing panel in DashboardShell) — the mobile drawer always
   * passes false since it already shows full labels with no hover to
   * expand on. */
  collapsible?: boolean;
}) {
  const navItems = useNavItems(opportunityId, hasRoadmap);
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const currentUser = useQuery({ queryKey: ["current-user"], queryFn: () => getCurrentUser() });
  const { locale } = useLocale();
  const tr = (s: string) => translateDashboardText(s, locale) ?? s;

  return (
    <div className="relative flex h-full flex-col">
      {/* Very subtle top-left violet ambience — atmosphere, not a pattern. */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-64"
        style={{
          background:
            "radial-gradient(circle at 0% 0%, oklch(0.5534 0.189 288.3 / 12%), transparent 42%)",
        }}
        aria-hidden="true"
      />

      <div className="relative flex h-[118px] items-center gap-3 px-[22px]">
        <img src={mark} alt="" width={298} height={436} className="h-8 w-auto shrink-0" />
        <div
          className={cn(
            "flex flex-col leading-none",
            collapsible &&
              "max-w-0 overflow-hidden opacity-0 transition-all duration-200 ease-out group-hover:max-w-[180px] group-hover:opacity-100",
          )}
        >
          <span className="whitespace-nowrap font-display text-[1.05rem] font-semibold tracking-[0.14em] text-sol-ink">
            SOLVENTIA
          </span>
          <span className="mt-1.5 whitespace-nowrap text-[0.6rem] font-medium tracking-[0.28em] text-sol-champagne-deep">
            VALIDATE • BUILD • ELEVATE
          </span>
        </div>
      </div>

      <nav className="relative flex flex-1 flex-col gap-1 px-3">
        {navItems.map((item) => (
          <NavLink
            key={item.label}
            item={item}
            currentPath={currentPath}
            onNavigate={onNavigate}
            collapsible={collapsible}
          />
        ))}
      </nav>

      <div className="relative border-t border-sol-border px-3 py-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              title={collapsible ? firstNameFromEmail(currentUser.data?.email) : undefined}
              className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-[#F1ECFA]"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sol-champagne to-sol-violet text-[0.8rem] font-semibold text-white">
                {initials(currentUser.data?.email)}
              </span>
              <span
                className={cn(
                  "min-w-0 flex-1",
                  collapsible &&
                    "max-w-0 overflow-hidden opacity-0 transition-all duration-200 ease-out group-hover:max-w-[160px] group-hover:opacity-100",
                )}
              >
                <span className="block truncate text-[0.88rem] font-medium text-sol-ink">
                  {firstNameFromEmail(currentUser.data?.email)}
                </span>
                <span className="flex items-center gap-0.5 whitespace-nowrap text-[0.72rem] text-sol-secondary">
                  {tr("View profile")}
                  <ChevronRight className="size-3" aria-hidden="true" />
                </span>
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" className="w-56">
            <DropdownMenuItem asChild>
              <Link to="/dashboard/settings" onClick={onNavigate} className="cursor-pointer">
                <Settings className="size-4" aria-hidden="true" />
                {tr("Settings")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenFeedback} className="cursor-pointer">
              <MessageSquarePlus className="size-4" aria-hidden="true" />
              {tr("Share Feedback")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onSignOut} className="cursor-pointer">
              <LogOut className="size-4" aria-hidden="true" />
              {tr("Sign Out")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export function DashboardShell({
  children,
  opportunityId = null,
  opportunityTitle = null,
  hasRoadmap,
}: DashboardShellProps) {
  const [mentorOpen, setMentorOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { locale } = useLocale();
  const tr = (s: string) => translateDashboardText(s, locale) ?? s;

  async function handleSignOut() {
    try {
      await signOut();
    } catch (err) {
      console.error("[dashboard] sign out failed:", err);
    } finally {
      // The QueryClient is a single instance for the whole browser tab/
      // session — it survives sign-out/sign-in since those are just
      // client-side navigations, not page reloads. Without clearing it, a
      // second account signing in on the same tab would see the first
      // account's cached dashboard/opportunity/roadmap data until each
      // query happened to refetch on its own.
      queryClient.clear();
      navigate({ to: "/" });
    }
  }

  return (
    <OpenMentorContext.Provider value={() => setMentorOpen(true)}>
      {/* True app shell, not a scrolling page with a sticky sidebar —
       * `position: sticky` is fragile here (html/body already set
       * overflow-x: hidden, which forces an implicit overflow-y on body
       * per the CSS overflow spec, an easy way for "sticky" to silently
       * stop sticking). The outer shell never scrolls at all; only the
       * main workspace column does, so the sidebar is simply never in a
       * scrolling context to begin with. */}
      <div className="flex h-dvh w-full overflow-hidden bg-sol-pearl text-sol-ink">
        {/* ===== DESKTOP SIDEBAR — icon-only rail at rest, expands on
         * hover (Supabase-style), never scrolls with content =====
         * The outer <aside> only reserves a constant 76px of layout
         * space — the main workspace column never reflows on hover. The
         * inner panel is what actually expands, absolutely positioned so
         * it overlays the workspace instead of pushing it, with a shadow
         * to read as "floating over" rather than "part of the layout"
         * while expanded. Pearl/ivory with a soft violet corner ambience,
         * matching the homepage's own identity — the earlier dark-navy
         * "workspace" treatment read as a generic dark app shell
         * disconnected from Solventia's brand, not a deliberate premium
         * choice. The dark navy tokens stay in use elsewhere (the
         * flagship opportunity hero, the mission strip), just not for
         * this persistent, always-visible surface. */}
        <aside className="relative hidden h-dvh w-[76px] shrink-0 lg:block">
          <div
            className="group absolute inset-y-0 left-0 z-40 h-dvh w-[76px] overflow-hidden border-r border-sol-border shadow-none transition-[width] duration-200 ease-out hover:w-[248px] hover:overflow-y-auto hover:shadow-2xl"
            style={{
              background:
                "linear-gradient(180deg, oklch(0.9653 0.0102 81.8 / 98%), oklch(0.9798 0.0086 84.6 / 98%))",
            }}
          >
            <SidebarContent
              opportunityId={opportunityId}
              hasRoadmap={hasRoadmap}
              onNavigate={() => {}}
              onSignOut={handleSignOut}
              onOpenFeedback={() => setFeedbackOpen(true)}
              collapsible
            />
          </div>
        </aside>

        {/* ===== MAIN WORKSPACE COLUMN — the only scrolling region =====
         * Shifts left (via margin, not overlap) when Sol is open on
         * desktop so the panel docks beside the workspace instead of
         * covering it — both stay fully visible and usable at once. On
         * mobile the panel is intentionally full-width (see MentorPanel),
         * so no shift happens there. Widths match the panel's own
         * breakpoint-specific widths (420 / 360) exactly. */}
        <div
          className={cn(
            "flex h-dvh min-w-0 flex-1 flex-col overflow-y-auto transition-[margin-right] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
            mentorOpen && "min-[1440px]:mr-[420px] max-[1439px]:lg:mr-[360px]",
          )}
        >
          {/* ===== DESKTOP FOUNDER INBOX — the full-width header this used
           * to live in was mostly empty space (just a page-title label
           * that already duplicates the highlighted sidebar item, and this
           * bell) on every single page, so it's gone; the bell now floats
           * in the corner instead, and the page content starts right at
           * the top of the scroll area. ===== */}
          <div className="fixed right-8 top-6 z-30 hidden lg:block">
            <NotificationBell />
          </div>

          {/* ===== MOBILE TOP BAR ===== */}
          <header className="sticky top-0 z-30 flex shrink-0 items-center justify-between gap-4 border-b border-sol-border bg-sol-pearl/90 px-5 py-4 backdrop-blur-xl lg:hidden">
            <Link to="/" className="flex items-center gap-2.5" aria-label="Solventia home">
              <img src={mark} alt="" width={298} height={436} className="h-8 w-auto" />
              <span className="font-display text-[1rem] font-semibold tracking-[0.18em] text-sol-ink">
                SOLVENTIA
              </span>
            </Link>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <button
                type="button"
                onClick={() => setMobileNavOpen(true)}
                className="flex size-9 items-center justify-center rounded-lg border border-sol-border text-sol-ink"
                aria-label="Open menu"
              >
                <Menu className="size-[1.125rem]" aria-hidden="true" />
              </button>
            </div>
          </header>

          {/* Right padding is always wider than left — the fixed Ask Sol
              trigger below reserves a viewport-corner strip (offset + button
              size) that content would otherwise render underneath whenever a
              row's vertical position happens to land in the trigger's zone.
              The trigger is deliberately smaller on mobile (44px vs 60px) so
              this reservation stays proportionate instead of eating a large
              chunk of a narrow screen — 56px covers its 12px+44px mobile
              footprint exactly; 96px covers its 28px+60px desktop one. */}
          <main className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-0 pl-[18px] pr-14 pb-9 pt-6 sm:px-6 sm:pr-10 lg:pb-14 lg:pl-16 lg:pr-28 lg:pt-8">
            {children}
          </main>
        </div>

        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent
            side="left"
            className="w-[280px] border-sol-border bg-sol-pearl p-0 text-sol-ink [&_button]:text-sol-ink"
          >
            <SheetTitle className="sr-only">{tr("Navigation")}</SheetTitle>
            <SidebarContent
              opportunityId={opportunityId}
              hasRoadmap={hasRoadmap}
              onNavigate={() => setMobileNavOpen(false)}
              onSignOut={handleSignOut}
              onOpenFeedback={() => {
                setMobileNavOpen(false);
                setFeedbackOpen(true);
              }}
            />
          </SheetContent>
        </Sheet>

        <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />

        {/* ===== FLOATING ASK SOL TRIGGER — the ONLY Ask Sol entry point;
         * no separate nav item, no separate large CTA card =====
         * Smaller and closer to the corner on mobile (44px, the accessible
         * touch-target minimum, at bottom-4/right-3) than on desktop (60px
         * at bottom-7/right-7) — a real screen-width tradeoff, not just a
         * cosmetic shrink: <main>'s pr-14 above reserves exactly this
         * mobile footprint, so content can never render underneath it,
         * without reserving anywhere near the ~90px a same-size-everywhere
         * button would have required on a 390px-wide screen. */}
        {!mentorOpen && (
          <button
            type="button"
            onClick={() => setMentorOpen(true)}
            aria-label="Ask Sol"
            className="group fixed bottom-4 right-3 z-30 flex size-11 items-center justify-center rounded-full transition-transform duration-150 hover:scale-[1.04] sm:bottom-7 sm:right-7 sm:size-[60px]"
            style={{
              background: "linear-gradient(135deg, var(--sol-violet), var(--sol-champagne))",
              boxShadow: "0 12px 32px rgba(86,62,183,.24)",
            }}
          >
            <img
              src={mark}
              alt=""
              width={298}
              height={436}
              className="h-5 w-auto transition-transform duration-150 group-hover:rotate-[4deg] sm:h-7"
            />
          </button>
        )}

        <MentorPanel
          open={mentorOpen}
          onOpenChange={setMentorOpen}
          opportunityId={opportunityId}
          opportunityTitle={opportunityTitle}
        />
      </div>
    </OpenMentorContext.Provider>
  );
}
