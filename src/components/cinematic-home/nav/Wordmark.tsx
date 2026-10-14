import type { CSSProperties } from "react";

import mark from "@/assets/solventia-mark.png";

/**
 * The one Solventia identity used across the cinematic page: the S mark (the same mark the
 * Engine and the finale emblem are machined from) and the tracked SOLVENTIA wordmark in the
 * site's display face — as in the shared header and footer. Nav, product surface and finale
 * all use this, so the brand reads the same wherever it appears.
 */
export function Wordmark({
  size = "md",
  tone = "light",
  showMark = true,
  textStyle,
}: {
  size?: "sm" | "md" | "lg";
  tone?: "light" | "ink";
  showMark?: boolean;
  /** Per-use overrides for the letters (e.g. the finale's tracking settling as it appears). */
  textStyle?: CSSProperties;
}) {
  const s = SIZES[size];
  return (
    <span className={`inline-flex items-center ${s.gap}`}>
      {showMark && (
        <img
          src={mark}
          alt=""
          width={s.mark}
          height={s.mark}
          className="shrink-0 object-contain"
          style={{ width: s.mark, height: s.mark }}
        />
      )}
      {/* The negative margin cancels the tracking after the last letter (optical centring). */}
      <span
        className={`font-display leading-none ${s.text} ${tone === "ink" ? "text-[#141821]" : "text-[#F3F0E8]"}`}
        style={textStyle}
      >
        SOLVENTIA
      </span>
    </span>
  );
}

const SIZES = {
  sm: {
    mark: 18,
    gap: "gap-2",
    text: "text-[0.82rem] font-semibold tracking-[0.28em] -mr-[0.28em]",
  },
  md: {
    mark: 28,
    gap: "gap-2.5 sm:gap-3",
    text: "text-[0.98rem] font-medium tracking-[0.2em] -mr-[0.2em] sm:text-[1.15rem] sm:tracking-[0.3em] sm:-mr-[0.3em]",
  },
  lg: { mark: 0, gap: "gap-0", text: "text-[1.35rem] font-medium tracking-[0.42em] -mr-[0.42em]" },
} as const;
