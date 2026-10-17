import { useQuery } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";

import { BrandLockup } from "@/components/brand/Brand";
import { SignInDialog } from "@/components/solventia/SignInDialog";
import { getCurrentUser } from "@/lib/actions/auth";

import { SoundToggle } from "../sound/SoundToggle";

/**
 * Navigation for the cinematic homepage only — the shared Header (used by the other pages) is
 * untouched. Very little chrome: the Solventia lockup anchors the top-left; sign-in and the one
 * call to action sit on the right. The site's other destinations live in the footer. Sound has no
 * control in the bar (see SoundToggle — a keyboard-only mute that takes no room).
 *
 * Identity: during the film the bar's lockup is the DESTINATION of the opening identity — the
 * film carries the centred lockup here (DomSync), so the bar's own copy stays invisible and only
 * provides the link and the measured place. In the still version it is shown, on a pearl bar.
 *
 * Tone: every colour is a variable the film writes (`--ink`, `--quiet`, `--accent`, `--dark`),
 * so the bar is graphite over the pearl world and pearl over the dark one, continuously.
 *
 * Immersion: while the film plays the overlay sync sets --immerse (0 → 1) and the bar leaves the
 * stage — sign-in fades out entirely, the wordmark stays, quietly. It returns for the product and
 * the final hold. The call to action never recedes: a filled navy pill (with a champagne edge so
 * it holds on the dark world too), always one step away. Hover or keyboard focus restores the
 * whole bar at once (keyboard focus only: a click must not leave the bar pinned open for the rest
 * of the film). The actions keep a constant footprint, so nothing shifts.
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
  // The destination most visitors take is loaded before they ask for it: once the page has loaded
  // and the browser is idle (never competing with the film's own start), the consultation's code
  // is fetched, so the click renders it at once. Hover/touch intent preloads too (preload="intent").
  const router = useRouter();
  useEffect(() => {
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    let handle = 0;
    const preload = () => void router.preloadRoute({ to: "/consultation" }).catch(() => undefined);
    const schedule = () => {
      handle = w.requestIdleCallback
        ? w.requestIdleCallback(preload, { timeout: 6000 })
        : window.setTimeout(preload, 2500);
    };
    if (document.readyState === "complete") schedule();
    else window.addEventListener("load", schedule, { once: true });
    return () => {
      window.removeEventListener("load", schedule);
      if (w.cancelIdleCallback) w.cancelIdleCallback(handle);
      else window.clearTimeout(handle);
    };
  }, [router]);
  return (
    <header
      className="fixed inset-x-0 top-0 z-50 [--immerse-allow:1] hover:[--immerse-allow:0] has-[:focus-visible]:[--immerse-allow:0]"
      data-testid="cinematic-nav"
      data-nav-bar
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
        className="relative flex h-[76px] items-center justify-between gap-2 pl-[clamp(1rem,3.3vw,3.4rem)] pr-[clamp(1.25rem,4.4vw,4.5rem)] sm:h-[88px] sm:gap-3"
        style={{ fontFamily: "var(--font-tech)" }}
      >
        <Link
          to="/"
          className="flex w-max items-center rounded-lg transition-opacity duration-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)]"
          aria-label="Solventia home"
          style={recede(0.45)}
        >
          <span data-nav-brand className="block">
            <BrandLockup preset="nav" wordColor="var(--ink)" signatureColor="var(--ink)" />
          </span>
        </Link>
        <div className="relative flex items-center justify-end gap-2.5 sm:gap-5">
          <SoundToggle />
          <div className="transition-opacity duration-700" style={recede(1)} data-nav-secondary>
            {signedIn ? (
              <Link
                to="/dashboard"
                preload="intent"
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
          </div>
          <Link
            to="/consultation"
            preload="intent"
            data-nav-cta
            className="inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-full bg-[#102C57] px-3.5 text-[0.875rem] font-semibold text-[#F7F7F4] shadow-[inset_0_0_0_1px_rgba(201,170,121,0.55),0_8px_22px_-12px_rgba(16,44,87,0.7)] transition-[background-color,transform] duration-200 hover:bg-[#173C73] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)] active:scale-[0.98] sm:h-11 sm:px-5 sm:text-[0.95rem]"
          >
            <span className="max-sm:hidden">Find My Business Idea</span>
            <span className="sm:hidden">Start</span>
            <ArrowRight className="size-4 max-[379px]:hidden" aria-hidden="true" />
          </Link>
        </div>
      </nav>
    </header>
  );
}
