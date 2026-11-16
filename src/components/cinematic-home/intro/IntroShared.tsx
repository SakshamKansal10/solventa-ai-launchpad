import { useLocale } from "@/lib/i18n/LocaleProvider";

/**
 * The openings' stylesheet, server-rendered with the page: each opening stays hidden unless the
 * head gate picked it before the first paint (`html[data-intro]`), and the returning line follows
 * `html[data-intro-choice]` — so nobody sees the wrong opening, or the wrong line, even before the
 * page is interactive. It also carries the exit and the Solventia reveal (see Reveal.tsx):
 * transform, opacity and clip-path only.
 */
const R = ":is(main[data-intro-state=reveal],[data-reveal-run])";
/** The opening's own layer while it exits (both openings set data-phase=reveal). */
const X = "[data-intro-layer][data-phase=reveal]";
/** The sweep's easing — shared by the scan line, the wipe and the grid so they stay in step. */
const SWEEP = "cubic-bezier(.45,0,.25,1)";
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
  // Pre-warm: once the world has settled (main[data-prewarm]) the film's lockup — and the emblem's
  // halves — are painted under the opening's near-opaque ground, so everything the reveal shows
  // is rasterised before it starts (hidden until then, the first paint of the logo SVGs froze the
  // screen at the reveal's start; painted from the first frame, it delayed the first words by
  // 0.5 s — measured 2026-11-16). Under a 99.6 % ground it is invisible; the exit waits for the
  // frames to run smoothly again (pacing.ts).
  "html[data-intro] main[data-intro-state=ask]:not([data-prewarm]) [data-brand-opening]{visibility:hidden}",
  "html[data-intro] main[data-intro-state=ask][data-prewarm] [data-rv-half]{visibility:visible}",
  "html[data-intro] main[data-intro-state=ask] [data-brand-cue],main[data-intro-state=reveal] [data-brand-cue],main[data-intro-state=hold] [data-brand-cue]{visibility:hidden}",
  "main[data-intro-state=hold] [data-brand-part=sig]{animation:sol-sig-breathe 2.2s ease-in-out infinite}",
  // The exit (0–900 ms): text tightens and is wiped by the gold scan line; the grid draws behind.
  "[data-rv=scan],[data-rv=grid]{opacity:0}",
  `${X} [data-wipe]{animation:rv-wipe .6s ${SWEEP} both}`,
  `${X} [data-tighten]{animation:rv-tight .6s ${SWEEP} both}`,
  `${X} [data-rv=grid]{animation:rv-grid .9s both}`,
  `${X} [data-rv=scan]{animation:rv-scan .9s both,rv-out .15s ease .97s forwards}`,
  "@keyframes rv-wipe{from{clip-path:inset(0 0 0 0);opacity:1}99%{opacity:1}to{clip-path:inset(0 0 0 100%);opacity:0}}",
  "@keyframes rv-tight{from{transform:none}to{transform:scaleX(.94)}}",
  `@keyframes rv-grid{0%{opacity:1;clip-path:inset(0 100% 0 0);animation-timing-function:${SWEEP}}66.667%{opacity:1;clip-path:inset(0 0 0 0);animation-timing-function:ease}100%{opacity:0;clip-path:inset(0 0 0 0)}}`,
  `@keyframes rv-scan{0%{opacity:1;transform:translateX(0);clip-path:inset(0 0 0 0);animation-timing-function:${SWEEP}}66.667%{opacity:1;transform:translateX(calc(100vw - 2px));clip-path:inset(0 0 0 0);animation-timing-function:cubic-bezier(.5,0,.2,1)}100%{opacity:1;transform:translateX(calc(50vw - 1px));clip-path:inset(50% 0 calc(50% - 1px) 0)}}`,
  // The emblem: one whole logo at rest; the halves (and the glint) exist only while revealing.
  "[data-rv-half]{visibility:hidden}",
  `${R} [data-rv-half]{visibility:visible}`,
  `${R} [data-rv-whole]{visibility:hidden}`,
  // The reveal (900 ms on): hairline from the centre point, a still beat, then the lockup.
  "[data-rv=line],[data-rv=glint]{opacity:0}",
  "[data-rv=line]{transform-origin:50% 50%}",
  // Draws at the centre (0.9–1.3 s), drops below the lockup during the still beat (1.3–1.7 s,
  // before any letter shows: it never crosses them), fades at the end. rv-drop fills forwards
  // only, so it does not override the drawing before it starts.
  `${R} [data-rv=line]{animation:rv-line .4s cubic-bezier(.2,.7,.2,1) .9s both,rv-drop .4s cubic-bezier(.5,0,.2,1) 1.3s forwards,rv-out .2s ease 3.05s forwards}`,
  "@keyframes rv-drop{from{opacity:1;transform:translateY(0) scaleX(1)}to{opacity:1;transform:translateY(calc(var(--mark-h, 80px) / 2 + clamp(10px, 1.4vw, 20px))) scaleX(1)}}",
  `${R} [data-rv=top]{animation:rv-top .5s cubic-bezier(.34,1.45,.64,1) 1.7s both}`,
  `${R} [data-rv=bottom]{animation:rv-bottom .5s cubic-bezier(.34,1.45,.64,1) 1.7s both}`,
  `${R} [data-rv=glint]{animation:rv-glint .45s ease-out 2.2s both}`,
  `${R} [data-rv=ch]{animation:rv-ch .5s cubic-bezier(.2,.7,.2,1) calc(1.95s + var(--i) * 45ms) both}`,
  `${R} [data-rv=w]{animation:rv-w .35s ease calc(2.5s + var(--i) * 120ms) both}`,
  `${R} [data-rv=dot]{animation:rv-in .3s ease 2.9s both}`,
  "@keyframes rv-line{from{opacity:1;transform:scaleX(0)}to{opacity:1;transform:scaleX(1)}}",
  "@keyframes rv-out{from{opacity:1}to{opacity:0}}",
  "@keyframes rv-in{from{opacity:0}to{opacity:1}}",
  "@keyframes rv-top{from{opacity:0;transform:translateX(-70%)}to{opacity:1;transform:none}}",
  "@keyframes rv-bottom{from{opacity:0;transform:translateX(70%)}to{opacity:1;transform:none}}",
  "@keyframes rv-glint{0%{opacity:0;transform:translateX(-140%) skewX(-18deg)}30%{opacity:1}100%{opacity:0;transform:translateX(240%) skewX(-18deg)}}",
  "@keyframes rv-ch{from{opacity:0;transform:translate(calc((var(--i) - 4) * .2em),105%)}to{opacity:1;transform:none}}",
  "@keyframes rv-w{from{opacity:0;transform:translateY(.6em)}to{opacity:1;transform:none}}",
  // Reduced motion: no movement — the text fades and the whole lockup fades in over 300 ms.
  `@media (prefers-reduced-motion: reduce){[data-intro-layer] *,[data-intro-hold] *,${R} [data-rv],main[data-intro-state=hold] [data-brand-part=sig]{animation:none!important}[data-rv=scan],[data-rv=grid]{display:none}${X} [data-wipe]{animation:rv-out .3s ease both!important}${R} [data-rv=line],${R} [data-rv=glint]{opacity:0}${R} [data-rv-half]{visibility:hidden}${R} [data-rv-whole]{visibility:visible}main[data-intro-state=reveal] [data-brand-opening],[data-reveal-run]{animation:rv-in .3s ease both}}`,
].join("");

export function IntroStyles() {
  return <style>{CSS}</style>;
}

/**
 * Skip, for screen readers only (owner, 2026-11-16: no visible Skip on the opening). It is never
 * shown and is not in the tab order — keyboard users press Esc (CinematicHome) — but assistive
 * technology can still reach it, so nobody can be held by the opening.
 */
export function SkipLink({ onSkip }: { onSkip: () => void }) {
  const { t } = useLocale();
  return (
    <button
      type="button"
      tabIndex={-1}
      onClick={onSkip}
      className="sr-only"
      data-testid="intro-skip"
    >
      {t("v2.intro.skip")}
    </button>
  );
}

/**
 * The lockup holding for the world after the reveal: transparent over the film's first frame,
 * with, in place of the scroll cue, a thin progress line that never stops moving; the signature
 * breathes (stylesheet above). It always ends: the world arrives, or after 8 s the still version.
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
