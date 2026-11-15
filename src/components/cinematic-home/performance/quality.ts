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
  /** Clear-coat / sheen ceramics (MeshPhysicalMaterial) instead of standard. */
  physicalMaterials: boolean;
  /** Sustained frame rate below which the governor lowers resolution. */
  minFps: number;
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
    physicalMaterials: true,
    minFps: 50,
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
    // Standard (one-lobe) materials everywhere, glass and smoked included.
    physicalMaterials: false,
    minFps: 40,
  },
};

export const DPR_STEP = 0.25;

/** How the governor reacts to one-second fps windows. */
export const GOVERNOR = {
  /** Consecutive slow windows before resolution drops one step. */
  slowWindows: 2,
  /** Consecutive comfortable windows before resolution recovers one step. */
  fastWindows: 5,
  /** "Comfortable" = this many fps above the tier's minimum. */
  fastMargin: 8,
  /** Recoveries allowed per visit — stops a borderline device oscillating. */
  maxRecoveries: 2,
} as const;

export interface GovernorState {
  dpr: number;
  slow: number;
  fast: number;
  recoveries: number;
}

const round2 = (v: number) => Math.round(v * 100) / 100;

/** The resolution to use after one more measured second of `fps`. Pure. */
export function governDpr(
  state: GovernorState,
  fps: number,
  preset: QualityPreset,
  ceiling: number,
): GovernorState {
  const floor = Math.min(preset.dpr[0], ceiling);
  if (fps < preset.minFps) {
    const slow = state.slow + 1;
    if (slow >= GOVERNOR.slowWindows && state.dpr > floor) {
      return { ...state, dpr: Math.max(floor, round2(state.dpr - DPR_STEP)), slow: 0, fast: 0 };
    }
    return { ...state, slow, fast: 0 };
  }
  if (fps >= preset.minFps + GOVERNOR.fastMargin) {
    const fast = state.fast + 1;
    if (
      fast >= GOVERNOR.fastWindows &&
      state.dpr < ceiling &&
      state.recoveries < GOVERNOR.maxRecoveries
    ) {
      return {
        dpr: Math.min(ceiling, round2(state.dpr + DPR_STEP)),
        slow: 0,
        fast: 0,
        recoveries: state.recoveries + 1,
      };
    }
    return { ...state, fast, slow: 0 };
  }
  return { ...state, slow: 0, fast: 0 };
}
