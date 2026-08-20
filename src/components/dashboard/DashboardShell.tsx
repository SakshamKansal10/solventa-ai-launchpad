import { createContext, useContext, useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import mark from "@/assets/solventia-mark.png";
import { Button } from "@/components/ui/button";
import { MentorPanel } from "@/components/dashboard/MentorPanel";
import { signOut } from "@/lib/actions/auth";

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
   * null on the dashboard home, set on an opportunity/roadmap page. */
  opportunityId?: string | null;
}

export function DashboardShell({ children, opportunityId = null }: DashboardShellProps) {
  const [mentorOpen, setMentorOpen] = useState(false);
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
      <div className="min-h-screen w-full bg-background text-foreground">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-border/60 bg-background/80 px-6 py-5 backdrop-blur-xl lg:px-10">
          <Link to="/" className="flex items-center gap-3" aria-label="Solventia home">
            <img src={mark} alt="" width={298} height={436} className="h-9 w-auto" />
            <span className="hidden font-display text-[1.1rem] font-semibold tracking-[0.2em] text-primary sm:block">
              SOLVENTIA
            </span>
          </Link>

          <nav className="hidden items-center gap-6 text-[0.85rem] font-medium text-muted-foreground sm:flex">
            <Link to="/dashboard" className="hover:text-primary [&.active]:text-primary">
              Dashboard
            </Link>
            <Link to="/dashboard/roadmap" className="hover:text-primary [&.active]:text-primary">
              My Path
            </Link>
          </nav>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-accent/40 text-primary"
              onClick={() => setMentorOpen(true)}
            >
              <Sparkles className="size-3.5 text-accent" aria-hidden="true" />
              Ask Sol
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              Sign out
            </Button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1100px] px-6 py-10 lg:px-10 lg:py-14">
          {children}
        </main>

        <MentorPanel open={mentorOpen} onOpenChange={setMentorOpen} opportunityId={opportunityId} />
      </div>
    </OpenMentorContext.Provider>
  );
}
