import type { QualityTier } from "../device/capabilities";

/**
 * Per-tier rendering budgets. Scene code reads these values; it never checks
 * the tier itself, so a new cost (bloom, shadows, particles) is added once
 * here and every tier already knows whether it may pay for it.
 */
export interface QualityPreset {
  /** Device-pixel-ratio range: [floor the governor may drop to, ceiling]. */
  dpr: [number, number];
  antialias: boolean;
  /** Placeholder data nodes in the field. */
  nodeCount: number;
  /** Sustained frame rate below which the governor lowers resolution. */
  minFps: number;
  // Reserved for later phases — wired through now, all off in Phase 1.
  postprocessing: boolean;
  shadows: boolean;
  particleBudget: number;
}

export const QUALITY_PRESETS: Record<QualityTier, QualityPreset> = {
  high: {
    dpr: [1, 2],
    antialias: true,
    nodeCount: 180,
    minFps: 50,
    postprocessing: false,
    shadows: false,
    particleBudget: 0,
  },
  medium: {
    dpr: [1, 1.5],
    antialias: true,
    nodeCount: 120,
    minFps: 45,
    postprocessing: false,
    shadows: false,
    particleBudget: 0,
  },
  low: {
    dpr: [0.75, 1.25],
    antialias: false,
    nodeCount: 64,
    minFps: 40,
    postprocessing: false,
    shadows: false,
    particleBudget: 0,
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
