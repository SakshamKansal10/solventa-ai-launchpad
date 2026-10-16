import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

import { Wordmark } from "../nav/Wordmark";
import { useExperienceStore } from "../scroll/experience-store";
import {
  accentRuns,
  CAPTIONS,
  COUNT_LABEL,
  LABELS,
  type Caption,
  type WorldLabelDef,
} from "./copy";
import { TONE_VAR } from "./palette";

/**
 * The DOM layer above the canvas: the statements, the labels that follow the world, the
 * narrowing count and the finale. React renders it ONCE; the canvas' DomSync drives it every
 * frame through CSS variables — `--o` (a caption's presence, 0 → 1), `--d` (+1 arriving, −1
 * leaving) and the tone (`--ink`, `--quiet`, `--accent`, `--dark` …, set on the page). Visible
 * copy is decorative duplication (aria-hidden) of the server-rendered narrative — except the
 * finale CTA, a real, focusable link.
 *
 * Type: editorial. One dominant idea per viewport, set very large in Geist (uppercase, tight,
 * a few deliberate lines), each line revealed through its own mask as the story arrives and
 * carried out the top as it leaves — continuous with the scroll, never a fade, never a bounce.
 * Geist Mono for the small kickers and labels; the brand face only for SOLVENTIA.
 */
const TECH: CSSProperties = { fontFamily: "var(--font-tech)" };

// Flex columns: the line masks' negative margins must never collapse into the leading.
const PLACE: Record<Caption["place"], string> = {
  // The opening identity: centred on the stage.
  hero: "inset-x-[var(--gutter)] inset-y-0 flex flex-col items-center justify-center text-center",
  // The editorial block: bottom-left on the page grid, as wide as its longest line.
  low: "left-[var(--gutter)] right-[var(--gutter)] bottom-[clamp(1.5rem,7.5svh,4.75rem)] flex flex-col items-start text-left",
  // Top-left, under the site bar — where the scene fills the lower frame.
  top: "left-[var(--gutter)] right-[var(--gutter)] top-[clamp(6.5rem,17svh,10.5rem)] flex flex-col items-start text-left",
  // The finale scales with the viewport HEIGHT too, so on short screens it never rises into the S.
  end: "inset-x-[var(--gutter)] bottom-[5.5svh] text-center",
};
/**
 * Legibility without decoration: over the dark world a soft dark shadow; over the pearl world a
 * halo in the ground's own colour — invisible on the pearl, a quiet separation wherever graphite
 * type crosses a graphite object. Never a visible shadow on a light ground.
 */
const SHADOW: CSSProperties = {
  textShadow:
    "0 2px 30px rgb(5 8 14 / calc(0.85 * var(--dark, 0))), 0 1px 2px rgb(5 8 14 / calc(0.4 * var(--dark, 0))), 0 0 20px rgb(246 244 239 / calc(0.9 * (1 - var(--dark, 0)))), 0 0 6px rgb(246 244 239 / calc(0.7 * (1 - var(--dark, 0))))",
};
const VEIL_MASK = "linear-gradient(to right, #000 0%, #000 38%, transparent 82%)";
/** Major statements: clamp(72px, 8vw, 145px) on desktop — short lines, tight leading. */
const MAJOR =
  "font-medium uppercase leading-[0.93] tracking-[-0.045em] text-[clamp(2.4rem,10.4vw,3.6rem)] sm:text-[clamp(2.75rem,8vw,9.05rem)]";
/** A statement beside one large object: the same voice in a narrower column. */
const MEDIUM =
  "font-medium uppercase leading-[0.93] tracking-[-0.045em] text-[clamp(2.4rem,10.4vw,3.6rem)] sm:text-[clamp(2.6rem,6.3vw,7.4rem)]";
/** A voice from the world: sentence case, large, never shouted. */
const QUOTE =
  "font-medium leading-[1] tracking-[-0.04em] text-[clamp(2.1rem,8.6vw,3rem)] sm:text-[clamp(2.4rem,5.2vw,6rem)]";
/** One founder signal's value: the single data point that dominates the frame. */
const DATUM =
  "font-normal uppercase leading-[0.9] tracking-[-0.05em] text-[clamp(2.9rem,12vw,4.4rem)] sm:text-[clamp(3.25rem,8vw,9rem)]";
const KICKER =
  "font-mono text-[11px] uppercase tracking-[0.3em] sm:text-[12.5px] [margin-right:-0.3em]";

