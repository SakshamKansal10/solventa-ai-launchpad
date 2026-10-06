import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

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
  lower: "left-5 right-5 bottom-[13svh] sm:left-[7vw] sm:right-auto sm:max-w-[min(46rem,60vw)]",
  upper:
    "left-5 right-5 top-[calc(76px+5svh)] sm:left-[7vw] sm:right-auto sm:max-w-[min(40rem,56vw)]",
  centre:
    "left-5 right-5 top-1/2 -translate-y-1/2 text-center sm:left-1/2 sm:right-auto sm:w-[min(52rem,80vw)] sm:-translate-x-1/2",
  bottom: "inset-x-5 bottom-[9svh] text-center sm:inset-x-[12vw]",
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
      {WAVE_LABELS.map((w, k) => (
        <p
          key={w.id}
          ref={reg(store.state.dom.captions, w.id)}
          aria-hidden="true"
          className="absolute bottom-[calc(13svh+0.5rem)] left-5 font-mono text-[11px] uppercase tracking-[0.28em] text-[#d9c39b] sm:left-[7vw]"
          style={{ opacity: 0, visibility: "hidden", transform: `translateY(${k * 0}px)` }}
        >
          {w.text}
        </p>
      ))}
      {LABELS.map((l) => (
        <div
          key={l.anchor}
          ref={reg(store.state.dom.anchors, l.anchor)}
          aria-hidden="true"
          className="absolute left-0 top-0 will-change-transform"
          style={{ opacity: 0, visibility: "hidden" }}
        >
          <div className="-translate-x-1/2 -translate-y-full whitespace-nowrap text-center">
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
        className="absolute bottom-[5.5svh] left-1/2 -translate-x-1/2 font-mono text-[12px] tracking-[0.35em] text-[#d9c39b]"
        style={{ opacity: 0 }}
      >
        360
      </p>
    </div>
  );
}

function CaptionBody({ caption: c }: { caption: Caption }) {
  if (c.kind === "title") {
    return (
      <>
        <p className="font-mono text-[12px] uppercase tracking-[0.62em] text-[#d9c39b]">{c.text}</p>
        <p className="mt-3 font-display text-[clamp(1.9rem,3.4vw,3.1rem)] leading-[1.08] text-[#F1EEE6]">
          {c.sub}
        </p>
      </>
    );
  }
  if (c.kind === "finale") {
    return (
      <div className="pointer-events-auto">
        <p
          aria-hidden="true"
          className="font-display text-[clamp(2.3rem,5vw,4.4rem)] leading-[1.04] text-[#F1EEE6]"
        >
          {c.text}
        </p>
        <p aria-hidden="true" className="mt-5 text-[clamp(1rem,1.4vw,1.2rem)] text-[#cfc6b6]">
          {c.sub}
        </p>
        <Link
          to="/consultation"
          data-testid="cinematic-cta"
          className="mt-9 inline-flex h-14 items-center gap-3 rounded-full bg-[linear-gradient(135deg,#FFFDFB_0%,#F2ECE2_55%,#DCC08B_100%)] px-8 text-[1.0625rem] font-semibold text-sol-navy shadow-[0_18px_50px_rgba(196,166,122,0.25)] transition-[filter,transform] duration-200 hover:brightness-105 active:scale-[0.98]"
        >
          Find My Business Idea
          <ArrowRight className="size-5" aria-hidden="true" />
        </Link>
      </div>
    );
  }
  const big = c.kind === "statement";
  return (
    <>
      <p
        className={
          big
            ? "font-display text-[clamp(1.9rem,3.6vw,3.3rem)] leading-[1.08] text-[#F1EEE6]"
            : c.kind === "quiet"
              ? "font-display text-[clamp(1.4rem,2.2vw,2rem)] italic text-[#e6dfd2]"
              : "font-display text-[clamp(1.6rem,2.6vw,2.4rem)] leading-tight text-[#F1EEE6]"
        }
      >
        {c.text}
      </p>
      {c.sub && (
        <p
          className={
            big
              ? "mt-3 font-display text-[clamp(1.4rem,2.4vw,2.1rem)] text-[#d9c39b]"
              : "mt-2 font-mono text-[10.5px] uppercase tracking-[0.28em] text-[#c9b48f]"
          }
        >
          {c.sub}
        </p>
      )}
    </>
  );
}
