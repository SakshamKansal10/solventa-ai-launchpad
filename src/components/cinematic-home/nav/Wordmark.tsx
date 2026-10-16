import type { CSSProperties } from "react";

import mark from "@/assets/solventia-mark.png";

/**
 * The one Solventia identity used across the cinematic page: the official S mark (the image
 * itself — never redrawn) and the SOLVENTIA wordmark in the brand board's face: a wide geometric
 * sans, uppercase, medium weight, with controlled tracking. The wordmark always leads; the
 * symbol is the smaller partner.
 *
 * Tone: the mark is quieted, not altered — its gold glow and metallic sheen are desaturated and
 * calmed, graphite on a light ground and pearl on a dark one. `tone="auto"` follows the film
 * (the --dark variable DomSync writes: 0 = pearl world, 1 = graphite world).
 */
export function Wordmark({
  size = "md",
  tone = "auto",
  showMark = true,
  textStyle,
}: {
  size?: "sm" | "md" | "hero";
  tone?: "auto" | "light" | "ink";
  showMark?: boolean;
  /** Per-use overrides for the letters (e.g. the finale's tracking settling as it appears). */
  textStyle?: CSSProperties;
}) {
  const s = SIZES[size];
  const colour = tone === "ink" ? "#15181F" : tone === "light" ? "#F3F0E8" : "var(--ink, #15181F)";
  // How much of the "on dark" treatment to show (auto follows the film).
  const dark = tone === "ink" ? "0" : tone === "light" ? "1" : "var(--dark, 0)";
  return (
    <span className={`inline-flex items-center ${s.gap}`}>
      {showMark && (
        <span
          aria-hidden="true"
          className={`relative shrink-0 ${s.markClass}`}
          style={{ width: s.mark * MARK_RATIO, height: s.mark }}
        >
          <img
            src={mark}
            alt=""
            width={s.mark * MARK_RATIO}
            height={s.mark}
            className="absolute inset-0 size-full object-contain"
            style={{ filter: ON_LIGHT, opacity: `calc(1 - ${dark})` }}
          />
          <img
            src={mark}
            alt=""
            width={s.mark * MARK_RATIO}
            height={s.mark}
            className="absolute inset-0 size-full object-contain"
            style={{ filter: ON_DARK, opacity: dark }}
          />
        </span>
      )}
      {/* The negative margin cancels the tracking after the last letter (optical centring). */}
      <span
        className={`font-wordmark uppercase leading-none ${s.text}`}
        style={{ color: colour, ...textStyle }}
      >
        Solventia
      </span>
    </span>
  );
}

/** The official mark's proportions (298 × 436). */
const MARK_RATIO = 298 / 436;
/** Graphite on light: the gold glow neutralised, the sheen flattened. */
const ON_LIGHT = "grayscale(1) brightness(0.62) contrast(1.18)";
/** Pearl on dark. */
const ON_DARK = "grayscale(1) brightness(2.3) contrast(0.82)";

const SIZES = {
  sm: {
    mark: 16,
    markClass: "",
    gap: "gap-2",
    text: "text-[13px] font-medium tracking-[0.16em] -mr-[0.16em]",
  },
  // The site bar: 20–25px on phones, 26–34px on desktop.
  // On the narrowest phones the wordmark alone anchors the bar (the actions keep their room).
  md: {
    mark: 24,
    markClass: "max-[400px]:hidden",
    gap: "gap-2.5 sm:gap-3",
    text: "text-[20px] font-medium tracking-[0.11em] -mr-[0.11em] sm:text-[28px] sm:tracking-[0.13em] sm:-mr-[0.13em]",
  },
  // The opening and the finale: clamp(64px, 8vw, 118px) on wide screens.
  hero: {
    mark: 0,
    markClass: "",
    gap: "gap-0",
    text: "text-[clamp(40px,11vw,64px)] font-medium tracking-[0.12em] -mr-[0.12em] sm:text-[clamp(64px,8vw,118px)]",
  },
} as const;
