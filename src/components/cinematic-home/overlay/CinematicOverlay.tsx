import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { CSSProperties } from "react";

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
import { ACCENT, LABEL, PEARL, QUIET, STAGE, TONE } from "./palette";

/**
 * The DOM layer above the canvas: the statements, labels that follow the world, the narrowing
 * count and the finale CTA. React renders it ONCE; the canvas' DomSync writes opacity/position
 * every frame straight to these elements. Visible copy is decorative duplication (aria-hidden)
 * of the server-rendered narrative — except the finale CTA, which is a real, focusable link.
 *
 * Type system: Geist for every statement (large, tight, balanced), Geist Mono for the small
 * chapter kickers and world labels, the site's display face only for the SOLVENTIA wordmark.
 * Colour is semantic and sparse: pearl for what is resolved, champagne for conviction (one or
 * two words, the CTA), violet only for the moments the system is reasoning.
 */
const TECH: CSSProperties = { fontFamily: "var(--font-tech)" };

const PLACE: Record<Caption["place"], string> = {
  // The statement block: centred in the lower third, sized to its words, never a full-width bar.
  title:
    "left-1/2 bottom-[9svh] w-max max-w-[min(62rem,calc(100vw-2.5rem))] -translate-x-1/2 text-center max-sm:bottom-[7svh]",
  // The finale scales with the viewport HEIGHT too, so on short screens it never rises into the S.
  end: "inset-x-5 bottom-[6svh] text-center sm:inset-x-[10vw]",
};
const SHADOW = "[text-shadow:0_2px_30px_rgba(5,8,14,0.9),0_1px_2px_rgba(5,8,14,0.55)]";
const STATEMENT = "font-medium leading-[1.04] tracking-[-0.035em] text-balance";
const STATEMENT_SIZE = "text-[clamp(2.15rem,4.3vw,4.4rem)]";

export function CinematicOverlay() {
  const store = useExperienceStore();
  const reg = (map: Map<string, HTMLElement>, id: string) => (el: HTMLElement | null) => {
    if (el) map.set(id, el);
    else map.delete(id);
  };

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      data-testid="cinematic-overlay"
    >
      {/* Edge vignette and a low scrim: legibility for the statements, depth for the frame. */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 42%, transparent 55%, rgba(5,8,14,0.55) 100%), linear-gradient(to top, rgba(5,8,14,0.78), rgba(5,8,14,0.32) 24%, transparent 42%)",
        }}
      />
      {CAPTIONS.map((c) => (
        <div
          key={c.id}
          ref={reg(store.state.dom.captions, c.id)}
          data-caption={c.id}
          aria-hidden={c.kind === "finale" ? undefined : true}
          className={`absolute ${PLACE[c.place]} will-change-[opacity,transform] ${SHADOW}`}
          style={{
            ...TECH,
            opacity: c.id === "void" ? 1 : 0,
            visibility: c.id === "void" ? "visible" : "hidden",
          }}
        >
          <CaptionBody caption={c} />
        </div>
      ))}
      {/* The narrowing count: one figure, read like a statement. */}
      <div
        ref={(el) => {
          store.state.dom.counter = el;
        }}
        aria-hidden="true"
        data-testid="cinematic-count"
        className={`absolute bottom-[9svh] left-1/2 w-max -translate-x-1/2 text-center max-sm:bottom-[7svh] ${SHADOW}`}
        style={{ ...TECH, opacity: 0, visibility: "hidden" }}
      >
        <Kicker text="Possibilities" tone="violet" />
        <p
          data-count
          className="text-[clamp(3.6rem,7.4vw,7rem)] font-light leading-none tracking-[-0.04em] tabular-nums"
          style={{ color: PEARL }}
        >
          360
        </p>
        <p
          className="mt-3 font-mono text-[12.5px] uppercase tracking-[0.3em]"
          style={{ color: QUIET, marginRight: "-0.3em" }}
        >
          {COUNT_LABEL}
        </p>
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
          <div className="-translate-x-1/2 -translate-y-full whitespace-nowrap text-center [text-shadow:0_0_14px_rgba(5,8,14,0.95),0_1px_3px_rgba(5,8,14,0.9)]">
            <WorldLabel label={l} />
          </div>
        </div>
      ))}
      {/* Film time: a hairline where the page scrollbar would be. */}
      <div
        aria-hidden="true"
        className="absolute right-3 top-1/2 h-[38svh] w-px -translate-y-1/2 bg-[#F1EEE6]/[0.09] sm:right-5"
      >
        <div
          ref={(el) => {
            store.state.dom.time = el;
          }}
          className="absolute inset-0 origin-top bg-[#d9c39b]/70"
          style={{ transform: "scaleY(0)" }}
        />
      </div>
    </div>
  );
}

