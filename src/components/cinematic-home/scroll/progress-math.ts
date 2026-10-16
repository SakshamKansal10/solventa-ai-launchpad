import { clamp01 } from "../math";

/**
 * Normalised progress (0 → 1) of the viewport through a tall scroll section:
 * 0 while the section's top is at or below the viewport top, 1 once its bottom
 * reaches the viewport bottom.
 */
export function sectionProgress(
  scrollY: number,
  sectionTop: number,
  sectionHeight: number,
  viewportHeight: number,
): number {
  const distance = sectionHeight - viewportHeight;
  if (!(distance > 0)) return 0;
  return clamp01((scrollY - sectionTop) / distance);
}

/**
 * Smoothing between raw scroll and the rendered scene (1/s). Lower = floatier camera. Scrolling
 * advances film time: the picture follows the wheel with weight, never like a page position.
 */
export const PROGRESS_SMOOTHING = 3;

/**
 * Longest step (s) the scene integrates in one frame — a background tab that
 * comes back after ten seconds must not teleport the camera or the nodes.
 */
export const MAX_FRAME_DT = 1 / 20;

/**
 * Story pacing on top of the smoothing: SCROLL is story position, TIME is life inside it. Where a
 * moment has to be read (the founder's signals, the 360 → 9 count, the one direction, the
 * emblem), the rendered progress may not cross it faster than a readable pace — however hard the
 * wheel is flicked. Fast input still travels faster (the limit grows with how far behind the
 * picture is), nothing is ever blocked, and it is symmetric, so reversing is just as coherent.
 *
 * `dwell` is 0 → 1 (how important the current moment is); the limit is in progress per second.
 */
export const DWELL_PACE = { base: 0.03, catchUp: 0.15 } as const;

export function pacedStep(
  progress: number,
  target: number,
  smoothing: number,
  dwell: number,
  dt: number,
): number {
  const gap = target - progress;
  const eased = gap * (1 - Math.exp(-smoothing * dt));
  if (dwell <= 0.02) return progress + eased;
  const limit = ((DWELL_PACE.base + DWELL_PACE.catchUp * Math.abs(gap)) / dwell) * dt;
  return progress + Math.sign(eased) * Math.min(Math.abs(eased), limit);
}
