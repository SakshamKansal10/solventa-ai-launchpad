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
import { REVEAL_MS, REVEAL_REDUCED_MS, RevealLockup } from "./Reveal";

/** How long the question waits for a tap before answering for the visitor. */
export const ASK_MS = 3_000;
const ANSWER_MS = 1_100;

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
  onSkip,
  still,
  reducedMotion,
}: {
  onReveal: () => void;
  onLockup: () => void;
  onSkip: () => void;
  still: boolean;
  reducedMotion: boolean;
}) {
  const { t } = useLocale();
  const [phase, setPhase] = useState<Phase>("ask");
  const [choice, setChoice] = useState<IntroChoice | null>(null);
  const cb = useRef({ onReveal, onLockup });
  cb.current = { onReveal, onLockup };

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
    if (phase === "answer") {
      const id = window.setTimeout(() => {
        setPhase("reveal");
        cb.current.onReveal();
      }, ANSWER_MS);
      return () => window.clearTimeout(id);
    }
    const id = window.setTimeout(
      () => cb.current.onLockup(),
      reducedMotion ? REVEAL_REDUCED_MS : REVEAL_MS,
    );
    return () => window.clearTimeout(id);
  }, [phase, reducedMotion]);

  const revealing = phase === "reveal";
  return (
    <div
      data-intro-layer="first"
      data-testid="intro"
      data-phase={phase}
      data-choice={choice ?? ""}
      className="fixed inset-0 z-[70] flex-col items-center justify-center"
      style={{
        // The film's lockup is beneath: the ground gives way to it. The still version reveals its
        // own lockup on the same ground.
        backgroundColor: revealing && !still ? "transparent" : PEARL_WORLD.sky,
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
            {t("v2.intro.q")}
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
                  {t(`v2.intro.c.${c}` as const)}
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

      {phase !== "ask" && choice && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4">
          <p
            role="status"
            aria-live="polite"
            data-lead-out={revealing ? "" : undefined}
            className="max-w-[min(1000px,100%)] text-center font-medium leading-[1.08] tracking-[-0.035em] text-[clamp(1.8rem,5vw,4rem)] motion-safe:animate-[sol-intro-in_420ms_ease_both]"
            data-testid="intro-answer"
          >
            {t(`v2.intro.a.${choice}` as const)}
          </p>
        </div>
      )}

      {revealing && still && <RevealLockup />}
    </div>
  );
}