/** Where we are in the journey: a small mono line with a semantic mark. */
function Kicker({ text, tone }: { text: string; tone: keyof typeof TONE }) {
  return (
    <p
      className="mb-5 inline-flex items-center gap-3 font-mono text-[12.5px] uppercase tracking-[0.3em] max-sm:mb-3.5 max-sm:text-[11px]"
      style={{ color: QUIET, marginRight: "-0.3em" }}
    >
      <span
        aria-hidden="true"
        data-kicker-dot
        className="size-[6px] rounded-full"
        style={{ background: TONE[tone], boxShadow: `0 0 10px ${TONE[tone]}66` }}
      />
      {text}
    </p>
  );
}

/** A kicker made of stages: DomSync lights the one being travelled (one dominant state). */
function StageKicker({ stages }: { stages: NonNullable<Caption["stages"]> }) {
  return (
    <p
      className="mb-5 inline-flex items-center gap-3.5 font-mono text-[12.5px] uppercase tracking-[0.3em] max-sm:mb-3.5 max-sm:gap-2.5 max-sm:text-[11px]"
      style={{ marginRight: "-0.3em" }}
    >
      {stages.map((s, i) => (
        <span key={s.label} className="inline-flex items-center gap-3.5 max-sm:gap-2.5">
          {i > 0 && <span aria-hidden="true" className="h-px w-5 bg-[#5F6878]/70 max-sm:w-3" />}
          <span
            data-stage={i}
            className="transition-colors duration-500 ease-out"
            style={{ color: i === 0 ? STAGE.active : STAGE.ahead }}
          >
            {s.label}
          </span>
        </span>
      ))}
    </p>
  );
}

