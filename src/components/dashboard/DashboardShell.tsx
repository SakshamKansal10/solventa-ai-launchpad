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
import { getCurrentUser, signOut } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

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
  /** Short label shown in the top header for the current page —
   * "page context", never a duplicate of the sidebar nav. */
  pageTitle?: string;
}

interface NavItem {
  label: string;
  icon: typeof Compass;
  to?: string;
  hash?: string;
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
      to: opportunityId ? `/dashboard/opportunities/${opportunityId}` : "/dashboard",
      hash: opportunityId ? "evidence" : undefined,
      isRealDestination: opportunityId !== null,
    },
    { label: "History", icon: History, to: "/dashboard/history", isRealDestination: true },
    { label: "Settings", icon: Settings, to: "/dashboard/settings", isRealDestination: true },
  ];
}

/** Maps the current route to the top header's page-context label —
 * computed once here rather than requiring every page to pass its own
 * title, so no page can silently end up without one. */
function pageTitleFromPath(pathname: string, explicit?: string): string {
  if (explicit) return explicit;
  if (pathname === "/dashboard") return "Command Center";
  if (pathname.startsWith("/dashboard/opportunities/")) return "Ideas";
  if (pathname === "/dashboard/roadmap") return "Roadmap";
  if (pathname === "/dashboard/history") return "History";
  if (pathname === "/dashboard/settings") return "Settings";
  return "Solventia";
}

function NavLink({
  item,
  currentPath,
  onNavigate,
}: {
  item: NavItem;
  currentPath: string;
  onNavigate: () => void;
}) {
  const Icon = item.icon;
  const isActive =
    item.isRealDestination && item.to !== undefined && !item.hash && currentPath === item.to;

  if (item.locked) {
    return (
      <div
        className="group relative flex h-12 cursor-default items-center gap-3 rounded-xl px-3.5 text-[15px] font-medium text-[#9B95A2]"
        title="Build your roadmap after selecting a direction."
      >
        <Lock className="size-[18px] shrink-0" aria-hidden="true" strokeWidth={1.75} />
        <span>{item.label}</span>
      </div>
    );
  }

  return (
    <Link
      to={item.to}
      hash={item.hash}
      onClick={onNavigate}
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
      <span>{item.label}</span>
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
}: {
  opportunityId: string | null;
  hasRoadmap?: boolean;
  onNavigate: () => void;
  onSignOut: () => void;
}) {
  const navItems = useNavItems(opportunityId, hasRoadmap);
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const currentUser = useQuery({ queryKey: ["current-user"], queryFn: () => getCurrentUser() });

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
        <div className="flex flex-col leading-none">
          <span className="font-display text-[1.05rem] font-semibold tracking-[0.14em] text-sol-ink">
            SOLVENTIA
          </span>
          <span className="mt-1.5 text-[0.6rem] font-medium tracking-[0.28em] text-sol-champagne-deep">
            VALIDATE • BUILD • ELEVATE
          </span>
        </div>
      </div>

      <nav className="relative flex flex-1 flex-col gap-1 px-3">
        {navItems.map((item) => (
          <NavLink key={item.label} item={item} currentPath={currentPath} onNavigate={onNavigate} />
        ))}
      </nav>

      <div className="relative border-t border-sol-border px-3 py-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-[#F1ECFA]"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sol-champagne to-sol-violet text-[0.8rem] font-semibold text-white">
                {initials(currentUser.data?.email)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.88rem] font-medium text-sol-ink">
                  {firstNameFromEmail(currentUser.data?.email)}
                </span>
                <span className="flex items-center gap-0.5 text-[0.72rem] text-sol-secondary">
                  View profile
                  <ChevronRight className="size-3" aria-hidden="true" />
                </span>
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" className="w-56">
            <DropdownMenuItem asChild>
              <Link to="/dashboard/settings" onClick={onNavigate} className="cursor-pointer">
                <Settings className="size-4" aria-hidden="true" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onSignOut} className="cursor-pointer">
              <LogOut className="size-4" aria-hidden="true" />
              Sign Out
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
  pageTitle,
}: DashboardShellProps) {
  const [mentorOpen, setMentorOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentPath = useRouterState({ select: (s) => s.location.pathname });

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
        {/* ===== DESKTOP SIDEBAR — fixed, never scrolls with content =====
         * Pearl/ivory with a soft violet corner ambience, matching the
         * homepage's own identity — the earlier dark-navy "workspace"
         * treatment read as a generic dark app shell disconnected from
         * Solventia's brand, not a deliberate premium choice. The dark
         * navy tokens stay in use elsewhere (the flagship opportunity
         * hero, the mission strip), just not for this persistent,
         * always-visible surface. */}
        <aside
          className="hidden h-dvh w-[248px] shrink-0 overflow-y-auto border-r border-sol-border lg:block"
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
          />
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
          {/* ===== DESKTOP TOP HEADER — page context only, never a second
           * nav ===== */}
          <header className="sticky top-0 z-30 hidden h-[72px] shrink-0 items-center border-b border-sol-border bg-[rgba(247,243,236,0.90)] px-8 backdrop-blur-xl lg:flex lg:px-12">
            <p className="text-[0.95rem] font-semibold text-sol-ink">
              {pageTitleFromPath(currentPath, pageTitle)}
            </p>
          </header>

          {/* ===== MOBILE TOP BAR ===== */}
          <header className="sticky top-0 z-30 flex shrink-0 items-center justify-between gap-4 border-b border-sol-border bg-sol-pearl/90 px-5 py-4 backdrop-blur-xl lg:hidden">
            <Link to="/" className="flex items-center gap-2.5" aria-label="Solventia home">
              <img src={mark} alt="" width={298} height={436} className="h-8 w-auto" />
              <span className="font-display text-[1rem] font-semibold tracking-[0.18em] text-sol-ink">
                SOLVENTIA
              </span>
            </Link>
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="flex size-9 items-center justify-center rounded-lg border border-sol-border text-sol-ink"
              aria-label="Open menu"
            >
              <Menu className="size-[1.125rem]" aria-hidden="true" />
            </button>
          </header>

          <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-0 px-[18px] py-9 sm:px-6 lg:px-12 lg:py-14">
            {children}
          </main>
        </div>

        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent
            side="left"
            className="w-[280px] border-sol-border bg-sol-pearl p-0 text-sol-ink [&_button]:text-sol-ink"
          >
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SidebarContent
              opportunityId={opportunityId}
              hasRoadmap={hasRoadmap}
              onNavigate={() => setMobileNavOpen(false)}
              onSignOut={handleSignOut}
            />
          </SheetContent>
        </Sheet>

        {/* ===== FLOATING ASK SOL TRIGGER — the ONLY Ask Sol entry point;
         * no separate nav item, no separate large CTA card ===== */}
        {!mentorOpen && (
          <button
            type="button"
            onClick={() => setMentorOpen(true)}
            aria-label="Ask Sol"
            className="group fixed bottom-7 right-7 z-30 flex size-[60px] items-center justify-center rounded-full transition-transform duration-150 hover:scale-[1.04]"
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
              className="h-7 w-auto transition-transform duration-150 group-hover:rotate-[4deg]"
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
