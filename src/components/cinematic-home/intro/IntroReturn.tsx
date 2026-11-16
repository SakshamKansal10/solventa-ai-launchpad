import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { getWelcomeInfo } from "@/lib/actions/welcome";
import { useLocale } from "@/lib/i18n/LocaleProvider";

import { PEARL_WORLD } from "../world/tone";
import { OPENING_GROUND } from "./pacing";
import { cacheWelcome, introGate, readWelcome } from "./intro-gate";
import { SkipLink } from "./IntroShared";
import { useExitTiming } from "./pacing";
import { REVEAL_MS, REVEAL_REDUCED_MS, RevealLockup, ScanExit, WIPE_MS } from "./Reveal";

/** The returning line holds this long, to be read, before the exit (owner, 2026-11-16). */
export const RETURN_LINE_MS = 1_500;

const NAME_TOKEN = "__SOL_NAME__";
/** Safe inside an inline <script>: no "</script>" can close it early. */
const js = (v: unknown) => JSON.stringify(v).replace(/</g, "\\u003c");

/**
 * The returning openings (owner, 2026-11-16), DOM and CSS only, then the same exit and reveal:
 * - "return": a visitor who once tapped a choice, not signed in — one line for that choice
 *   (chosen by CSS from the head gate's `data-intro-choice`, so it is right from the first paint);
 * - "signedin": "Welcome back, <first name>." and one line. The words are decided ONCE, before
 *   the first paint (readWelcome: the session cookie in this browser, else the cached name), and
 *   never change: no server call feeds them. getWelcomeInfo only refreshes the cache for the
 *   next visit. No button: everyone goes on into the film, whose bar has the Dashboard link.
 * The text is wiped by the exit, stays mounted at opacity 0 until the wipe has finished, then
 * unmounts — nothing can show it again.
 */
export function IntroReturn({
  variant,
  onReveal,
  onLockup,
  onSkip,
  still,
  settled,
  reducedMotion,
}: {
  variant: "return" | "signedin";
  onReveal: () => void;
  onLockup: () => void;
  onSkip: () => void;
  still: boolean;
  /** The world is ready (or the still version was chosen): the exit may run without stalling. */
  settled: boolean;
  reducedMotion: boolean;
}) {
  const { t } = useLocale();
  const signedIn = variant === "signedin";
  // Decided once; the same values the inline script below wrote before the first paint.
  const [welcome] = useState(readWelcome);
  const info = useQuery({
    queryKey: ["welcome-info"],
    queryFn: () => getWelcomeInfo(),
    // Only when the head gate chose this layer: both layers mount for a moment at hydration.
    enabled: signedIn && introGate() === "signedin",
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  // Never on screen: it only keeps the cache right for the next opening.
  useEffect(() => {
    if (info.data) cacheWelcome(info.data.firstName, info.data.hasRoadmap);
  }, [info.data]);

  const [phase, setPhase] = useState<"line" | "reveal">("line");
  const [wiped, setWiped] = useState(false);
  const cb = useRef({ onReveal, onLockup });
  cb.current = { onReveal, onLockup };

  // The words are on screen from the first paint: hold, then exit (pacing.ts).
  useExitTiming(phase === "line", settled, () => {
    setPhase("reveal");
    cb.current.onReveal();
  });
  useEffect(() => {
    if (phase === "line") return;
    const ids = [
      window.setTimeout(() => setWiped(true), reducedMotion ? REVEAL_REDUCED_MS : WIPE_MS),
      window.setTimeout(() => cb.current.onLockup(), reducedMotion ? REVEAL_REDUCED_MS : REVEAL_MS),
    ];
    return () => ids.forEach((id) => window.clearTimeout(id));
  }, [phase, reducedMotion]);

  const revealing = phase === "reveal";
  // Every word is fixed at the first render, in that render's language: a later language switch
  // (the founder's saved language arriving after the page loads) never changes the opening.
  const [words] = useState(() => ({
    title: welcome.name
      ? t("v2.intro.back.named", { name: welcome.name })
      : t("v2.intro.back.title"),
    line: welcome.plan ? t("v2.intro.back.none") : t("v2.intro.back.pickup"),
    start: t("v2.intro.back2.start"),
    idea: t("v2.intro.back2.idea"),
    stuck: t("v2.intro.back2.stuck"),
    // Runs while the HTML is parsed, before the first paint: the server cannot know the name
    // (it lives in this browser), so the words are set here and React's first render matches.
    fill: `(function(){try{var w=window.__solIntro,b=document.currentScript.previousElementSibling;if(!w||!b)return;var h=b.querySelector("[data-welcome-title]"),p=b.querySelector("[data-welcome-line]");if(w.name&&h)h.textContent=${js(t("v2.intro.back.named", { name: NAME_TOKEN }))}.split(${js(NAME_TOKEN)}).join(w.name);if(w.plan&&p)p.textContent=${js(t("v2.intro.back.none"))};}catch(e){}})();`,
  }));
  return (
    <div
      data-intro-layer={variant}
      data-testid="intro-return"
      data-phase={phase}
      className="pointer-events-none fixed inset-0 z-[70] flex-col items-center justify-center"
      style={{
        backgroundColor:
          revealing && !still ? "transparent" : still ? PEARL_WORLD.sky : OPENING_GROUND,
        fontFamily: "var(--font-tech)",
        color: "var(--ink)",
      }}
    >
      <SkipLink onSkip={onSkip} />
      {revealing && <ScanExit />}
      {!wiped && (
        <div data-wipe className="absolute inset-0 flex items-center justify-center px-4">
          <div
            data-tighten
            className="flex max-w-[min(1000px,100%)] flex-col items-center gap-6 text-center motion-safe:animate-[sol-intro-in_520ms_cubic-bezier(0.2,0.7,0.2,1)_both]"
          >
            {signedIn ? (
              <>
                <div className="flex flex-col items-center gap-6">
                  <h1
                    className="font-medium leading-[1.04] tracking-[-0.04em] text-[clamp(2.2rem,6.4vw,5rem)]"
                    data-testid="intro-return-title"
                    data-welcome-title=""
                    suppressHydrationWarning
                  >
                    {words.title}
                  </h1>
                  <p
                    className="text-[clamp(1.15rem,2.4vw,1.75rem)] leading-[1.35]"
                    style={{ color: "var(--quiet)" }}
                    data-testid="intro-return-line"
                    data-welcome-line=""
                    suppressHydrationWarning
                  >
                    {words.line}
                  </p>
                </div>
                <script dangerouslySetInnerHTML={{ __html: words.fill }} suppressHydrationWarning />
              </>
            ) : (
              <p
                className="max-w-[18em] font-medium leading-[1.08] tracking-[-0.035em] text-[clamp(1.8rem,5vw,4rem)]"
                data-testid="intro-return-line"
              >
                <span data-return-line="start">{words.start}</span>
                <span data-return-line="idea">{words.idea}</span>
                <span data-return-line="stuck">{words.stuck}</span>
              </p>
            )}
          </div>
        </div>
      )}
      {revealing && still && <RevealLockup />}
    </div>
  );
}
