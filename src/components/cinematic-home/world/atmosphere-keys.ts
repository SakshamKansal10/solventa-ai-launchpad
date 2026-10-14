import { k } from "../timeline/timeline";

/** Fog density per scene: thin outside the core, deeper inside the universe and the path. */
export const FOG_KEYS = [
  k("void", 0, 0.004),
  k("awakening", 0.4, 0.006),
  k("awakening", 1, 0.01),
  k("passage", 0.5, 0.02),
  k("passage", 1, 0.024),
  // Slightly deeper inside the universe: far architecture recedes, the near field reads first.
  k("universe", 0.6, 0.02),
  k("computation", 0.6, 0.018),
  k("convergence", 0.7, 0.024),
  k("three", 1, 0.03),
  k("unfold", 1, 0.022),
  k("elevate", 1, 0.016),
  k("crisis", 1, 0.02),
  k("adaptation", 1, 0.02),
  k("product", 0, 0.03),
  k("return", 1, 0.012),
  k("finale", 1, 0.008),
];

/**
 * Overall scene light (exposure) — darkness is a material. Every major reveal
 * is staged: the world dims and narrows first (anticipation), then precision
 * light lands with the reveal (payoff).
 */
export const EXPOSURE_KEYS = [
  k("void", 0, 0.7),
  k("awakening", 0.6, 1),
  k("context", 1, 1),
  // Into the Engine: compression and darkness before the world opens.
  k("passage", 0.4, 0.9),
  k("passage", 0.62, 0.55),
  k("passage", 0.7, 0.62),
  k("passage", 0.78, 1.02),
  k("universe", 0.08, 1.06),
  k("convergence", 1, 1),
  // Nine → three → one: the light withdraws to the decision, then resolves on it.
  k("three", 0.9, 0.86),
  k("selection", 0.4, 0.66),
  k("selection", 0.72, 1.02),
  k("elevate", 0.9, 1.05),
  // Evidence: confidence drains with the light.
  k("evidence", 0.4, 0.95),
  k("crisis", 0.6, 0.7),
  k("adaptation", 0.85, 1),
  // Held breath before the interface; quiet for reading it.
  k("handoff", 0.3, 0.78),
  k("product", 0.2, 0.75),
  k("return", 0.85, 0.62),
  // The final reveal: the emblem resolves out of darkness.
  k("finale", 0.35, 1),
];
