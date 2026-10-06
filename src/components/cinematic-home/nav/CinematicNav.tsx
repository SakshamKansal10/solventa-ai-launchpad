import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import mark from "@/assets/solventia-mark.png";
import { SignInDialog } from "@/components/solventia/SignInDialog";
import { useCurrentUserQuery } from "@/lib/queries";

import { SoundToggle } from "../sound/SoundToggle";

/**
 * Navigation for the cinematic homepage only — the shared Header (used by
 * eight other pages) is untouched. Transparent over the dark world with a soft
 * top scrim for legibility; same destinations, same sign-in dialog, same CTA.
 *
 * Immersion: during the deepest sequences the canvas' DomSync sets --immerse
 * (0 → 1) and the bar recedes — never below AA contrast — then returns for the
 * product and the finale. Hover or keyboard focus restores it at once.
 */
const recede = (amount: number) => ({
  opacity: `calc(1 - var(--immerse, 0) * var(--immerse-allow, 1) * ${amount})`,
});
const LINKS = [
  { to: "/how-it-works", label: "How it works" },
  { to: "/for-organizations", label: "For organizations" },
  { to: "/about", label: "About" },
] as const;

export function CinematicNav() {
  const user = useCurrentUserQuery();
  const signedIn = Boolean(user.data);
  return (
    <header
      className="fixed inset-x-0 top-0 z-50 [--immerse-allow:1] focus-within:[--immerse-allow:0] hover:[--immerse-allow:0]"
      data-testid="cinematic-nav"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[linear-gradient(to_bottom,rgba(7,11,19,0.82),rgba(7,11,19,0))] transition-opacity duration-700"
        style={recede(0.45)}
      />
      <nav
        aria-label="Primary"
        className="relative flex h-[76px] items-center justify-between gap-4 px-5 sm:px-10"
      >
        <Link
          to="/"
          className="flex items-center gap-3 rounded-lg transition-opacity duration-700"
          aria-label="Solventia home"
          style={recede(0.3)}
        >
          <img src={mark} alt="" width={30} height={30} className="size-[30px]" />
          <span className="font-display text-[1.05rem] tracking-[0.22em] text-[#F1EEE6] sm:text-[1.2rem] sm:tracking-[0.32em]">
            SOLVENTIA
          </span>
        </Link>
        <ul
          className="hidden items-center gap-8 transition-opacity duration-700 lg:flex"
          style={recede(0.45)}
        >
          {LINKS.map((l) => (
            <li key={l.to}>
              <Link
                to={l.to}
                className="text-[0.9rem] font-medium tracking-[0.04em] text-[#d8d1c4] transition-colors hover:text-white"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <div
          className="flex items-center gap-3 transition-opacity duration-700 sm:gap-5"
          style={recede(0.45)}
        >
          <SoundToggle />
          {signedIn ? (
            <Link
              to="/dashboard"
              className="whitespace-nowrap text-[0.875rem] font-semibold text-[#F1EEE6] hover:text-white sm:text-[0.9rem]"
            >
              Dashboard
            </Link>
          ) : (
            <SignInDialog
              trigger={
                <button
                  type="button"
                  className="whitespace-nowrap text-[0.875rem] font-semibold text-[#F1EEE6] hover:text-white sm:text-[0.9rem]"
                >
                  Sign In
                </button>
              }
            />
          )}
          <Link
            to="/consultation"
            className="inline-flex h-10 items-center gap-2 rounded-full border border-[#c4a67a]/60 px-4 text-[0.875rem] font-semibold text-[#F1EEE6] transition-colors hover:border-[#c4a67a] hover:bg-[#c4a67a]/10 sm:h-11 sm:px-5"
          >
            <span className="max-sm:hidden">Find My Business Idea</span>
            <span className="sm:hidden">Start</span>
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </nav>
    </header>
  );
}
