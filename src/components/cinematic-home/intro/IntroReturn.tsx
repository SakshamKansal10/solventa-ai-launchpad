import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { getWelcomeInfo } from "@/lib/actions/welcome";
import { useLocale } from "@/lib/i18n/LocaleProvider";

import { PEARL_WORLD } from "../world/tone";
import { introGate } from "./intro-gate";
import { SkipLink } from "./IntroShared";
import { REVEAL_MS, REVEAL_REDUCED_MS, RevealLockup } from "./Reveal";

/** The returning line stays this long before the reveal. */
export const RETURN_LINE_MS = 1_400;
/** A signed-in founder gets a little longer, to choose "Go to my dashboard". */
const SIGNED_IN_MS = 2_400;

/**
 * The returning openings (owner, 2026-11-16), DOM and CSS only, then the same reveal:
 * - "return": a visitor who once tapped a choice, not signed in — one line for that choice
 *   (chosen by CSS from the head gate's `data-intro-choice`, so it is right from the first paint);
 * - "signedin": "Welcome back, <first name>." and "Go to my dashboard"; "Your plan is waiting."
 *   only with a roadmap, otherwise "Pick up where you left off.".
 */
export function IntroReturn({
  variant,
  onReveal,
  onLockup,
  onSkip,
  still,
  reducedMotion,
}: {
  variant: "return" | "signedin";
  onReveal: () => void;
  onLockup: () => void;
  onSkip: () => void;
  still: boolean;
  reducedMotion: boolean;
}) {
  const { t } = useLocale();
  const signedIn = variant === "signedin";
  const info = useQuery({
    queryKey: ["welcome-info"],
    queryFn: () => getWelcomeInfo(),
    // Only when the head gate chose this layer: both layers mount for a moment at hydration.
    enabled: signedIn && introGate() === "signedin",
    staleTime: 60_000,
  });
  const [phase, setPhase] = useState<"line" | "reveal">("line");
  const cb = useRef({ onReveal, onLockup });
  cb.current = { onReveal, onLockup };

  useEffect(() => {
    const id =
      phase === "line"
        ? window.setTimeout(
            () => {
              setPhase("reveal");
              cb.current.onReveal();
            },
            signedIn ? SIGNED_IN_MS : RETURN_LINE_MS,
          )
        : window.setTimeout(
            () => cb.current.onLockup(),
            reducedMotion ? REVEAL_REDUCED_MS : REVEAL_MS,
          );
    return () => window.clearTimeout(id);
  }, [phase, signedIn, reducedMotion]);

  const revealing = phase === "reveal";
  const name = info.data?.firstName;
  return (
    <div
      data-intro-layer={variant}
      data-testid="intro-return"
      data-phase={phase}
      className="fixed inset-0 z-[70] flex-col items-center justify-center"
      style={{
        backgroundColor: revealing && !still ? "transparent" : PEARL_WORLD.sky,
        pointerEvents: revealing ? "none" : "auto",
        fontFamily: "var(--font-tech)",
        color: "var(--ink)",
      }}
    >
      <SkipLink onSkip={onSkip} />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4">
        <div
          data-lead-out={revealing ? "" : undefined}
          className="pointer-events-auto flex max-w-[min(1000px,100%)] flex-col items-center gap-6 text-center motion-safe:animate-[sol-intro-in_520ms_cubic-bezier(0.2,0.7,0.2,1)_both]"
        >
          {signedIn ? (
            <>
              <h1
                className="font-medium leading-[1.04] tracking-[-0.04em] text-[clamp(2.2rem,6.4vw,5rem)]"
                data-testid="intro-return-title"
              >
                {name ? t("v2.intro.back.named", { name }) : t("v2.intro.back.title")}
              </h1>
              {info.data && (
                <p
                  className="text-[clamp(1.15rem,2.4vw,1.75rem)] leading-[1.35]"
                  style={{ color: "var(--quiet)" }}
                  data-testid="intro-return-line"
                >
                  {info.data.hasRoadmap ? t("v2.intro.back.none") : t("v2.intro.back.pickup")}
                </p>
              )}
              {!revealing && (
                <Link
                  to="/dashboard"
                  className="inline-flex min-h-14 items-center gap-3 rounded-full bg-[#15181F] px-8 text-[1.0625rem] font-semibold text-[#F7F7F4] transition-colors hover:bg-[#0B1F3B] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B8924F]"
                  data-testid="intro-return-dashboard"
                >
                  {t("v2.intro.back.dashboard")}
                  <ArrowRight className="size-5" aria-hidden="true" />
                </Link>
              )}
            </>
          ) : (
            <p
              className="max-w-[18em] font-medium leading-[1.08] tracking-[-0.035em] text-[clamp(1.8rem,5vw,4rem)]"
              data-testid="intro-return-line"
            >
              <span data-return-line="start">{t("v2.intro.back2.start")}</span>
              <span data-return-line="idea">{t("v2.intro.back2.idea")}</span>
              <span data-return-line="stuck">{t("v2.intro.back2.stuck")}</span>
            </p>
          )}
        </div>
      </div>
      {revealing && still && <RevealLockup />}
    </div>
  );
}
