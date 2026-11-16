import type { QualityTier } from "../device/capabilities";

/**
 * Per-tier rendering budgets. Scene code reads these values; it never checks
 * the tier itself, so a new cost is added once here and every tier already
 * knows whether it may pay for it. LITE keeps every scene, the camera path and
 * the composition — it only spends less on resolution, antialiasing, instance
 * counts and material complexity.
 */
export interface QualityPreset {
  /** Device-pixel-ratio range: [floor the governor may drop to, ceiling]. */
  dpr: [number, number];
  antialias: boolean;
  /** Rendered opportunities in the universe (logically always 360) — a restrained field, not a crowd. */
  universeCount: number;
  /** Max filaments alive at once, and Bézier samples per filament. */
  filamentCapacity: number;
  filamentSegments: number;
  /** Sweep segments for the core's blades. */
  coreSegments: number;
  /** Gates along the execution path. */
  pathGates: number;
  /** Bevel subdivisions of the path's rounded parts (bars, locks, modules, nodes): 2 = 300
   * triangles a part, 1 = 108. Their 0.03 bevel reads the same at either. */
  gateBevel: number;
  /** Clear-coat / sheen ceramics (MeshPhysicalMaterial) instead of standard. */
  physicalMaterials: boolean;
  /** The prefiltered studio environment (PMREM) for reflections. Lite goes without: building it
   * cost ~1.4 s of cold shader compiling before the world could be ready (owner step 3, 2026-11-16). */
  studioEnvironment: boolean;
}

export const QUALITY_PRESETS: Record<QualityTier, QualityPreset> = {
  full: {
    dpr: [1, 1.5],
    antialias: true,
    universeCount: 140,
    filamentCapacity: 900,
    filamentSegments: 24,
    coreSegments: 72,
    pathGates: 34,
    gateBevel: 2,
    physicalMaterials: true,
    studioEnvironment: true,
  },
  lite: {
    // Never above 1: on a 1440×900 laptop panel this is 1.3 MP instead of up to 2.9 MP.
    dpr: [0.65, 1],
    // No MSAA: the multisampled resolve is the single largest fill cost on integrated GPUs.
    antialias: false,
    universeCount: 84,
    filamentCapacity: 420,
    filamentSegments: 12,
    coreSegments: 32,
    pathGates: 24,
    gateBevel: 1,
    // Standard (one-lobe) materials everywhere, glass and smoked included.
    physicalMaterials: false,
    studioEnvironment: false,
  },
};

/**
 * Quality inside a tier, adapted once at start-up. A notch only lowers the pixel ratio and how
 * many filaments are drawn: nothing is unmounted, no shader is recompiled, the DOM and the scroll
 * position never change — it is not a mode swap.
 */
export const QUALITY_NOTCHES = [
  { dprScale: 1, filamentShare: 1 },
  { dprScale: 0.8, filamentShare: 0.75 },
  { dprScale: 0.65, filamentShare: 0.55 },
] as const;

export const ADAPT = {
  /** Frame time is sampled, while the story moves, in windows of this much rendered time… */
  windowMs: 2000,
  /** …and a window whose median frame is slower than this steps down one notch (never up). */
  slowMedianMs: 20,
  /** Frames longer than this are stalls (tab switch, GC, debugger), not a signal. */
  stallMs: 250,
  /** Progress per second below which the story counts as at rest (a step is applied then)… */
  calmVelocity: 0.002,
  /** …or after this long, if the visitor never pauses. */
  calmWaitMs: 3000,
} as const;

export function median(xs: readonly number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** The notch after one measured window. Pure. */
export function nextNotch(notch: number, windowFrames: readonly number[]): number {
  return median(windowFrames) > ADAPT.slowMedianMs
    ? Math.min(QUALITY_NOTCHES.length - 1, notch + 1)
    : notch;
}

/** The pixel ratio for a notch: the tier's ceiling (never above the screen's), scaled, never
 * below the tier's floor. */
export function notchDpr(preset: QualityPreset, deviceDpr: number, notch: number): number {
  const ceiling = Math.min(preset.dpr[1], deviceDpr || 1);
  const scaled = ceiling * QUALITY_NOTCHES[notch].dprScale;
  return Math.round(Math.max(Math.min(preset.dpr[0], ceiling), scaled) * 100) / 100;
}
