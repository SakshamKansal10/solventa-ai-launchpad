import { k } from "../timeline/timeline";

/** Fog density per scene: thin outside the core, deeper inside the universe and the path. */
export const FOG_KEYS = [
  k("void", 0, 0.004),
  k("awakening", 0.4, 0.006),
  k("awakening", 1, 0.01),
  k("passage", 0.5, 0.02),
  k("passage", 1, 0.024),
  k("universe", 0.6, 0.016),
  k("computation", 0.6, 0.014),
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

/** Overall scene light (exposure) — darkness is a material. */
export const EXPOSURE_KEYS = [
  k("void", 0, 0.7),
  k("awakening", 0.6, 1),
  k("selection", 0.5, 0.92),
  k("product", 0.2, 0.75),
  k("return", 1, 1),
];
