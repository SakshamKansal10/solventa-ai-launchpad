import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Briefcase,
  Clock,
  MapPin,
  Users,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

import { BrandMark, BrandSignature, BrandWordmark } from "@/components/brand/Brand";

import { useExperienceStore } from "../scroll/experience-store";
import {
  accentRuns,
  CAPTIONS,
  COUNT_LABEL,
  LABELS,
  plainText,
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
 *
 * Identity: the opening lockup (the approved emblem, SOLVENTIA, the signature) is the SAME object
 * as the site bar's — DomSync carries it from the centre into the bar as the visitor starts, and
 * it stays there. The finale presents the approved emblem itself on a light field, the film's
 * trajectories converging on it.
 */
const TECH: CSSProperties = { fontFamily: "var(--font-tech)" };

// Flex columns: the line masks' negative margins must never collapse into the leading.
const PLACE: Record<Caption["place"], string> = {
  // The editorial block: bottom-left on the page grid, as wide as its longest line.
  low: "left-[var(--gutter)] right-[var(--gutter)] bottom-[clamp(1.5rem,7.5svh,4.75rem)] flex flex-col items-start text-left",
  // Top-left, under the site bar — where the scene fills the lower frame.
  top: "left-[var(--gutter)] right-[var(--gutter)] top-[clamp(6.5rem,17svh,10.5rem)] flex flex-col items-start text-left",
  // The finale: one centred brand composition, below the site bar, scaled with the HEIGHT too.
  end: "inset-x-[var(--gutter)] bottom-0 top-[76px] flex flex-col items-center justify-center pb-[4svh] text-center sm:top-[88px]",
};
/**
 * Legibility without decoration: over the dark world a soft dark shadow; over the pearl world a
 * halo in the ground's own colour — invisible on the pearl, a quiet separation wherever graphite
 * type crosses a graphite object. Never a visible shadow on a light ground.
 */
const SHADOW: CSSProperties = {
  textShadow:
    "0 2px 30px rgb(5 8 14 / calc(0.85 * var(--dark, 0))), 0 1px 2px rgb(5 8 14 / calc(0.4 * var(--dark, 0))), 0 0 20px rgb(247 247 244 / calc(0.9 * (1 - var(--dark, 0)))), 0 0 6px rgb(247 247 244 / calc(0.7 * (1 - var(--dark, 0))))",
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
  "font-mono text-[12px] uppercase tracking-[0.3em] sm:text-[12.5px] [margin-right:-0.3em]";

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
            "linear-gradient(to top, rgb(247 247 244 / 0.9), rgb(247 247 244 / 0.72) 30%, rgb(247 247 244 / 0) 100%)",
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
            "linear-gradient(to bottom, rgb(247 247 244 / 0.88), rgb(247 247 244 / 0.7) 34%, rgb(247 247 244 / 0) 100%)",
        }}
      />
      <BrandOpening />
      {CAPTIONS.map((c) => (
        <div
          key={c.id}
          ref={reg(store.state.dom.captions, c.id)}
          data-caption={c.id}
          aria-hidden={c.kind === "finale" ? undefined : true}
          className={`absolute ${PLACE[c.place]}`}
          style={{
            ...TECH,
            // The finale sits on its light field: no legibility shadow, nothing over the emblem.
            ...(c.kind === "finale" ? null : SHADOW),
            ["--o" as string]: 0,
            visibility: "hidden",
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

/** One meaning per founder signal, from the product's own icon family (Lucide). */
const SIGNAL_ICONS: Record<NonNullable<Caption["signal"]>, LucideIcon> = {
  capital: Wallet,
  skills: Wrench,
  location: MapPin,
  time: Clock,
  experience: Briefcase,
  access: Users,
};

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

/** Validate · Build · Elevate, in the film: the brand signature in the current world's ink. */
export function Signature({ className = "" }: { className?: string }) {
  return (
    <BrandSignature
      className={`text-[12px] sm:text-[13px] ${className}`}
      color="var(--ink)"
      separator="var(--accent-soft)"
    />
  );
}

/**
 * The opening: the brand lockup alone at the centre of the pearl field, and a quiet cue below.
 * Its three parts (emblem, wordmark, signature) are what DomSync carries into the site bar —
 * each part moves and scales from here to its place in the bar's own lockup, so the visitor sees
 * one identity travel, not one fading out while another fades in. Visible from the first paint.
 */
function BrandOpening() {
  return (
    <div
      data-brand-opening
      aria-hidden="true"
      className="absolute inset-x-[var(--gutter)] inset-y-0 flex flex-col items-center justify-center"
    >
      <div className="flex items-center gap-[clamp(0.9rem,2.4vw,2.4rem)] [--mark-h:clamp(52px,14vw,82px)] sm:[--mark-h:clamp(84px,10.4vw,152px)]">
        <span data-brand-part="mark" className="block origin-top-left">
          <BrandMark />
        </span>
        <div className="flex flex-col gap-[clamp(0.55rem,1.4vw,1.4rem)]">
          <span data-brand-part="word" className="block origin-top-left self-start">
            <BrandWordmark
              className="text-[clamp(38px,10.4vw,62px)] sm:text-[clamp(62px,7.8vw,116px)]"
              color="var(--ink)"
            />
          </span>
          <span data-brand-part="sig" className="block origin-top-left self-start">
            <BrandSignature
              className="text-[clamp(10px,2.9vw,14px)] sm:text-[clamp(15px,1.75vw,26px)]"
              color="var(--ink)"
              separator="var(--accent-soft)"
            />
          </span>
        </div>
      </div>
      <div
        data-brand-cue
        className="absolute bottom-[clamp(1.75rem,6svh,3.5rem)] flex flex-col items-center gap-3"
      >
        <span className="relative block h-10 w-px overflow-hidden bg-[color:var(--hair)]">
          <span className="absolute inset-x-0 top-0 block h-1/2 bg-[color:var(--ink)] motion-safe:animate-[sol-cue_2.4s_cubic-bezier(0.45,0,0.2,1)_infinite]" />
        </span>
        <span
          className="font-mono text-[12px] uppercase tracking-[0.32em] [margin-right:-0.32em] sm:text-[12px]"
          style={{ color: "var(--quiet)" }}
        >
          Scroll to explore
        </span>
      </div>
    </div>
  );
}

/**
 * The finale's trajectories: four engineered paths — light electric blue at the edges, cobalt,
 * deep navy where they arrive — drawn in as the world resolves, converging on the emblem; a
 * champagne point marks each arrival. Pure SVG, 1 unit = 1 CSS px, centred on the emblem.
 */
const FINALE_PATHS = [
  { d: "M -1000 380 C -660 360 -380 170 -128 36", side: "l" },
  { d: "M -1000 -300 C -700 -282 -420 -96 -132 -26", side: "l" },
  { d: "M 1000 -360 C 680 -342 396 -146 128 -40", side: "r" },
  { d: "M 1000 300 C 720 290 430 96 134 22", side: "r" },
] as const;
const PATH_END = [
  [-128, 36],
  [-132, -26],
  [128, -40],
  [134, 22],
] as const;

function FinalePaths() {
  const draw = "clamp(0, calc(var(--reveal, 1) / 0.28), 1)";
  const settle = "clamp(0, calc((var(--reveal, 1) - 0.34) / 0.3), 1)";
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute left-1/2 top-1/2 h-[1400px] w-[2400px] -translate-x-1/2 -translate-y-1/2 overflow-visible"
      viewBox="-1200 -700 2400 1400"
      fill="none"
    >
      <defs>
        <linearGradient
          id="fin-l"
          x1="-1000"
          y1="0"
          x2="-130"
          y2="0"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#8CCBFF" />
          <stop offset="0.55" stopColor="#3D6FE0" />
          <stop offset="1" stopColor="#0E2A6B" />
        </linearGradient>
        <linearGradient id="fin-r" x1="1000" y1="0" x2="130" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#8CCBFF" />
          <stop offset="0.55" stopColor="#3D6FE0" />
          <stop offset="1" stopColor="#0E2A6B" />
        </linearGradient>
      </defs>
      <g style={{ opacity: `calc(1 - 0.62 * ${settle})` }}>
        {FINALE_PATHS.map((p) => (
          <path
            key={p.d}
            d={p.d}
            pathLength={1}
            stroke={`url(#fin-${p.side})`}
            strokeWidth={1.6}
            strokeLinecap="round"
            style={{ strokeDasharray: 1, strokeDashoffset: `calc(1 - ${draw})` }}
          />
        ))}
      </g>
      {PATH_END.map(([x, y]) => (
        <circle
          key={`${x}:${y}`}
          cx={x}
          cy={y}
          r={2.6}
          fill="#B8924F"
          style={{
            opacity: `calc(clamp(0, calc((var(--reveal, 1) - 0.26) / 0.08), 1) * (1 - 0.7 * ${settle}))`,
          }}
        />
      ))}
    </svg>
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
const LABEL_CLASS = "font-mono text-[12px] uppercase tracking-[0.26em]";

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
  if (c.kind === "finale") {
    return (
      <div className="pointer-events-auto flex flex-col items-center">
        {/* The trajectories resolve on the emblem; then its name, the signature, the line, the
            CTA — each settling in over its own share of the reveal. */}
        <div className="relative flex justify-center [--mark-h:clamp(92px,19svh,188px)]">
          <FinalePaths />
          {/* The approved emblem, whole and unaltered. */}
          <span aria-hidden="true" className="relative block" style={stage(0.3, 0.46)}>
            <BrandMark />
          </span>
        </div>
        <div
          aria-hidden="true"
          className="mt-[clamp(1.4rem,4.2svh,2.75rem)]"
          style={stage(0.38, 0.54)}
        >
          <BrandWordmark
            className="text-[clamp(38px,10.4vw,62px)] sm:text-[clamp(56px,min(7.6vw,12.5svh),112px)]"
            style={WORDMARK_SETTLE}
          />
        </div>
        <div
          aria-hidden="true"
          className="mt-[clamp(0.9rem,2.4svh,1.5rem)]"
          style={stage(0.46, 0.6)}
        >
          <BrandSignature className="text-[clamp(9.5px,2.5vw,13px)] sm:text-[clamp(12px,1.3vw,19px)]" />
        </div>
        <p
          aria-hidden="true"
          className="mt-[clamp(1.4rem,4svh,2.5rem)] text-[clamp(1.1rem,1.6vw,1.5rem)] font-medium tracking-[-0.02em] text-[#15181F]"
          style={stage(0.56, 0.7)}
        >
          {plainText(c.lines[0])}
        </p>
        <div style={stage(0.66, 0.84)}>
          <Link
            to="/consultation"
            data-testid="cinematic-cta"
            className="mt-[clamp(1.1rem,3.2svh,2rem)] inline-flex h-14 items-center gap-3 rounded-full bg-[#15181F] px-8 text-[1.0625rem] font-semibold tracking-[-0.01em] text-[#F7F7F4] shadow-[inset_0_0_0_1px_rgba(201,170,121,0.55)] transition-[background-color,transform] duration-200 hover:bg-[#0B1F3B] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B8924F] active:scale-[0.98]"
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
            <p
              className={`mb-3 inline-flex items-center gap-2.5 sm:mb-5 ${KICKER}`}
              style={{ color: "var(--quiet)" }}
            >
              {c.signal &&
                (() => {
                  const Icon = SIGNAL_ICONS[c.signal];
                  return (
                    <Icon
                      className="size-4 sm:size-[18px]"
                      strokeWidth={1.75}
                      style={{ color: "var(--ink)" }}
                      aria-hidden="true"
                    />
                  );
                })()}
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
const WORDMARK_U = "clamp(0, calc((var(--reveal, 1) - 0.38) / 0.2), 1)";
const WORDMARK_SETTLE: CSSProperties = {
  letterSpacing: `calc(0.13em + (1 - ${WORDMARK_U}) * (1 - ${WORDMARK_U}) * 0.12em)`,
  marginRight: `calc(-0.13em - (1 - ${WORDMARK_U}) * (1 - ${WORDMARK_U}) * 0.12em)`,
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
