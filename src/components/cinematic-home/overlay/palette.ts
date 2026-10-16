/**
 * The overlay's colours — semantic, sparse, and written as two worlds: what each role is on the
 * graphite world and on the pearl world. DomSync blends them with the film's tone and writes
 * them as CSS variables on the page (`--ink`, `--quiet` …); the overlay and the site bar only
 * ever reference the variables.
 *
 *   ink    — what is resolved and read (pearl on dark, graphite on light)
 *   accent — champagne: conviction (a word, the CTA, the film-time line) — deeper on pearl
 *   violet — only while the system is reasoning
 */
export const WORLD = {
  ink: ["#F3F0E8", "#15181F"],
  quiet: ["#AAB2C0", "#5A606B"],
  label: ["#9DA5B4", "#666C77"],
  accent: ["#E2C690", "#8A6833"],
  /** Muted champagne for separators (the · in Validate · Build · Elevate). */
  accentSoft: ["#A58C64", "#B79A6A"],
  violet: ["#8E83F0", "#5A4FCF"],
  hair: ["#F1EEE61F", "#15181F24"],
} as const;

export type WorldRole = keyof typeof WORLD;

/** CSS custom property per role. */
export const ROLE_VAR: Record<WorldRole, string> = {
  ink: "--ink",
  quiet: "--quiet",
  label: "--label",
  accent: "--accent",
  accentSoft: "--accent-soft",
  violet: "--violet",
  hair: "--hair",
};

/** Kicker marks by meaning. */
export const TONE_VAR = {
  violet: "var(--violet)",
  gold: "var(--accent)",
  pearl: "var(--ink)",
} as const;

/** The pearl world's values as page defaults — the first paint, the still version, no WebGL. */
export const PEARL_DEFAULTS = Object.fromEntries([
  ...(Object.keys(WORLD) as WorldRole[]).map((r) => [ROLE_VAR[r], WORLD[r][1]]),
  ["--dark", "0"],
]) as Record<string, string>;

/** Mixes two #rrggbb or #rrggbbaa colours (t 0 → 1). */
export function mixHex(a: string, b: string, t: number): string {
  const pa = parse(a);
  const pb = parse(b);
  const out = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
  const hex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${hex(out[0])}${hex(out[1])}${hex(out[2])}${out[3] === 255 ? "" : hex(out[3])}`;
}

function parse(c: string): [number, number, number, number] {
  const h = c.slice(1);
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
    h.length >= 8 ? parseInt(h.slice(6, 8), 16) : 255,
  ];
}
