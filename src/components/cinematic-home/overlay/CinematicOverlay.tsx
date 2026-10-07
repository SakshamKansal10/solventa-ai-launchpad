import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { CSSProperties } from "react";

import { useExperienceStore } from "../scroll/experience-store";
import { CAPTIONS, LABELS, WAVE_LABELS, type Caption } from "./copy";

/**
 * The DOM layer above the canvas: captions, labels that follow the world, the
 * convergence count and the finale CTA. React renders it ONCE; the canvas'
 * DomSync writes opacity/position every frame straight to these elements.
 * Visible copy is decorative duplication (aria-hidden) of the server-rendered
 * narrative — except the finale CTA, which is a real, focusable link.
 */
const PLACE: Record<Caption["place"], string> = {
  // A film title: centred in the lower third, sized to its words.
  title:
    "left-1/2 bottom-[11svh] w-max max-w-[min(44rem,calc(100vw-2.5rem))] -translate-x-1/2 text-center",
  end: "inset-x-5 bottom-[9svh] text-center sm:inset-x-[12vw]",
};

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
      {/* Edge vignette: legibility for the copy, depth for the frame. */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 45%, transparent 55%, rgba(7,11,19,0.55) 100%), linear-gradient(to top, rgba(7,11,19,0.55), transparent 32%)",
        }}
      />
      {CAPTIONS.map((c) => (
        <div
          key={c.id}
          ref={reg(store.state.dom.captions, c.id)}
          data-caption={c.id}
          aria-hidden={c.kind === "finale" ? undefined : true}
          className={`absolute ${PLACE[c.place]} will-change-[opacity,transform] [text-shadow:0_2px_28px_rgba(7,11,19,0.85),0_1px_3px_rgba(7,11,19,0.6)]`}
          style={{
            opacity: c.id === "void" ? 1 : 0,
            visibility: c.id === "void" ? "visible" : "hidden",
          }}
        >
          <CaptionBody caption={c} />
        </div>
      ))}
      {WAVE_LABELS.map((w) => (
        <p
          key={w.id}
          ref={reg(store.state.dom.captions, w.id)}
          aria-hidden="true"
          className="absolute bottom-[6.5svh] left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[10.5px] uppercase tracking-[0.3em] text-[#d9c39b]"
          style={{ opacity: 0, visibility: "hidden" }}
        >
          {w.text}
        </p>
      ))}
      {LABELS.map((l) => (
        <div
          key={l.anchor}
          ref={reg(store.state.dom.anchors, l.anchor)}
          data-anchor={l.anchor}
          aria-hidden="true"
          className="absolute left-0 top-0 will-change-transform"
          style={{ opacity: 0, visibility: "hidden" }}
        >
          <div className="-translate-x-1/2 -translate-y-full whitespace-nowrap text-center [text-shadow:0_0_10px_rgba(7,11,19,0.95),0_1px_3px_rgba(7,11,19,0.9)]">
            {l.kind === "quote" ? (
              <>
                <p className="font-display text-[clamp(1.25rem,2vw,1.75rem)] italic leading-tight text-[#F1EEE6]">
                  {l.text}
                </p>
                <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.25em] text-[#c9b48f]">
                  {l.sub}
                </p>
              </>
            ) : l.kind === "direction" ? (
              <p className="font-mono text-[11px] uppercase tracking-[0.42em] text-[#F1EEE6]">
                {l.text}
              </p>
            ) : (
              <>
                <p className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-[#d9c39b]">
                  {l.text}
                </p>
                {l.sub && <p className="mt-0.5 text-[13px] font-medium text-[#F1EEE6]">{l.sub}</p>}
              </>
            )}
          </div>
        </div>
      ))}
      <p
        ref={(el) => {
          store.state.dom.counter = el;
        }}
        aria-hidden="true"
        data-testid="cinematic-count"
        className="absolute bottom-[6svh] right-[7vw] font-mono text-[12px] tracking-[0.35em] text-[#d9c39b] max-sm:bottom-[3svh] max-sm:right-5"
        style={{ opacity: 0 }}
      >
        360
      </p>
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

function CaptionBody({ caption: c }: { caption: Caption }) {
  if (c.kind === "chapter") {
    // A chapter mark passing over the world: the name, a hairline, the promise — one line.
    return (
      <p className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5">
        <span className="-mr-[0.62em] font-mono text-[12px] uppercase tracking-[0.62em] text-[#d9c39b]">
          {c.text}
        </span>
        <span aria-hidden="true" className="h-px w-8 bg-[#c9b48f]/50" />
        <span className="font-display text-[clamp(1.1rem,1.5vw,1.35rem)] italic text-[#e6dfd2]">
          {c.sub}
        </span>
      </p>
    );
  }
  if (c.kind === "finale") {
    return (
      <div className="pointer-events-auto flex flex-col items-center">
        {/* Identity first: the system the visitor just watched has a name. */}
        <div aria-hidden="true" className="flex flex-col items-center" style={stage(0, 0.3)}>
          <p className="font-mono text-[13px] tracking-[0.62em] text-[#F1EEE6]">SOLVENTIA</p>
          <p className="mt-1.5 font-mono text-[10px] tracking-[0.42em] text-[#c9b48f]">
            VALIDATE · BUILD · ELEVATE
          </p>
        </div>
        <p
          aria-hidden="true"
          className="mt-7 font-display text-[clamp(2.2rem,4.8vw,4.3rem)] leading-[1.04] text-[#F1EEE6]"
          style={stage(0.22, 0.52)}
        >
          {c.text}
        </p>
        <p
          aria-hidden="true"
          className="mt-4 text-[clamp(1rem,1.4vw,1.2rem)] text-[#cfc6b6]"
          style={{ ...stage(0.42, 0.66), fontFamily: "var(--font-tech)" }}
        >
          {c.sub}
        </p>
        <div style={stage(0.62, 0.9)}>
          <Link
            to="/consultation"
            data-testid="cinematic-cta"
            className="mt-8 inline-flex h-14 items-center gap-3 rounded-full bg-[linear-gradient(180deg,#FBF8F2_0%,#EDE5D6_100%)] px-8 text-[1.0625rem] font-semibold text-sol-navy shadow-[inset_0_0_0_1px_rgba(201,170,121,0.9),0_0_0_4px_rgba(201,170,121,0.12),0_14px_40px_rgba(196,166,122,0.16)] transition-[filter,transform,box-shadow] duration-200 hover:brightness-105 hover:shadow-[inset_0_0_0_1px_rgba(201,170,121,1),0_0_0_6px_rgba(201,170,121,0.16),0_14px_40px_rgba(196,166,122,0.22)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#DCC08B] active:scale-[0.98]"
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
      <p
        className={
          c.kind === "quiet"
            ? "font-display text-[clamp(1.25rem,1.9vw,1.75rem)] italic leading-snug text-[#e6dfd2]"
            : "font-display text-[clamp(1.3rem,2.1vw,1.9rem)] leading-snug text-[#F1EEE6]"
        }
      >
        {c.text}
      </p>
      {c.sub && (
        <p
          className={
            c.kind === "statement"
              ? "mt-1 font-display text-[clamp(1.3rem,2.1vw,1.9rem)] leading-snug text-[#d9c39b]"
              : "mt-2 font-mono text-[10px] uppercase tracking-[0.3em] text-[#c9b48f]"
          }
        >
          {c.sub}
        </p>
      )}
    </>
  );
}

/** One part of the finale, fading and rising in over its own share of the reveal (CSS-only). */
function stage(from: number, to: number): CSSProperties {
  const t = `clamp(0, calc((var(--reveal, 1) - ${from}) / ${to - from}), 1)`;
  return { opacity: t, transform: `translate3d(0, calc((1 - ${t}) * 14px), 0)` };
}
