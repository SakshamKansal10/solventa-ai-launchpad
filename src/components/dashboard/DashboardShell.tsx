import { createContext, useContext, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Compass, Fingerprint, LineChart, LogOut, Map, Menu, Sparkles, Target } from "lucide-react";
import mark from "@/assets/solventia-mark.png";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { MentorPanel } from "@/components/dashboard/MentorPanel";
import { signOut } from "@/lib/actions/auth";
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
   * doubles as the target for the Opportunity/Market Validation nav items,
   * which have nowhere to go without a currently-relevant opportunity. */
  opportunityId?: string | null;
  /** Title of that same opportunity, purely for Sol's opening state
   * ("Working with you on X") — never fetched, just threaded down from
   * whatever the page already loaded. */
  opportunityTitle?: string | null;
}

interface NavItem {
  label: string;
  icon: typeof Compass;
  to?: string;
  hash?: string;
  action?: "ask-sol";
  /** Whether this item currently points at a real, distinct destination —
   * Opportunity/Market Validation fall back to /dashboard when there's no
   * opportunityId yet, and shouldn't compete with Overview for the active
   * highlight while they're just placeholders. */
  isRealDestination: boolean;
}

function useNavItems(opportunityId: string | null): NavItem[] {
  return [
    { label: "Overview", icon: Compass, to: "/dashboard", isRealDestination: true },
    {
      label: "Opportunity",
      icon: Target,
      to: opportunityId ? `/dashboard/opportunities/${opportunityId}` : "/dashboard",
      isRealDestination: opportunityId !== null,
    },
    { label: "Roadmap", icon: Map, to: "/dashboard/roadmap", isRealDestination: true },
    {
      label: "Market Validation",
      icon: LineChart,
      to: opportunityId ? `/dashboard/opportunities/${opportunityId}` : "/dashboard",
      hash: opportunityId ? "market-signals" : undefined,
      isRealDestination: opportunityId !== null,
    },
    {
      label: "Business DNA",
      icon: Fingerprint,
      to: "/dashboard",
      hash: "business-dna",
      isRealDestination: true,
    },
    { label: "Ask Sol", icon: Sparkles, action: "ask-sol", isRealDestination: true },
  ];
}

function NavLink({
  item,
  currentPath,
  onNavigate,
  onAskSol,
}: {
  item: NavItem;
  currentPath: string;
  onNavigate: () => void;
  onAskSol: () => void;
}) {
  const Icon = item.icon;
  const isActive =
    item.isRealDestination && item.to !== undefined && !item.hash && currentPath === item.to;

  const className = cn(
    "flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-[0.85rem] font-medium transition-colors",
    isActive
      ? "bg-econ-green-soft/10 text-econ-green-active"
      : "text-workspace-muted hover:bg-white/5 hover:text-workspace-foreground",
  );

  if (item.action === "ask-sol") {
    return (
      <button
        type="button"
        onClick={() => {
          onAskSol();
          onNavigate();
        }}
        className={className}
      >
        <Icon className="size-4 shrink-0" aria-hidden="true" strokeWidth={1.75} />
        <span className="uppercase tracking-[0.06em]">{item.label}</span>
      </button>
    );
  }

  return (
    <Link to={item.to} hash={item.hash} onClick={onNavigate} className={className}>
      <Icon className="size-4 shrink-0" aria-hidden="true" strokeWidth={1.75} />
      <span className="uppercase tracking-[0.06em]">{item.label}</span>
    </Link>
  );
}

function SidebarContent({
  opportunityId,
  onNavigate,
  onAskSol,
  onSignOut,
}: {
  opportunityId: string | null;
  onNavigate: () => void;
  onAskSol: () => void;
  onSignOut: () => void;
}) {
  const navItems = useNavItems(opportunityId);
  const currentPath = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 pb-8 pt-7">
        <img src={mark} alt="" width={298} height={436} className="h-7 w-auto" />
        <div className="flex flex-col leading-none">
          <span className="font-display text-[0.95rem] font-semibold tracking-[0.16em] text-workspace-foreground">
            SOLVENTIA
          </span>
          <span className="mt-1 text-[0.62rem] uppercase tracking-[0.14em] text-workspace-muted">
            Your Workspace
          </span>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {navItems.map((item) => (
          <NavLink
            key={item.label}
            item={item}
            currentPath={currentPath}
            onNavigate={onNavigate}
            onAskSol={onAskSol}
          />
        ))}
      </nav>

      <div className="border-t border-workspace-border px-3 py-4">
        <button
          type="button"
          onClick={onSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[0.85rem] font-medium text-workspace-muted transition-colors hover:bg-white/5 hover:text-workspace-foreground"
        >
          <LogOut className="size-4 shrink-0" aria-hidden="true" strokeWidth={1.75} />
          Sign Out
        </button>
      </div>
    </div>
  );
}

export function DashboardShell({
  children,
  opportunityId = null,
  opportunityTitle = null,
}: DashboardShellProps) {
  const [mentorOpen, setMentorOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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
      <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
        {/* ===== DESKTOP SIDEBAR — fixed, never scrolls with content ===== */}
        <aside className="hidden h-dvh w-[248px] shrink-0 overflow-y-auto border-r border-workspace-border bg-workspace lg:block">
          <SidebarContent
            opportunityId={opportunityId}
            onNavigate={() => {}}
            onAskSol={() => setMentorOpen(true)}
            onSignOut={handleSignOut}
          />
        </aside>

        {/* ===== MAIN WORKSPACE COLUMN — the only scrolling region ===== */}
        <div className="flex h-dvh min-w-0 flex-1 flex-col overflow-y-auto">
          {/* ===== MOBILE TOP BAR ===== */}
          <header className="sticky top-0 z-30 flex shrink-0 items-center justify-between gap-4 border-b border-border/60 bg-background/90 px-5 py-4 backdrop-blur-xl lg:hidden">
            <Link to="/" className="flex items-center gap-2.5" aria-label="Solventia home">
              <img src={mark} alt="" width={298} height={436} className="h-8 w-auto" />
              <span className="font-display text-[1rem] font-semibold tracking-[0.18em] text-primary">
                SOLVENTIA
              </span>
            </Link>
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="flex size-9 items-center justify-center rounded-lg border border-border/70 text-foreground"
              aria-label="Open menu"
            >
              <Menu className="size-[1.125rem]" aria-hidden="true" />
            </button>
          </header>

          <main className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-0 px-5 py-9 sm:px-8 lg:px-12 lg:py-14">
            {children}
          </main>
        </div>

        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent
            side="left"
            className="w-[280px] border-workspace-border bg-workspace p-0 text-workspace-foreground [&_button]:text-workspace-foreground"
          >
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SidebarContent
              opportunityId={opportunityId}
              onNavigate={() => setMobileNavOpen(false)}
              onAskSol={() => setMentorOpen(true)}
              onSignOut={handleSignOut}
            />
          </SheetContent>
        </Sheet>

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
