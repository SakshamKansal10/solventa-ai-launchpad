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

/**
 * The nine as a decision lattice: three columns standing where the three futures will appear
 * (0 = Direction 01 left, 1 = the one, 2 = Direction 03 right), each ranked downward from its
 * head (row 0). The futures later grow out of these nodes.
 */
export function latticeNode(col: number, row: number): [number, number, number] {
  const x = [-7.5, 0, 7.5][col];
  const centre = col === 1;
  return [
    FINALS_HUB[0] + x * (1 - row * 0.06),
    FINALS_HUB[1] + 3.4 - row * 2.3 + (centre ? 0.6 : 0),
    FINALS_HUB[2] + 1 + row * 1.2 - (centre ? 1.5 : 0),
  ];
}

/** Palette from the art direction (sRGB hex; three converts to linear). */
export const COLORS = {
  // Environment (V3 palette).
  black: "#050912",
  midnight: "#0C1525",
  navy: "#16233A",
  graphite: "#202B39",
  // Structure.
  titanium: "#5C6A7C",
  titaniumEdge: "#8FA2BA",
  sMetal: "#46536F",
  sCover: "#6C7A96",
  smoke: "#38425A",
  // Meaning.
  pearl: "#F0EEE7",
  champagne: "#C9AA79",
  gold: "#D9B97F",
  edgeGold: "#F2D49A",
  indigo: "#756CE0",
  violet: "#756CE0",
  violetGlow: "#968CF2",
} as const;

export const add = (a: V3, b: V3): [number, number, number] => [
  a[0] + b[0],
  a[1] + b[1],
  a[2] + b[2],
];
