import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowRight, Menu } from "lucide-react";
import mark from "@/assets/solventia-mark.png";
import { useActiveSection, scrollToSection } from "@/hooks/use-active-section";
import { PremiumButton } from "./PremiumButton";
import { SignInDialog } from "./SignInDialog";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const NAV: { label: string; id: string }[] = [
  { label: "How It Works", id: "how-it-works" },
  { label: "Explore Ideas", id: "explore-ideas" },
  { label: "Roadmaps", id: "roadmaps" },
  { label: "For NGOs", id: "for-ngos" },
  { label: "About Us", id: "about-us" },
];

const NAV_IDS = NAV.map((item) => item.id);

function NavLink({
  item,
  active,
  onNavigate,
}: {
  item: { label: string; id: string };
  active: boolean;
  onNavigate: (id: string) => void;
}) {
  return (
    <a
      href={`#${item.id}`}
      onClick={(event) => {
        event.preventDefault();
        onNavigate(item.id);
      }}
      className={`group relative text-[0.82rem] font-semibold tracking-[0.01em] transition-colors duration-300 ${
        active ? "text-primary" : "text-primary/85 hover:text-primary"
      }`}
    >
      {item.label}
      <span
        className={`absolute -bottom-1.5 left-0 h-px bg-accent transition-all duration-300 ${
          active ? "w-full" : "w-0 group-hover:w-full"
        }`}
      />
    </a>
  );
}

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeId = useActiveSection(NAV_IDS);
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function handleNavigate(id: string) {
    scrollToSection(id);
    setMobileOpen(false);
  }

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled
          ? "border-b border-border/60 bg-background/70 backdrop-blur-xl"
          : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto grid h-24 max-w-[1920px] grid-cols-[auto_1fr_auto] items-center gap-8 px-6 lg:px-10">
        <a
          href="#"
          onClick={(event) => {
            event.preventDefault();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className="flex shrink-0 items-center gap-5"
          aria-label="Solventia home"
        >
          <motion.img
            src={mark}
            alt="Solventia logo"
            width={298}
            height={436}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="h-12 w-auto drop-shadow-[0_1px_2px_rgba(10,25,47,0.18)]"
          />
          <span className="hidden leading-none sm:block">
            <span className="block font-display text-[1.5rem] font-semibold tracking-[0.24em] text-primary">
              SOLVENTIA
            </span>
            <span className="mt-1.5 block text-[0.56rem] font-medium tracking-[0.36em] text-accent/80">
              VALIDATE • BUILD • ELEVATE
            </span>
          </span>
        </a>

        <nav className="hidden items-center justify-center gap-8 pl-8 xl:flex">
          {NAV.map((item) => (
            <NavLink
              key={item.id}
              item={item}
              active={activeId === item.id}
              onNavigate={handleNavigate}
            />
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <SignInDialog
            trigger={
              <PremiumButton
                tone="outline"
                shape="pill"
                size="sm"
                className="hidden sm:inline-flex"
              >
                Sign In
              </PremiumButton>
            }
          />
          <PremiumButton
            tone="solid"
            shape="pill"
            size="sm"
            onClick={() => navigate({ to: "/consultation" })}
            className="hidden sm:inline-flex"
          >
            Find Your Business Idea
            <ArrowRight className="size-4 text-accent transition-transform duration-300 group-hover:translate-x-1" />
          </PremiumButton>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="Open menu"
                className="flex size-11 items-center justify-center rounded-full border border-border/70 text-primary transition-colors hover:border-primary/30 xl:hidden"
              >
                <Menu className="size-5" aria-hidden="true" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[85vw] max-w-sm border-border/60 bg-background">
              <SheetTitle className="font-display text-xl text-primary">Menu</SheetTitle>
              <nav className="mt-8 flex flex-col gap-1">
                {NAV.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    onClick={(event) => {
                      event.preventDefault();
                      handleNavigate(item.id);
                    }}
                    className={`rounded-lg px-3 py-3 text-base font-medium transition-colors ${
                      activeId === item.id
                        ? "bg-secondary text-primary"
                        : "text-muted-foreground hover:bg-secondary/60 hover:text-primary"
                    }`}
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
              <div className="mt-8 flex flex-col gap-3">
                <SignInDialog
                  trigger={
                    <PremiumButton tone="outline" shape="rounded" size="sm" className="w-full">
                      Sign In
                    </PremiumButton>
                  }
                />
                <PremiumButton
                  tone="solid"
                  shape="rounded"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    setMobileOpen(false);
                    navigate({ to: "/consultation" });
                  }}
                >
                  Find Your Business Idea
                  <ArrowRight className="size-4 text-accent" aria-hidden="true" />
                </PremiumButton>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
