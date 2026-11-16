import { useEffect, useRef, useState } from "react";

import { useLocale } from "@/lib/i18n/LocaleProvider";

import { PEARL_WORLD } from "../world/tone";
import {
  DEFAULT_CHOICE,
  INTRO_CHOICES,
  markIntroSeen,
  saveIntroChoice,
  type IntroChoice,
} from "./intro-gate";
import { SkipLink } from "./IntroShared";
import { OPENING_GROUND, afterExitFrame, startExit, useExitTiming } from "./pacing";
import { REVEAL_MS, REVEAL_REDUCED_MS, RevealLockup, ScanExit, WIPE_MS } from "./Reveal";

/** How long the question waits for a tap before answering for the visitor. */
export const ASK_MS = 3_000;

type Phase = "ask" | "answer" | "reveal";

/**
 * "What brings you here?" — the first-visit opening (also for anyone who never tapped a choice).
 * DOM and CSS only. Three large choices; on a tap, or after three seconds, one answer line, then
 * the Solventia reveal of the real lockup beneath (Reveal.tsx). A choice is stored only when the
 * visitor taps one — the three-second default is not their answer.
 */
export function IntroQuestion({
  onReveal,
  onLockup,
  onTextIn,
  onSkip,
  still,
  settled,
  reducedMotion,
}: {
  onReveal: (path: "world" | "flat") => void;
  onLockup: () => void;
  /** The text has faded in: the lockup beneath may be pre-painted (pacing.ts). */
  onTextIn: () => void;
  onSkip: () => void;
  still: boolean;
  /** The world is ready (or the still version was chosen): the exit may run without stalling. */
  settled: boolean;
  reducedMotion: boolean;
}) {
  const { t } = useLocale();
  // Every word is fixed at the first render: a later language switch never changes the opening.
  const [words] = useState(() => ({
    q: t("v2.intro.q"),
    c: Object.fromEntries(INTRO_CHOICES.map((c) => [c, t(`v2.intro.c.${c}` as const)])),
    a: Object.fromEntries(INTRO_CHOICES.map((c) => [c, t(`v2.intro.a.${c}` as const)])),
  }));
  const [phase, setPhase] = useState<Phase>("ask");
  const [choice, setChoice] = useState<IntroChoice | null>(null);
  // The answer is wiped by the exit, then unmounted: nothing can show it again.
  const [wiped, setWiped] = useState(false);
  // Once the text has faded in, the exit's own pieces are mounted, all but invisible, so they are
  // drawn once before the exit needs them (a first raster at the exit's start stalled it).
  const [prepared, setPrepared] = useState(false);
  const layerRef = useRef<HTMLDivElement>(null);
  const cb = useRef({ onReveal, onLockup, onTextIn });
  cb.current = { onReveal, onLockup, onTextIn };

  const choose = (c: IntroChoice) => {
    if (phase !== "ask") return;
    setChoice(c);
    saveIntroChoice(c);
    markIntroSeen();
    setPhase("answer");
  };

  useEffect(() => {
    if (phase === "ask") {
      const id = window.setTimeout(() => {
        setChoice(DEFAULT_CHOICE);
        setPhase("answer");
      }, ASK_MS);
      return () => window.clearTimeout(id);
    }
    if (phase === "answer") return;
    return afterExitFrame([
      { ms: reducedMotion ? REVEAL_REDUCED_MS : WIPE_MS, run: () => setWiped(true) },
      {
        ms: reducedMotion ? REVEAL_REDUCED_MS : REVEAL_MS,
        run: () => cb.current.onLockup(),
        whenDone: true,
      },
    ]);
  }, [phase, reducedMotion]);

  // The answer is on screen: hold, then exit once the world will not stall it (pacing.ts).
  useExitTiming(
    phase === "answer",
    settled,
    (path) => {
      startExit(layerRef.current, path, still);
      setPhase("reveal");
      cb.current.onReveal(path);
    },
    undefined,
    () => {
      setPrepared(true);
      cb.current.onTextIn();
    },
  );

  const revealing = phase === "reveal";
  return (
    <div
      data-intro-layer="first"
      data-testid="intro"
      ref={layerRef}
      data-phase={phase}
      data-choice={choice ?? ""}
      className="fixed inset-0 z-[70] flex-col items-center justify-center"
      style={{
        // The film's lockup is beneath: the ground gives way to it. The still version reveals its
        // own lockup on the same ground.
        backgroundColor:
          revealing && !still ? "transparent" : still ? PEARL_WORLD.sky : OPENING_GROUND,
        pointerEvents: revealing ? "none" : "auto",
        fontFamily: "var(--font-tech)",
        color: "var(--ink)",
      }}
    >
      <SkipLink onSkip={onSkip} />

      {phase === "ask" && (
        <div className="flex w-full max-w-[min(1120px,100%-32px)] flex-col items-start gap-[clamp(22px,4.5vh,48px)] px-4 sm:px-8">
          <h1
            className="font-medium leading-[1.02] tracking-[-0.04em] text-[clamp(2.3rem,7.4vw,5.6rem)] motion-safe:animate-[sol-intro-in_520ms_cubic-bezier(0.2,0.7,0.2,1)_both]"
            data-testid="intro-question"
          >
            {words.q}
          </h1>
          <ul className="flex w-full flex-col gap-3 sm:gap-4">
            {INTRO_CHOICES.map((c, i) => (
              <li
                key={c}
                className="motion-safe:animate-[sol-intro-in_520ms_cubic-bezier(0.2,0.7,0.2,1)_both]"
                style={{ animationDelay: `${120 + i * 90}ms` }}
              >
                <button
                  type="button"
                  onClick={() => choose(c)}
                  className="group flex min-h-[64px] w-full items-center justify-between gap-4 rounded-[28px] border px-[clamp(20px,2.6vw,36px)] py-4 text-left text-[clamp(1.2rem,2.5vw,2rem)] font-medium leading-[1.2] tracking-[-0.02em] transition-[background-color,border-color,color] duration-200 hover:border-[color:var(--ink)] hover:bg-[color:var(--ink)] hover:text-[#F7F7F4] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[color:var(--ink)]"
                  style={{ borderColor: "var(--hair)" }}
                  data-testid={`intro-choice-${c}`}
                >
                  {words.c[c]}
                  <span
                    aria-hidden="true"
                    className="text-[0.8em] opacity-60 group-hover:opacity-100"
                  >
                    →
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(prepared || revealing) && <ScanExit />}
      {phase !== "ask" && choice && !wiped && (
        // The wipe is a sliding window (IntroShared): this box moves right, its content left.
        <div data-wipe className="pointer-events-none absolute inset-0 overflow-hidden">
          <div data-wipe-in className="absolute inset-0 flex items-center justify-center px-4">
            <p
              role="status"
              aria-live="polite"
              data-tighten
              className="max-w-[min(1000px,100%)] text-center font-medium leading-[1.08] tracking-[-0.035em] text-[clamp(1.8rem,5vw,4rem)] motion-safe:animate-[sol-intro-in_420ms_ease_both]"
              data-testid="intro-answer"
            >
              {words.a[choice]}
            </p>
          </div>
        </div>
      )}

      {(prepared || revealing) && still && <RevealLockup run={revealing} />}
    </div>
  );
}
