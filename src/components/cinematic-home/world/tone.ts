import { k, sampleKeys } from "../timeline/timeline";

/**
 * The film's tonal rhythm — ONE channel, 1 = the pearl world (clarity), 0 = the graphite world
 * (uncertainty, computation). Sky, fog, lights, lines, materials, the overlay and the site bar
 * all read it, so a change of world is a single continuous gradient, never a cut.
 *
 *   light · light with colour · light → dark (into the Engine) · dark reasoning ·
 *   dark → light resolution · light path · mixed evidence · light product · a dark return that
 *   resolves into the light brand field of the finale (the approved emblem is made for light)
 *
 * Roughly 60–65% of the film is pearl. Pure data.
 */
export const LIGHT_KEYS = [
  k("void", 0, 1),
  k("passage", 0.24, 1),
  // Into the Engine: the pearl drains as the camera passes the aperture.
  k("passage", 0.6, 0),
  k("three", 0.6, 0),
  // Resolution: three directions are weighed in the dark; the one arrives in the light.
  k("selection", 0.38, 1),
  k("evidence", 0.42, 1),
  // Mixed: contradicting evidence drains part of the clarity, adaptation restores it.
  k("crisis", 0.55, 0.5),
  k("adaptation", 0.82, 1),
  k("return", 0.05, 1),
  // The return is a brief, controlled dark; the trajectories begin in it…
  k("return", 0.55, 0),
  k("finale", 0.02, 0),
  // …and the finale resolves into a warm light field, where the approved emblem lands crisp.
  k("finale", 0.22, 1),
];

export const lightAt = (p: number) => sampleKeys(LIGHT_KEYS, p);

/**
 * Where type switches from pearl to graphite. The world blends in linear light, so a ground at
 * tone 0.3 already reads as a light grey: the ink turns early and quickly. No statement is ever
 * set across a change of world (copy.ts spans sit inside one tone).
 */
export function inkAt(light: number): number {
  const t = Math.min(1, Math.max(0, (light - 0.1) / 0.22));
  return t * t * (3 - 2 * t);
}

/**
 * Shared by every patched shader (rim light, glass edges) and the filament material: one uniform
 * object, updated once per frame by the Atmosphere, read by every program that references it.
 */
export const TONE_UNIFORMS = { uLight: { value: 1 } };

/**
 * The two worlds' surfaces (sRGB). The pearl is a neutral, architectural white — a trace of warmth
 * (R/G a hair above B) so it never reads sterile beside the navy and the champagne, but no cream.
 */
export const PEARL_WORLD = {
  sky: "#F7F7F4",
  horizon: "#EDEDE8",
  fog: "#F3F3EF",
} as const;
