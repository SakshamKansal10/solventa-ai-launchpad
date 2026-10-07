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
