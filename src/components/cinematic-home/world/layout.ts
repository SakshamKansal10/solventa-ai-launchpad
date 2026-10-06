/**
 * World-space constants shared by every scene. Units are arbitrary but fixed:
 * the Intelligence Core has radius 6 and sits at the origin; the visitor starts
 * on +z looking toward −z.
 *
 * The passage into the core scales the core about its OPENING by
 * PASSAGE_EXPANSION, so the core's centre ends up at UNIVERSE_CENTER — the
 * opportunity universe is authored around that point, "inside" the core.
 */
export type V3 = readonly [number, number, number];

export const CORE_RADIUS = 6;

/** The intentional gap in the core's architecture the camera passes through. */
export const OPENING: V3 = [0, 0.45, 5.6];

/** How much the core shell expands around the visitor during the passage. */
export const PASSAGE_EXPANSION = 6;

/** Where the core's centre lands after the expansion: O + s·(0 − O). */
export const UNIVERSE_CENTER: V3 = [
  OPENING[0] * (1 - PASSAGE_EXPANSION),
  OPENING[1] * (1 - PASSAGE_EXPANSION),
  OPENING[2] * (1 - PASSAGE_EXPANSION),
];

/** Where the three finalists meet; the selected one becomes the path from here. */
export const FINALS_HUB: V3 = [6, -0.5, -46];

/** Palette from the art direction (sRGB hex; three converts to linear). */
export const COLORS = {
  black: "#070B13",
  midnight: "#101B2B",
  navy: "#192536",
  pearl: "#F1EEE6",
  champagne: "#C4A67A",
  violet: "#75668F",
  violetGlow: "#9C8BC4",
  gold: "#D9B97F",
} as const;

export const add = (a: V3, b: V3): [number, number, number] => [
  a[0] + b[0],
  a[1] + b[1],
  a[2] + b[2],
];
