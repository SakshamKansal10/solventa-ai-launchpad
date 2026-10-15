/**
 * The overlay's colours — semantic, and used sparingly: pearl for what is resolved and readable,
 * champagne for conviction (a word, the active stage, the CTA), violet only while the system is
 * reasoning. Shared by the overlay (initial render) and DomSync (per-frame states).
 */
export const PEARL = "#F3F0E8";
/** Supporting lines and kickers: a cool grey that still reads at a glance. */
export const QUIET = "#AAB2C0";
/** Labels (the smallest level): crisp, never faint. */
export const LABEL = "#9DA5B4";
export const ACCENT = "#E2C690";
export const VIOLET = "#8E83F0";

export const TONE = {
  violet: VIOLET,
  gold: ACCENT,
  pearl: "#EDE9E0",
} as const;

/** Validate · Build · Elevate: the stage being travelled, the one behind it, the ones ahead. */
export const STAGE = {
  active: ACCENT,
  done: "#9DA5B4",
  ahead: "#5F6878",
} as const;