export function CinematicOverlay() {
  const store = useExperienceStore();
  const reg = (map: Map<string, HTMLElement>, id: string) => (el: HTMLElement | null) => {
    if (el) map.set(id, el);
    else map.delete(id);
  };

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden [--gutter:clamp(1.25rem,4.4vw,4.5rem)]"
      data-testid="cinematic-overlay"
    >
      {/* Edge vignette and a low scrim — in the dark world only. */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          opacity: "var(--dark, 0)",
          background:
            "radial-gradient(120% 90% at 50% 42%, transparent 55%, rgba(5,8,14,0.5) 100%), linear-gradient(to top, rgba(5,8,14,0.7), rgba(5,8,14,0.26) 26%, transparent 44%)",
        }}
      />
      {/* The pearl world's counterpart: a soft veil in the ground's own colour behind a statement,
          only while one is on screen (--veil-low / --veil-top, written by DomSync). */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-[62%]"
        style={{
          opacity: "calc(var(--veil-low, 0) * (1 - var(--dark, 0)))",
          // Only behind the type (the left of the grid): the subject on the right stays whole.
          maskImage: VEIL_MASK,
          WebkitMaskImage: VEIL_MASK,
          background:
            "linear-gradient(to top, rgb(246 244 239 / 0.9), rgb(246 244 239 / 0.72) 30%, rgb(246 244 239 / 0) 100%)",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[55%]"
        style={{
          opacity: "calc(var(--veil-top, 0) * (1 - var(--dark, 0)))",
          // Only behind the type (the left of the grid): the subject on the right stays whole.
          maskImage: VEIL_MASK,
          WebkitMaskImage: VEIL_MASK,
          background:
            "linear-gradient(to bottom, rgb(246 244 239 / 0.88), rgb(246 244 239 / 0.7) 34%, rgb(246 244 239 / 0) 100%)",
        }}
      />
      {CAPTIONS.map((c) => (
        <div
          key={c.id}
          ref={reg(store.state.dom.captions, c.id)}
          data-caption={c.id}
          aria-hidden={c.kind === "finale" ? undefined : true}
          className={`absolute ${PLACE[c.place]}`}
          style={{
            ...TECH,
            ...SHADOW,
            // The opening is on screen from the very first (server-rendered) paint.
            ["--o" as string]: c.kind === "hero" ? 1 : 0,
            visibility: c.kind === "hero" ? "visible" : "hidden",
          }}
        >
          <CaptionBody caption={c} />
        </div>
      ))}
      {/* The narrowing count: one very large figure, read like a statement. */}
      <div
        ref={(el) => {
          store.state.dom.counter = el;
        }}
        aria-hidden="true"
        data-testid="cinematic-count"
        className={`absolute ${PLACE.low}`}
        style={{ ...TECH, ...SHADOW, ["--o" as string]: 0, visibility: "hidden" }}
      >
        <Reveal i={0} n={3}>
          <Kicker text="Possibilities" tone="violet" />
        </Reveal>
        <Reveal i={1} n={3}>
          <p
            data-count
            className="text-[clamp(6rem,30vw,9rem)] font-light leading-[0.86] tracking-[-0.06em] tabular-nums sm:text-[clamp(8rem,16vw,16.5rem)]"
            style={{ color: "var(--ink)" }}
          >
            360
          </p>
        </Reveal>
        <Reveal i={2} n={3}>
          <p className={`mt-3 ${KICKER}`} style={{ color: "var(--quiet)" }}>
            {COUNT_LABEL}
          </p>
        </Reveal>
      </div>
      {LABELS.map((l) => (
        <div
          key={l.anchor}
          ref={reg(store.state.dom.anchors, l.anchor)}
          data-anchor={l.anchor}
          aria-hidden="true"
          className="absolute left-0 top-0 will-change-transform"
          style={{ opacity: 0, visibility: "hidden" }}
        >
          <div
            className="-translate-x-1/2 -translate-y-full whitespace-nowrap text-center"
            style={SHADOW}
          >
            <WorldLabel label={l} />
          </div>
        </div>
      ))}
      {/* Film time: a hairline where the page scrollbar would be. */}
      <div
        aria-hidden="true"
        className="absolute right-3 top-1/2 h-[38svh] w-px -translate-y-1/2 sm:right-5"
        style={{ background: "var(--hair)" }}
      >
        <div
          ref={(el) => {
            store.state.dom.time = el;
          }}
          className="absolute inset-0 origin-top"
          style={{ transform: "scaleY(0)", background: "var(--accent)", opacity: 0.75 }}
        />
      </div>
    </div>
  );
}

/**
 * One line of a statement behind its own mask. It rises into view as the caption arrives
 * (--d = 1) and continues up and out as it leaves (--d = −1); lines follow one another by a
 * fraction of the span — the composition assembles and clears in reading order.
 */
function Reveal({ i, n, children }: { i: number; n: number; children: ReactNode }) {
  const lag = n > 1 ? Math.min(0.14, 0.42 / (n - 1)) : 0;
  const u = `clamp(0, calc((var(--o, 1) - ${(i * lag).toFixed(3)}) / ${(1 - (n - 1) * lag).toFixed(3)}), 1)`;
  return (
    // The mask is a little larger than the line (negative margin, same padding): room for the
    // legibility halo, no change to the layout.
    <div className="-m-[0.2em] overflow-hidden p-[0.2em]">
      <div
        className="will-change-transform"
        style={{
          transform: `translate3d(0, calc((1 - ${u}) * 112% * var(--d, 1)), 0)`,
          // The mask does the work; opacity only softens the first and last few pixels.
          opacity: `clamp(0, calc(${u} * 4), 1)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** Where we are in the journey: a small mono line with a semantic mark. */
function Kicker({ text, tone }: { text: string; tone: keyof typeof TONE_VAR }) {
  return (
    <p
      className={`mb-4 inline-flex items-center gap-3 sm:mb-6 ${KICKER}`}
      style={{ color: "var(--quiet)" }}
    >
      <span
        aria-hidden="true"
        data-kicker-dot
        className="size-[6px] rounded-full"
        style={{ background: TONE_VAR[tone] }}
      />
      {text}
    </p>
  );
}

/** Validate · Build · Elevate: three equal words; only the separators carry champagne. */
export function Signature({ className = "" }: { className?: string }) {
  return (
    <p
      className={`font-wordmark text-[11px] font-normal uppercase tracking-[0.42em] [margin-right:-0.42em] sm:text-[13px] ${className}`}
      style={{ color: "var(--ink)" }}
    >
      Validate
      <span aria-hidden="true" className="mx-[0.9em]" style={{ color: "var(--accent-soft)" }}>
        •
      </span>
      Build
      <span aria-hidden="true" className="mx-[0.9em]" style={{ color: "var(--accent-soft)" }}>
        •
      </span>
      Elevate
    </p>
  );
}

/** A line with its *accented* words in champagne. */
function Accented({ text }: { text: string }) {
  return (
    <>
      {accentRuns(text).map((r, i) =>
        r.accent ? (
          <span key={i} style={{ color: "var(--accent)" }}>
            {r.text}
          </span>
        ) : (
          <span key={i}>{r.text}</span>
        ),
      )}
    </>
  );
}

/** Small, crisp, intentional: the third level of the type system. */
const LABEL_CLASS = "font-mono text-[11.5px] uppercase tracking-[0.26em]";

/** A milestone on the path: small, crisp, it follows its point in the world. */
function WorldLabel({ label: l }: { label: WorldLabelDef }) {
  return (
    <p
      className="text-[15px] font-medium tracking-[-0.01em]"
      style={{ ...TECH, color: "var(--ink)" }}
    >
      {l.text}
    </p>
  );
}

function CaptionBody({ caption: c }: { caption: Caption }) {
  if (c.kind === "hero") {
    return (
      <div className="flex flex-col items-center">
        <Reveal i={0} n={2}>
          <Wordmark size="hero" showMark={false} />
        </Reveal>
        {c.sub && (
          <Reveal i={1} n={2}>
            <p
              className="mt-5 text-[clamp(1rem,1.35vw,1.3rem)] tracking-[-0.01em] sm:mt-7"
              style={{ color: "var(--quiet)" }}
            >
              {c.sub}
            </p>
          </Reveal>
        )}
      </div>
    );
  }
  if (c.kind === "finale") {
    return (
      <div className="pointer-events-auto flex flex-col items-center">
        {/* The S completes alone; then its name settles in — the wordmark, its tracking closing
            as it arrives — the signature, the line, the CTA. */}
        <div aria-hidden="true" style={stage(0.02, 0.22)}>
          <Wordmark size="hero" showMark={false} textStyle={WORDMARK_SETTLE} />
        </div>
        <div
          aria-hidden="true"
          className="mt-[clamp(0.9rem,2.6svh,1.6rem)]"
          style={stage(0.16, 0.34)}
        >
          <Signature />
        </div>
        <p
          aria-hidden="true"
          className="mt-[clamp(1.1rem,3.4svh,2.2rem)] text-[clamp(1.15rem,1.7vw,1.6rem)] font-medium tracking-[-0.02em]"
          style={{ ...stage(0.32, 0.52), color: "var(--ink)" }}
        >
          <Accented text={c.lines[0]} />
        </p>
        <div style={stage(0.5, 0.78)}>
          <Link
            to="/consultation"
            data-testid="cinematic-cta"
            className="mt-[clamp(1.1rem,3.4svh,2rem)] inline-flex h-14 items-center gap-3 rounded-full bg-[#F4F2ED] px-8 text-[1.0625rem] font-semibold tracking-[-0.01em] text-[#15181F] shadow-[inset_0_0_0_1px_rgba(201,170,121,0.85)] transition-[background-color,transform] duration-200 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#DCC08B] active:scale-[0.98]"
          >
            Find My Business Idea
            <ArrowRight className="size-5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    );
  }
  const n = c.lines.length + (c.kicker || c.stages ? 1 : 0) + (c.sub ? 1 : 0);
  let i = 0;
  return (
    <>
      {c.stages ? (
        <Reveal i={i++} n={n}>
          <Signature className="mb-4 sm:mb-6" />
        </Reveal>
      ) : (
        c.kicker &&
        (c.kind === "datum" ? (
          <Reveal i={i++} n={n}>
            <p className={`mb-3 sm:mb-5 ${KICKER}`} style={{ color: "var(--quiet)" }}>
              {c.kicker}
            </p>
          </Reveal>
        ) : (
          c.tone && (
            <Reveal i={i++} n={n}>
              <Kicker text={c.kicker} tone={c.tone} />
            </Reveal>
          )
        ))
      )}
      {c.lines.length > 0 && (
        <div
          className={`flex flex-col items-start ${
            c.kind === "datum"
              ? DATUM
              : c.kind === "quote"
                ? QUOTE
                : c.size === "medium"
                  ? MEDIUM
                  : MAJOR
          }`}
          style={{ color: "var(--ink)" }}
        >
          {c.lines.map((line) => (
            <Reveal key={line} i={i++} n={n}>
              <Accented text={line} />
            </Reveal>
          ))}
        </div>
      )}
      {c.sub && (
        <Reveal i={i++} n={n}>
          {c.subTone === "note" ? (
            <p className={`mt-4 ${LABEL_CLASS}`} style={{ color: "var(--label)" }}>
              {c.sub}
            </p>
          ) : (
            <p
              className="mt-5 max-w-[34rem] text-[clamp(1.05rem,1.4vw,1.35rem)] tracking-[-0.012em] sm:mt-7"
              style={{ color: "var(--quiet)" }}
            >
              {c.sub}
            </p>
          )}
        </Reveal>
      )}
    </>
  );
}

/** The wordmark's tracking closes from slightly open to its final measure as it appears. */
const WORDMARK_U = "clamp(0, calc((var(--reveal, 1) - 0.02) / 0.24), 1)";
const WORDMARK_SETTLE: CSSProperties = {
  letterSpacing: `calc(0.12em + (1 - ${WORDMARK_U}) * (1 - ${WORDMARK_U}) * 0.16em)`,
  marginRight: `calc(-0.12em - (1 - ${WORDMARK_U}) * (1 - ${WORDMARK_U}) * 0.16em)`,
};

/**
 * One part of the finale, arriving over its own share of the reveal (CSS-only): it rises a few
 * pixels and settles with a soft deceleration — weight, never a bounce.
 */
function stage(from: number, to: number): CSSProperties {
  const u = `clamp(0, calc((var(--reveal, 1) - ${from}) / ${to - from}), 1)`;
  // Ease-out (1 − (1 − u)²) for the movement; the opacity follows the plain ramp.
  const eased = `calc(1 - (1 - ${u}) * (1 - ${u}))`;
  return { opacity: u, transform: `translate3d(0, calc((1 - ${eased}) * 14px), 0)` };
}
