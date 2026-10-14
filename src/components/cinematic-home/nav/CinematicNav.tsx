import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { SignInDialog } from "@/components/solventia/SignInDialog";
import { useCurrentUserQuery } from "@/lib/queries";

import { SoundToggle } from "../sound/SoundToggle";
import { Wordmark } from "./Wordmark";

/**
 * Navigation for the cinematic homepage only — the shared Header (used by
 * eight other pages) is untouched. Transparent over the dark world with a soft
 * top scrim for legibility; same destinations, same sign-in dialog, same CTA.
 *
 * Immersion: while the film plays the canvas' DomSync sets --immerse (0 → 1) and
 * the site bar leaves the stage — links and calls to action fade out entirely,
 * the wordmark and the sound control stay, quietly. It returns for the product
 * and the final hold. Hover or keyboard focus restores the whole bar at once (keyboard focus only:
 * a click on the sound control must not leave the whole bar pinned open for the rest of the film).
 *
 * Layout: on wide screens three columns (identity · links · actions), so the links stay centred
 * on the page whatever the actions' width; the actions themselves keep a constant footprint
 * (the sound control never changes size), so nothing shifts as the bar resolves.
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
      className="fixed inset-x-0 top-0 z-50 [--immerse-allow:1] hover:[--immerse-allow:0] has-[:focus-visible]:[--immerse-allow:0]"
      data-testid="cinematic-nav"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[linear-gradient(to_bottom,rgba(7,11,19,0.82),rgba(7,11,19,0))] transition-opacity duration-700"
        style={recede(1)}
      />
      <nav
        aria-label="Primary"
        className="relative flex h-[76px] items-center justify-between gap-3 px-4 sm:gap-4 sm:px-10 xl:grid xl:grid-cols-[1fr_auto_1fr]"
        style={{ fontFamily: "var(--font-tech)" }}
      >
        <Link
          to="/"
          className="flex w-max items-center rounded-lg transition-opacity duration-700"
          aria-label="Solventia home"
          style={recede(0.45)}
        >
          <Wordmark size="md" />
        </Link>
        <ul
          className="hidden items-center gap-8 transition-opacity duration-700 lg:flex"
          style={recede(1)}
        >
          {LINKS.map((l) => (
            <li key={l.to}>
              <Link
                to={l.to}
                className="text-[0.9rem] font-medium tracking-[-0.005em] text-[#c9ccd4] transition-colors hover:text-white"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-end gap-2.5 sm:gap-4">
          <div className="transition-opacity duration-700" style={recede(0.35)}>
            <SoundToggle />
          </div>
          <div
            className="flex items-center gap-2.5 transition-opacity duration-700 sm:gap-4"
            style={recede(1)}
          >
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
        </div>
      </nav>
    </header>
  );
}
