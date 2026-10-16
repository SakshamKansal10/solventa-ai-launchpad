import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";

import { SignInDialog } from "@/components/solventia/SignInDialog";
import { getCurrentUser } from "@/lib/actions/auth";

import { SoundToggle } from "../sound/SoundToggle";
import { Wordmark } from "./Wordmark";

/**
 * Navigation for the cinematic homepage only — the shared Header (used by the other pages) is
 * untouched. Very little chrome: SOLVENTIA anchors the top-left; sound, sign-in and the one call
 * to action sit on the right. The site's other destinations live in the footer.
 *
 * Tone: every colour is a variable the film writes (`--ink`, `--quiet`, `--accent`, `--dark`),
 * so the bar is graphite over the pearl world and pearl over the dark one, continuously.
 *
 * Immersion: while the film plays the canvas' DomSync sets --immerse (0 → 1) and the bar leaves
 * the stage — sign-in and the CTA fade out entirely, the wordmark and the sound control stay,
 * quietly. It returns for the product and the final hold. Hover or keyboard focus restores the
 * whole bar at once (keyboard focus only: a click on the sound control must not leave the bar
 * pinned open for the rest of the film). The actions keep a constant footprint, so nothing shifts.
 */
const recede = (amount: number) => ({
  opacity: `calc(1 - var(--immerse, 0) * var(--immerse-allow, 1) * ${amount})`,
});

export function CinematicNav({ pendingNext }: { pendingNext?: string | null } = {}) {
  // The same session query (and cache key) as the shared Header.
  const user = useQuery({ queryKey: ["current-user"], queryFn: () => getCurrentUser() });
  const signedIn = Boolean(user.data);
  // A signed-out visitor bounced here from a protected route (`/?next=…`) gets the sign-in
  // prompt straight away, exactly as the shared Header does — then the address bar is cleaned so
  // a refresh lands on a plain homepage.
  const [nextPromptOpen, setNextPromptOpen] = useState(() => Boolean(pendingNext));
  // Kept from the first render: cleaning the address bar must not lose where to go after sign-in.
  const [nextPath] = useState(() => pendingNext ?? null);
  useEffect(() => {
    if (!pendingNext) return;
    window.history.replaceState(null, "", "/");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <header
      className="fixed inset-x-0 top-0 z-50 [--immerse-allow:1] hover:[--immerse-allow:0] has-[:focus-visible]:[--immerse-allow:0]"
      data-testid="cinematic-nav"
    >
      {/* A soft top scrim — only over the dark world, where pearl type needs it. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[linear-gradient(to_bottom,rgba(7,11,19,0.7),rgba(7,11,19,0))] transition-opacity duration-700"
        style={{
          opacity: `calc(var(--dark, 0) * (1 - var(--immerse, 0) * var(--immerse-allow, 1)))`,
        }}
      />
      <nav
        aria-label="Primary"
        className="relative flex h-[76px] items-center justify-between gap-3 px-[clamp(1.25rem,4.4vw,4.5rem)] sm:h-[88px]"
        style={{ fontFamily: "var(--font-tech)" }}
      >
        <Link
          to="/"
          className="flex w-max items-center rounded-lg transition-opacity duration-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)]"
          aria-label="Solventia home"
          style={recede(0.45)}
        >
          <Wordmark size="md" />
        </Link>
        <div className="flex items-center justify-end gap-2 sm:gap-5">
          <div className="transition-opacity duration-700" style={recede(0.35)}>
            <SoundToggle />
          </div>
          <div
            className="flex items-center gap-2 transition-opacity duration-700 sm:gap-5"
            style={recede(1)}
          >
            {signedIn ? (
              <Link
                to="/dashboard"
                className="whitespace-nowrap text-[0.875rem] font-medium transition-opacity hover:opacity-70 sm:text-[0.95rem]"
                style={{ color: "var(--ink)" }}
              >
                Dashboard
              </Link>
            ) : (
              <SignInDialog
                nextPath={nextPath}
                open={nextPromptOpen}
                onOpenChange={setNextPromptOpen}
                trigger={
                  <button
                    type="button"
                    className="whitespace-nowrap text-[0.875rem] font-medium transition-opacity hover:opacity-70 sm:text-[0.95rem]"
                    style={{ color: "var(--ink)" }}
                  >
                    Sign In
                  </button>
                }
              />
            )}
            <Link
              to="/consultation"
              className="inline-flex h-10 items-center gap-1.5 rounded-full border px-3.5 text-[0.875rem] font-medium transition-[background-color] duration-200 hover:bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] sm:h-11 sm:px-5 sm:text-[0.95rem]"
              style={{ color: "var(--ink)", borderColor: "var(--accent-soft)" }}
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
