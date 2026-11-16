import { useLocale } from "@/lib/i18n/LocaleProvider";

/** The words collapse into the lockup (or, for the still version, fade). */
export const COLLAPSE_MS = 560;

/**
 * The openings' stylesheet, server-rendered with the page: each opening stays hidden unless the
 * head gate picked it before the first paint (`html[data-intro]`), and the line under "Welcome
 * back." follows `html[data-intro-choice]` — so a visitor never sees the wrong opening, or the
 * wrong line, even before the page is interactive.
 *
 * While the lockup holds for the world it stays alive: the tagline reveals and a thin progress
 * line keeps moving (nothing on screen is still for more than a second); no "Scroll to explore"
 * while the story cannot move yet.
 */
const CSS = [
  "[data-intro-layer]{display:none}",
  "html[data-intro=show] [data-intro-layer=first]{display:flex}",
  "html[data-intro=return] [data-intro-layer=return]{display:flex}",
  "[data-return-line]{display:none}",
  "html:not([data-intro-choice]) [data-return-line=none]{display:block}",
  "html[data-intro-choice=start] [data-return-line=start]{display:block}",
  "html[data-intro-choice=idea] [data-return-line=idea]{display:block}",
  "html[data-intro-choice=stuck] [data-return-line=stuck]{display:block}",
  "@keyframes sol-intro-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}",
  "@keyframes sol-intro-bar{0%{transform:translateX(-100%)}100%{transform:translateX(250%)}}",
  "@keyframes sol-sig-reveal{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0 0 0)}}",
  "@keyframes sol-sig-breathe{0%,100%{opacity:1}50%{opacity:.62}}",
  "html[data-intro] main[data-intro-state=ask] [data-brand-cue],main[data-intro-state=hold] [data-brand-cue]{visibility:hidden}",
  "main[data-intro-state=hold] [data-brand-part=sig]>*{animation:sol-sig-reveal 1.1s cubic-bezier(.2,.7,.2,1) both,sol-sig-breathe 2.2s ease-in-out 1.1s infinite}",
  "@media (prefers-reduced-motion: reduce){[data-intro-layer] *,[data-intro-hold] *,main[data-intro-state=hold] [data-brand-part=sig]>*{animation:none!important}}",
].join("");

export function IntroStyles() {
  return <style>{CSS}</style>;
}

/** "Skip intro" — on screen for the whole opening and the hold. */
export function SkipLink({ onSkip }: { onSkip: () => void }) {
  const { t } = useLocale();
  return (
    <button
      type="button"
      onClick={onSkip}
      className="pointer-events-auto absolute right-[clamp(16px,3vw,40px)] top-[clamp(14px,2.4vh,28px)] min-h-11 rounded-full px-3 font-mono text-[12px] uppercase tracking-[0.26em] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--ink)]"
      style={{ color: "var(--quiet)" }}
      data-testid="intro-skip"
    >
      {t("v2.intro.skip")}
    </button>
  );
}

/**
 * The lockup holding for the world (after either opening): transparent over the film's first
 * frame, with the Skip link and, in place of the scroll cue, a thin progress line that never
 * stops moving. The tagline's reveal is in the stylesheet above.
 */
export function LockupHold({ onSkip }: { onSkip: () => void }) {
  const { t } = useLocale();
  return (
    <div
      data-intro-hold
      data-testid="intro-hold-layer"
      className="pointer-events-none fixed inset-0 z-[70] flex flex-col items-center justify-center"
      style={{ fontFamily: "var(--font-tech)", color: "var(--ink)" }}
    >
      <SkipLink onSkip={onSkip} />
      <div
        role="status"
        className="absolute bottom-[clamp(2.4rem,8svh,4.5rem)] flex flex-col items-center gap-3"
        data-testid="intro-hold"
      >
        <span
          className="relative block h-px w-28 overflow-hidden"
          style={{ background: "var(--hair)" }}
        >
          <span
            className="absolute inset-y-0 left-0 block w-2/5 motion-safe:animate-[sol-intro-bar_1.4s_cubic-bezier(0.45,0,0.2,1)_infinite]"
            style={{ background: "var(--ink)" }}
          />
        </span>
        <span
          className="font-mono text-[12px] uppercase tracking-[0.3em]"
          style={{ color: "var(--quiet)" }}
        >
          {t("v2.intro.loading")}
        </span>
      </div>
    </div>
  );
}