/** A statement with its *accented* words in champagne. */
function Accented({ text }: { text: string }) {
  return (
    <>
      {accentRuns(text).map((r, i) =>
        r.accent ? (
          <span key={i} style={{ color: ACCENT }}>
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

function WorldLabel({ label: l }: { label: WorldLabelDef }) {
  switch (l.kind) {
    case "quote":
      return (
        <div style={TECH}>
          <p
            className="text-[clamp(1.7rem,2.8vw,2.6rem)] font-medium leading-tight tracking-[-0.025em]"
            style={{ color: PEARL }}
          >
            {l.text}
          </p>
          <p className={`mt-2.5 ${LABEL_CLASS}`} style={{ color: LABEL }}>
            {l.sub}
          </p>
        </div>
      );
    case "signal":
      // The category is the label; the founder's value is what is read.
      return (
        <div style={TECH}>
          <p className={LABEL_CLASS} style={{ color: LABEL }}>
            {l.text}
          </p>
          <p
            className="mt-1.5 text-[clamp(1.45rem,2.05vw,1.9rem)] font-semibold leading-none tracking-[-0.025em]"
            style={{ color: PEARL }}
          >
            {l.sub}
          </p>
        </div>
      );
    case "direction":
      return l.chosen ? (
        <p
          className="font-mono text-[13.5px] font-medium uppercase tracking-[0.34em]"
          style={{ color: ACCENT }}
        >
          {l.text}
        </p>
      ) : (
        <p
          className="font-mono text-[12.5px] uppercase tracking-[0.34em]"
          style={{ color: "#B9C0CC" }}
        >
          {l.text}
        </p>
      );
    case "fit":
      // The result is the value; what failed is the label beneath it.
      return (
        <div style={TECH}>
          <p
            className={`tracking-[-0.015em] ${l.chosen ? "text-[19px] font-semibold" : "text-[17px] font-medium"}`}
            style={{ color: l.chosen ? ACCENT : "#DCD9D1" }}
          >
            {l.text}
          </p>
          {l.sub && (
            <p
              className="mt-1 font-mono text-[11px] uppercase tracking-[0.24em]"
              style={{ color: LABEL }}
            >
              {l.sub}
            </p>
          )}
        </div>
      );
    case "step":
      return (
        <p className="text-[16px] font-medium tracking-[-0.01em]" style={{ ...TECH, color: PEARL }}>
          {l.text}
        </p>
      );
  }
}

function CaptionBody({ caption: c }: { caption: Caption }) {
  if (c.kind === "finale") {
    return (
      <div className="pointer-events-auto flex flex-col items-center">
        {/* The S completes alone; then its name settles in — the site's own wordmark, its
            tracking closing as it arrives — then the promise, the line and the CTA. */}
        <div aria-hidden="true" style={stage(0.02, 0.2)}>
          <Wordmark size="lg" showMark={false} textStyle={WORDMARK_SETTLE} />
        </div>
        <p
          aria-hidden="true"
          className="mt-3 font-mono text-[11.5px] uppercase tracking-[0.42em]"
          style={{ ...stage(0.16, 0.32), color: "#C9AA79", marginRight: "-0.42em" }}
        >
          Validate · Build · Elevate
        </p>
        <p
          aria-hidden="true"
          className={`mt-[clamp(1rem,3.4svh,2rem)] ${STATEMENT} text-[clamp(2.3rem,min(5vw,7.4svh),5.2rem)]`}
          style={{ ...stage(0.3, 0.52), color: PEARL }}
        >
          <Accented text={c.text} />
        </p>
        <p
          aria-hidden="true"
          className="mt-[clamp(0.75rem,2svh,1.25rem)] text-[clamp(1.05rem,1.4vw,1.3rem)] tracking-[-0.005em]"
          style={{ ...stage(0.44, 0.64), color: QUIET }}
        >
          {c.sub}
        </p>
        <div style={stage(0.6, 0.86)}>
          <Link
            to="/consultation"
            data-testid="cinematic-cta"
            className="mt-[clamp(1.25rem,4svh,2.25rem)] inline-flex h-14 items-center gap-3 rounded-full bg-[linear-gradient(180deg,#FBF8F2_0%,#EDE5D6_100%)] px-8 text-[1.0625rem] font-semibold tracking-[-0.01em] text-sol-navy shadow-[inset_0_0_0_1px_rgba(201,170,121,0.9),0_0_0_4px_rgba(201,170,121,0.12),0_14px_40px_rgba(196,166,122,0.16)] transition-[filter,transform,box-shadow] duration-200 hover:brightness-105 hover:shadow-[inset_0_0_0_1px_rgba(201,170,121,1),0_0_0_6px_rgba(201,170,121,0.16),0_14px_40px_rgba(196,166,122,0.22)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#DCC08B] active:scale-[0.98]"
          >
            Find My Business Idea
            <ArrowRight className="size-5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    );
  }
  return (
    <>
      {c.stages ? (
        <StageKicker stages={c.stages} />
      ) : (
        c.kicker && c.tone && <Kicker text={c.kicker} tone={c.tone} />
      )}
      <p className={`${STATEMENT} ${STATEMENT_SIZE}`} style={{ color: PEARL }}>
        <Accented text={c.text} />
      </p>
      {c.sub &&
        (c.subTone === "note" ? (
          <p className={`mt-4 ${LABEL_CLASS}`} style={{ color: LABEL }}>
            {c.sub}
          </p>
        ) : (
          <p
            className={`mt-4 text-[clamp(1.15rem,1.6vw,1.5rem)] tracking-[-0.015em] ${c.subTone === "accent" ? "font-medium" : ""}`}
            style={{ color: c.subTone === "accent" ? ACCENT : QUIET }}
          >
            {c.sub}
          </p>
        ))}
    </>
  );
}

/** The wordmark's tracking closes from slightly open to its final measure as it appears. */
const WORDMARK_U = "clamp(0, calc((var(--reveal, 1) - 0.02) / 0.24), 1)";
const WORDMARK_SETTLE: CSSProperties = {
  letterSpacing: `calc(0.42em + (1 - ${WORDMARK_U}) * (1 - ${WORDMARK_U}) * 0.22em)`,
  marginRight: `calc(-0.42em - (1 - ${WORDMARK_U}) * (1 - ${WORDMARK_U}) * 0.22em)`,
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
