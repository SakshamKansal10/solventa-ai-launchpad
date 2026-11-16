import { useLocale } from "@/lib/i18n/LocaleProvider";

/**
 * The openings' stylesheet, server-rendered with the page: each opening stays hidden unless the
 * head gate picked it before the first paint (`html[data-intro]`), and the returning line follows
 * `html[data-intro-choice]` — so nobody sees the wrong opening, or the wrong line, even before the
 * page is interactive. It also carries the Solventia reveal (see Reveal.tsx): transform, opacity
 * and clip-path only, on the real lockup.
 */
const R = ":is(main[data-intro-state=reveal],[data-reveal-run])";
const CSS = [
  "[data-intro-layer]{display:none}",
  "html[data-intro=show] [data-intro-layer=first]{display:flex}",
  "html[data-intro=return] [data-intro-layer=return]{display:flex}",
  "html[data-intro=signedin] [data-intro-layer=signedin]{display:flex}",
  "[data-return-line]{display:none}",
  "html[data-intro-choice=start] [data-return-line=start],html[data-intro-choice=idea] [data-return-line=idea],html[data-intro-choice=stuck] [data-return-line=stuck]{display:block}",
  "@keyframes sol-intro-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}",
  "@keyframes sol-intro-bar{0%{transform:translateX(-100%)}100%{transform:translateX(250%)}}",
  "@keyframes sol-sig-breathe{0%,100%{opacity:1}50%{opacity:.62}}",
  // The film's lockup waits, hidden, under an opening; the reveal builds it.
  "html[data-intro] main[data-intro-state=ask] [data-brand-opening]{visibility:hidden}",
  "html[data-intro] main[data-intro-state=ask] [data-brand-cue],main[data-intro-state=reveal] [data-brand-cue],main[data-intro-state=hold] [data-brand-cue]{visibility:hidden}",
  "main[data-intro-state=hold] [data-brand-part=sig]{animation:sol-sig-breathe 2.2s ease-in-out infinite}",
  // The reveal.
  "[data-rv=line],[data-rv=glint]{opacity:0}",
  "[data-rv=line]{transform-origin:50% 50%}",
  `${R} [data-rv=line]{animation:rv-line .4s cubic-bezier(.2,.7,.2,1) .3s both,rv-out .2s ease 2s forwards}`,
  `${R} [data-rv=top]{animation:rv-top .5s cubic-bezier(.34,1.45,.64,1) .65s both}`,
  `${R} [data-rv=bottom]{animation:rv-bottom .5s cubic-bezier(.34,1.45,.64,1) .65s both}`,
  `${R} [data-rv=glint]{animation:rv-glint .45s ease-out 1.15s both}`,
  `${R} [data-rv=ch]{animation:rv-ch .5s cubic-bezier(.2,.7,.2,1) calc(.9s + var(--i) * 45ms) both}`,
  `${R} [data-rv=w]{animation:rv-w .35s ease calc(1.45s + var(--i) * 120ms) both}`,
  `${R} [data-rv=dot]{animation:rv-in .3s ease 1.85s both}`,
  "@keyframes rv-line{from{opacity:1;transform:scaleX(0)}to{opacity:1;transform:scaleX(1)}}",
  "@keyframes rv-out{from{opacity:1}to{opacity:0}}",
  "@keyframes rv-in{from{opacity:0}to{opacity:1}}",
  "@keyframes rv-top{from{opacity:0;transform:translateX(-70%)}to{opacity:1;transform:none}}",
  "@keyframes rv-bottom{from{opacity:0;transform:translateX(70%)}to{opacity:1;transform:none}}",
  "@keyframes rv-glint{0%{opacity:0;transform:translateX(-140%) skewX(-18deg)}30%{opacity:1}100%{opacity:0;transform:translateX(240%) skewX(-18deg)}}",
  "@keyframes rv-ch{from{opacity:0;transform:translate(calc((var(--i) - 4) * .2em),105%)}to{opacity:1;transform:none}}",
  "@keyframes rv-w{from{opacity:0;transform:translateY(.6em)}to{opacity:1;transform:none}}",
  // The lead-in leaving: lifts 12 px, softens, fades.
  "[data-lead-out]{animation:rv-lead .35s ease both}",
  "@keyframes rv-lead{to{opacity:0;transform:translateY(-12px)}}",
  // Reduced motion: no movement — the lockup fades in over 300 ms.
  `@media (prefers-reduced-motion: reduce){[data-intro-layer] *,[data-intro-hold] *,${R} [data-rv],[data-lead-out],main[data-intro-state=hold] [data-brand-part=sig]{animation:none!important}${R} [data-rv=line],${R} [data-rv=glint]{opacity:0}main[data-intro-state=reveal] [data-brand-opening],[data-reveal-run]{animation:rv-in .3s ease both}}`,
].join("");

export function IntroStyles() {
  return <style>{CSS}</style>;
}

/** "Skip intro" — on screen for the whole opening, the reveal and the hold. */
export function SkipLink({ onSkip }: { onSkip: () => void }) {
  const { t } = useLocale();
  return (
    <button
      type="button"
      onClick={onSkip}
      className="pointer-events-auto absolute bottom-[max(clamp(14px,2.4vh,28px),env(safe-area-inset-bottom))] right-[clamp(16px,3vw,40px)] z-10 min-h-11 rounded-full px-3 font-mono text-[12px] uppercase tracking-[0.26em] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--ink)]"
      style={{ color: "var(--quiet)" }}
      data-testid="intro-skip"
    >
      {t("v2.intro.skip")}
    </button>
  );
}

/**
 * The lockup holding for the world after the reveal: transparent over the film's first frame,
 * with the Skip link and, in place of the scroll cue, a thin progress line that never stops
 * moving; the signature breathes (stylesheet above). Nothing is still for more than a second.
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
