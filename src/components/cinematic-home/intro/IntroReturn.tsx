import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { getCurrentUser } from "@/lib/actions/auth";
import { useLocale } from "@/lib/i18n/LocaleProvider";

import { PEARL_WORLD } from "../world/tone";
import { COLLAPSE_MS, SkipLink } from "./IntroShared";

/** How long "Welcome back." stays before it collapses into the lockup. */
export const WELCOME_MS = 1_800;

/**
 * The returning visitor's opening (owner follow-up): DOM and CSS only, in the same style as the
 * first-visit question. "Welcome back." and one line from their earlier answer (the line is
 * chosen by CSS from the head gate's `data-intro-choice`, so it is right from the first paint);
 * a signed-in founder also gets "Go to my dashboard", which leaves the film entirely. Then it
 * collapses into the lockup, and the film starts the moment the world is ready.
 */
export function IntroReturn({
  onLockup,
  onSkip,
  still,
  reducedMotion,
}: {
  onLockup: () => void;
  onSkip: () => void;
  still: boolean;
  reducedMotion: boolean;
}) {
  const { t } = useLocale();
  const user = useQuery({ queryKey: ["current-user"], queryFn: () => getCurrentUser() });
  const [phase, setPhase] = useState<"welcome" | "collapse" | "gone">("welcome");
  const lockupRef = useRef(onLockup);
  lockupRef.current = onLockup;
  const signedIn = Boolean(user.data);

  useEffect(() => {
    // A signed-in founder may want the dashboard: give them a moment longer to choose it.
    const wait = phase === "welcome" ? WELCOME_MS + (signedIn ? 1_200 : 0) : COLLAPSE_MS;
    if (phase === "gone") return;
    const id = window.setTimeout(() => {
      if (phase === "welcome") setPhase("collapse");
      else {
        setPhase("gone");
        lockupRef.current();
      }
    }, wait);
    return () => window.clearTimeout(id);
  }, [phase, signedIn]);

  const collapsing = phase !== "welcome";
  const wordsOut = collapsing
    ? reducedMotion || still
      ? { opacity: 0 }
      : { opacity: 0, transform: "scale(0.86)", filter: "blur(6px)", letterSpacing: "-0.06em" }
    : { opacity: 1 };

  return (
    <div
      data-intro-layer="return"
      data-testid="intro-return"
      data-phase={phase}
      className="fixed inset-0 z-[70] flex-col items-center justify-center"
      style={{
        backgroundColor: collapsing ? "transparent" : PEARL_WORLD.sky,
        transition: `background-color ${COLLAPSE_MS}ms cubic-bezier(0.4,0,0.2,1)`,
        pointerEvents: collapsing ? "none" : "auto",
        fontFamily: "var(--font-tech)",
        color: "var(--ink)",
      }}
    >
      <SkipLink onSkip={onSkip} />
      <div
        className="flex max-w-[min(1000px,100%-32px)] flex-col items-center gap-6 px-4 text-center"
        style={{
          ...wordsOut,
          transition: `opacity ${COLLAPSE_MS}ms ease, transform ${COLLAPSE_MS}ms cubic-bezier(0.4,0,0.2,1), filter ${COLLAPSE_MS}ms ease, letter-spacing ${COLLAPSE_MS}ms ease`,
        }}
      >
        <h1
          className="font-medium leading-[1.02] tracking-[-0.04em] text-[clamp(2.4rem,7vw,5.4rem)] motion-safe:animate-[sol-intro-in_520ms_cubic-bezier(0.2,0.7,0.2,1)_both]"
          data-testid="intro-return-title"
        >
          {t("v2.intro.back.title")}
        </h1>
        <div
          className="max-w-[30em] text-[clamp(1.15rem,2.4vw,1.75rem)] leading-[1.35] tracking-[-0.015em] motion-safe:animate-[sol-intro-in_520ms_cubic-bezier(0.2,0.7,0.2,1)_160ms_both]"
          style={{ color: "var(--quiet)" }}
          data-testid="intro-return-line"
        >
          <p data-return-line="start">{t("v2.intro.back.start")}</p>
          <p data-return-line="idea">{t("v2.intro.back.idea")}</p>
          <p data-return-line="stuck">{t("v2.intro.back.stuck")}</p>
          <p data-return-line="none">{t("v2.intro.back.none")}</p>
        </div>
        {signedIn && phase === "welcome" && (
          <Link
            to="/dashboard"
            className="mt-2 inline-flex min-h-14 items-center gap-3 rounded-full bg-[#15181F] px-8 text-[1.0625rem] font-semibold text-[#F7F7F4] transition-colors hover:bg-[#0B1F3B] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B8924F] motion-safe:animate-[sol-intro-in_520ms_ease_both]"
            data-testid="intro-return-dashboard"
          >
            {t("v2.intro.back.dashboard")}
            <ArrowRight className="size-5" aria-hidden="true" />
          </Link>
        )}
      </div>
    </div>
  );
}
