import { useEffect, useState } from "react";
import { useNavigate, useRouterState, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import {
  ArrowRight,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Sparkles,
} from "lucide-react";
import mark from "@/assets/solventia-mark.png";
import { useActiveSection, scrollToSection } from "@/hooks/use-active-section";
import { SignInDialog } from "./SignInDialog";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getCurrentUser, signOut } from "@/lib/actions/auth";

/** Exactly four items, exactly these anchors — PRODUCT and HOW IT WORKS
 * are same-page scrolls (only meaningful on "/"), FOR ORGANIZATIONS and
 * ABOUT are real routes. No "Explore Ideas" (Solventia isn't a public
 * idea catalogue) and no top-level "Roadmaps" (roadmaps live inside
 * Product / How It Works). */
const SCROLL_NAV: { label: string; id: string }[] = [
  { label: "Product", id: "founder-signal" },
  { label: "How It Works", id: "how-it-works" },
];
const SCROLL_IDS = SCROLL_NAV.map((item) => item.id);

function initials(email: string | null): string {
  return email ? email[0].toUpperCase() : "S";
}

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  // Separate, higher threshold — the background/border reveal (12px) and
  // the shadow (20px) are deliberately not the same trigger, so the
  // shadow never shows right at the top of the page.
  const [scrolledPastShadowThreshold, setScrolledPastShadowThreshold] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeId = useActiveSection(SCROLL_IDS);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isHome = pathname === "/";
  const currentUser = useQuery({ queryKey: ["current-user"], queryFn: () => getCurrentUser() });
  const isSignedIn = Boolean(currentUser.data);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 12);
      setScrolledPastShadowThreshold(window.scrollY > 20);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function handleScrollNav(id: string) {
    setMobileOpen(false);
    if (isHome) {
      scrollToSection(id);
    } else {
      navigate({ to: "/", hash: id });
    }
  }

  async function handleSignOut() {
    try {
      await signOut();
    } finally {
      queryClient.clear();
      navigate({ to: "/" });
    }
  }

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 h-[68px] transition-all duration-500 md:h-[84px] ${
        scrolled || !isHome
          ? "border-b border-[rgba(228,221,212,0.72)] bg-[rgba(252,250,247,0.88)] backdrop-blur-[18px] backdrop-saturate-[1.05]"
          : "border-b border-transparent"
      }`}
      style={
        scrolledPastShadowThreshold ? { boxShadow: "0 6px 28px rgba(23,32,61,0.045)" } : undefined
      }
    >
      <div className="mx-auto grid h-full max-w-[1920px] grid-cols-[auto_1fr_auto] items-center gap-6 px-[18px] sm:px-6 lg:px-10">
        <Link
          to="/"
          className="flex shrink-0 items-center gap-4"
          aria-label="Solventia home"
          onClick={() => setMobileOpen(false)}
        >
          <motion.img
            src={mark}
            alt="Solventia logo"
            width={298}
            height={436}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="h-[38px] w-auto drop-shadow-[0_1px_2px_rgba(23,32,61,0.18)] md:h-[44px]"
          />
          <span className="hidden leading-none sm:block">
            <span className="block font-display text-[1.4rem] font-semibold tracking-[0.22em] text-sol-ink">
              SOLVENTIA
            </span>
            <span className="mt-1.5 block text-[0.56rem] font-medium tracking-[0.34em] text-sol-champagne-deep">
              VALIDATE • BUILD • ELEVATE
            </span>
          </span>
        </Link>

        <nav className="hidden items-center justify-center gap-[34px] pl-8 xl:flex">
          {SCROLL_NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleScrollNav(item.id)}
              className={`relative text-[14px] font-[550] uppercase tracking-[0.04em] transition-colors duration-300 ${
                isHome && activeId === item.id
                  ? "text-sol-ink"
                  : "text-sol-ink/80 hover:text-sol-navy"
              }`}
            >
              {item.label}
              <span
                className={`absolute -bottom-1.5 left-[-2px] h-[1.5px] w-[calc(100%+4px)] origin-center bg-sol-champagne transition-transform duration-[180ms] ${
                  isHome && activeId === item.id ? "scale-x-100" : "scale-x-0"
                }`}
              />
            </button>
          ))}
          <Link
            to="/for-organizations"
            className="text-[14px] font-[550] uppercase tracking-[0.04em] text-sol-ink/80 transition-colors duration-300 hover:text-sol-navy"
            activeProps={{ className: "text-sol-ink" }}
          >
            For Organizations
          </Link>
          <Link
            to="/about"
            className="text-[14px] font-[550] uppercase tracking-[0.04em] text-sol-ink/80 transition-colors duration-300 hover:text-sol-navy"
            activeProps={{ className: "text-sol-ink" }}
          >
            About
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          {isSignedIn ? (
            <>
              <button
                type="button"
                onClick={() => navigate({ to: "/dashboard" })}
                className="hidden h-12 items-center gap-2 rounded-full bg-sol-navy px-[22px] text-[15px] font-semibold text-white transition-all duration-[180ms] hover:-translate-y-px hover:shadow-[0_10px_30px_rgba(23,32,61,.13)] sm:inline-flex"
              >
                Continue Dashboard
                <ArrowRight className="size-4 text-sol-champagne" aria-hidden="true" />
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="Account menu"
                    className="hidden size-10 items-center justify-center rounded-full text-[0.85rem] font-semibold text-white sm:flex"
                    style={{
                      background:
                        "linear-gradient(135deg, var(--sol-champagne), var(--sol-violet))",
                    }}
                  >
                    {initials(currentUser.data?.email ?? null)}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard" className="cursor-pointer">
                      <LayoutDashboard className="size-4" aria-hidden="true" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/consultation" className="cursor-pointer">
                      <Sparkles className="size-4" aria-hidden="true" />
                      Start New Consultation
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard/history" className="cursor-pointer">
                      <History className="size-4" aria-hidden="true" />
                      History
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard/settings" className="cursor-pointer">
                      <Settings className="size-4" aria-hidden="true" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                    <LogOut className="size-4" aria-hidden="true" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <SignInDialog
                trigger={
                  <button
                    type="button"
                    className="hidden text-[15px] font-semibold text-sol-ink transition-colors hover:text-sol-violet-deep sm:inline-flex"
                  >
                    Sign In
                  </button>
                }
              />
              <button
                type="button"
                onClick={() => navigate({ to: "/consultation" })}
                className="hidden h-12 items-center gap-2 rounded-full bg-sol-navy px-[22px] text-[15px] font-semibold text-white transition-all duration-[180ms] hover:-translate-y-px hover:shadow-[0_10px_30px_rgba(23,32,61,.13)] sm:inline-flex"
              >
                Find My Business Idea
                <ArrowRight className="size-4 text-sol-champagne" aria-hidden="true" />
              </button>
            </>
          )}

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="Open menu"
                className="flex size-10 items-center justify-center rounded-full border border-sol-border text-sol-ink transition-colors hover:border-sol-champagne/50 xl:hidden"
              >
                <Menu className="size-5" aria-hidden="true" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[85vw] max-w-sm border-sol-border bg-sol-page">
              <SheetTitle className="font-display text-xl text-sol-ink">Menu</SheetTitle>
              <nav className="mt-8 flex flex-col gap-1">
                {SCROLL_NAV.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleScrollNav(item.id)}
                    className={`rounded-lg px-3 py-3 text-left text-base font-medium transition-colors ${
                      isHome && activeId === item.id
                        ? "bg-sol-violet-mist text-sol-violet-deep"
                        : "text-sol-secondary hover:bg-sol-ivory hover:text-sol-ink"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
                <Link
                  to="/for-organizations"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-3 text-left text-base font-medium text-sol-secondary transition-colors hover:bg-sol-ivory hover:text-sol-ink"
                >
                  For Organizations
                </Link>
                <Link
                  to="/about"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-3 text-left text-base font-medium text-sol-secondary transition-colors hover:bg-sol-ivory hover:text-sol-ink"
                >
                  About
                </Link>
              </nav>
              <div className="mt-8 flex flex-col gap-3">
                {isSignedIn ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setMobileOpen(false);
                        navigate({ to: "/dashboard" });
                      }}
                      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-sol-navy text-[15px] font-semibold text-white"
                    >
                      Continue Dashboard
                      <ArrowRight className="size-4 text-sol-champagne" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMobileOpen(false);
                        navigate({ to: "/consultation" });
                      }}
                      className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-sol-border text-[15px] font-semibold text-sol-ink"
                    >
                      Start New Consultation
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMobileOpen(false);
                        handleSignOut();
                      }}
                      className="text-center text-[0.82rem] font-medium text-sol-secondary hover:text-sol-ink"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <SignInDialog
                      trigger={
                        <button
                          type="button"
                          onClick={() => setMobileOpen(false)}
                          className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-sol-border text-[15px] font-semibold text-sol-ink"
                        >
                          Sign In
                        </button>
                      }
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setMobileOpen(false);
                        navigate({ to: "/consultation" });
                      }}
                      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-sol-navy text-[15px] font-semibold text-white"
                    >
                      Find My Business Idea
                      <ArrowRight className="size-4 text-sol-champagne" aria-hidden="true" />
                    </button>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
