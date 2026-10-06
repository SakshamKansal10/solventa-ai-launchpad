import { k, local, progressOf, ramp, sampleKeys } from "../../timeline/timeline";
import { OPENING, PASSAGE_EXPANSION } from "../layout";
import { SLAB_CENTRE } from "../product/product-model";

/** Settling twist as the core finishes assembling — then it holds still (no idle spinning). */
const SPIN = [k("awakening", 0.2, -0.35), k("awakening", 1, 0), k("context", 1, 0.12)];

export interface CoreTransform {
  position: [number, number, number];
  scale: number;
  spin: number;
  /** 0 → 1: the jambs swing aside as the camera enters. */
  open: number;
  /** 0 → 1: gold guide filaments draw the eye into the opening. */
  guide: number;
  /** The core's own filaments quieten once the universe takes over. */
  fade: number;
  visible: boolean;
}

/**
 * The core SHELL's transform. During the Passage the shell scales about the
 * OPENING and recedes into the dark while the inner mechanism (spine, glass,
 * inner blades) keeps its size — so the camera genuinely threads past the
 * mechanism at close range, and the shell becomes a distant cathedral: object → world.
 * The zoom runs in log space so every doubling takes the same scroll.
 */
export function coreTransform(p: number): CoreTransform {
  const pass = local(p, "passage");
  const z = smoothstep01((pass - 0.42) / 0.5);
  // After the passage the shell keeps opening outward until it is lost in the dark.
  const beyond = ramp(p, "passage", 0.94, "universe", 0.32);
  const scale = Math.exp(Math.log(PASSAGE_EXPANSION) * z + Math.log(9) * beyond);
  return {
    position: [OPENING[0] * (1 - scale), OPENING[1] * (1 - scale), OPENING[2] * (1 - scale)],
    scale,
    spin: sampleKeys(SPIN, p),
    open: smoothstep01((pass - 0.4) / 0.24),
    guide: smoothstep01((pass - 0.02) / 0.45),
    fade: 1 - 0.7 * ramp(p, "universe", 0.2, "computation", 0.4),
    visible: p < progressOf("universe", 0.42),
  };
}

function smoothstep01(x: number) {
  const t = x < 0 ? 0 : x > 1 ? 1 : x;
  return t * t * (3 - 2 * t);
}

/** The finale: the same core reassembles where the product surface stood. */
export function finaleTransform(p: number): CoreTransform {
  return {
    position: [SLAB_CENTRE.x, SLAB_CENTRE.y + 1.2, SLAB_CENTRE.z - 6],
    scale: 1,
    spin: 0,
    open: 0,
    guide: 0,
    fade: 1,
    visible: p > progressOf("return", 0.55),
  };
}

/** Assembly progress for each variant (0 → 1). */
export function assembly(p: number, finale: boolean): number {
  return finale ? ramp(p, "return", 0.6, "finale", 0.62) : local(p, "awakening");
}
