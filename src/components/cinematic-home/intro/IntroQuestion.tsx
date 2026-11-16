import { useEffect, useRef, useState } from "react";

import { useLocale } from "@/lib/i18n/LocaleProvider";

import { PEARL_WORLD } from "../world/tone";
import { DEFAULT_CHOICE, INTRO_CHOICES, saveIntroChoice, type IntroChoice } from "./intro-gate";
import { COLLAPSE_MS, SkipLink } from "./IntroShared";

/** How long the question waits for a tap before answering for the visitor. */
export const ASK_MS = 3_000;
const ANSWER_MS = 1_100;
const HERE_MS = 900;

type Phase = "ask" | "answer" | "here" | "collapse" | "gone";

/**
 * "What brings you here?" — the opening. DOM and CSS only (no canvas, no images, no library), so
 * it costs nothing while the 3D world compiles underneath. Three large choices; on a tap, or after
 * three seconds, one answer line for that choice, then "Here is Solventia.", then the words
 * collapse into the centred brand lockup — the film's own first frame, already there beneath this
 * layer — so the hand-off is seamless. With `still`, the last step fades to the still version.
 *
 * After the collapse the parent shows the lockup's hold (IntroShared LockupHold) if the world is
 * not ready yet.
 */
export function IntroQuestion({
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
  const [phase, setPhase] = useState<Phase>("ask");
  const [choice, setChoice] = useState<IntroChoice | null>(null);
  const lockupRef = useRef(onLockup);
  lockupRef.current = onLockup;

  const choose = (c: IntroChoice) => {
    if (phase !== "ask") return;
    setChoice(c);
    saveIntroChoice(c);
    setPhase("answer");
  };

  // The question answers for the visitor if they do not tap.
  useEffect(() => {
    if (phase !== "ask") return;
    const id = window.setTimeout(() => {
      setChoice(DEFAULT_CHOICE);
      saveIntroChoice(DEFAULT_CHOICE);
      setPhase("answer");
    }, ASK_MS);
    return () => window.clearTimeout(id);
  }, [phase]);

  useEffect(() => {
    const next: Partial<Record<Phase, [Phase, number]>> = {
      answer: ["here", ANSWER_MS],
      here: ["collapse", HERE_MS],
      collapse: ["gone", COLLAPSE_MS],
    };
    const step = next[phase];
    if (!step) return;
    const id = window.setTimeout(() => {
      setPhase(step[0]);
      if (step[0] === "gone") lockupRef.current();
    }, step[1]);
    return () => window.clearTimeout(id);
  }, [phase]);

  const collapsing = phase === "collapse" || phase === "gone";
  // The words become the lockup: they draw in and soften into the centre while the pearl ground
  // they sit on gives way to the identical ground of the film's first frame.
  const wordsOut = collapsing
    ? reducedMotion || still
      ? { opacity: 0 }
      : { opacity: 0, transform: "scale(0.86)", filter: "blur(6px)", letterSpacing: "-0.06em" }
    : { opacity: 1 };

  return (
    <div
      data-intro-layer="first"
      data-testid="intro"
      data-phase={phase}
      data-choice={choice ?? ""}
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

      {phase !== "ask" && phase !== "gone" && choice && (
        <div
          role="status"
          aria-live="polite"
          className="flex max-w-[min(1000px,100%-32px)] flex-col items-center gap-5 px-4 text-center"
          style={{
            ...wordsOut,
            transition: `opacity ${COLLAPSE_MS}ms ease, transform ${COLLAPSE_MS}ms cubic-bezier(0.4,0,0.2,1), filter ${COLLAPSE_MS}ms ease, letter-spacing ${COLLAPSE_MS}ms ease`,
          }}
        >
          <p
            className="font-medium leading-[1.08] tracking-[-0.035em] text-[clamp(1.8rem,5vw,4rem)] motion-safe:animate-[sol-intro-in_420ms_ease_both]"
            data-testid="intro-answer"
          >
            {t(`v2.intro.a.${choice}` as const)}
          </p>
          {phase !== "answer" && (
            <p
              className="font-medium uppercase leading-none tracking-[-0.03em] text-[clamp(1.4rem,3.4vw,2.6rem)] motion-safe:animate-[sol-intro-in_420ms_ease_both]"
              data-testid="intro-here"
            >
              {t("v2.intro.here")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
