import { CatmullRomCurve3, Vector3 } from "three";

import { clamp01 } from "../math";
import { progressOf } from "../timeline/timeline";

export type Vec3 = readonly [number, number, number];

export interface CameraKey {
  /** Global scroll progress at which the camera is exactly at this key. */
  at: number;
  position: Vec3;
  /** Point the camera looks at. */
  target: Vec3;
}

/**
 * PLACEHOLDER choreography (world units; the core sits at the origin): a slow
 * approach to the core through the first half, a swing past it at Direction,
 * then a flight down the node field. Keys are anchored to scenes, not numbers.
 */
export const CAMERA_KEYS: readonly CameraKey[] = [
  // Chaos — far out in the dark, the core barely visible.
  { at: 0, position: [0, 1.4, 17], target: [0, 0, 0] },
  // Context — drifting in from one side.
  { at: progressOf("context"), position: [2.4, 0.9, 12], target: [0, 0, 0] },
  // Possibilities — the cluster around the core fills the frame.
  { at: progressOf("possibilities"), position: [-1.8, 0.5, 8], target: [0, 0, 0] },
  // Intelligence — closest approach while the core peaks.
  { at: progressOf("intelligence", 0.5), position: [0.6, 0.25, 4.6], target: [0, 0, 0] },
  // Direction — swing past the core and turn down the field.
  { at: progressOf("direction"), position: [3.4, 0.35, -0.6], target: [0.6, 0, -8] },
  // Execution → Adaptation — travelling through the node field.
  { at: progressOf("execution"), position: [0.8, 0, -9], target: [0, 0.1, -18] },
  { at: progressOf("evidence"), position: [-0.9, 0.45, -18], target: [0, 0.2, -27] },
  { at: progressOf("adaptation"), position: [0.7, 0.2, -27], target: [0, 0.1, -36] },
  { at: 1, position: [0, 0.3, -34], target: [0, 0.2, -44] },
];

/**
 * Maps global progress onto a Catmull-Rom curve's parameter so that key `i`
 * is reached exactly at its own `at` (curves place control point i at
 * t = i / (n − 1), whatever the keys' spacing in scroll).
 */
export function curveParameter(progress: number, stops: readonly number[]): number {
  const n = stops.length;
  if (n < 2) return 0;
  const p = clamp01(progress);
  for (let i = 0; i < n - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (p <= b || i === n - 2) {
      const local = b > a ? clamp01((p - a) / (b - a)) : 1;
      return (i + local) / (n - 1);
    }
  }
  return 1;
}

export interface CameraPath {
  /** Writes the camera position and look-at target for `progress` (no allocation). */
  sample(progress: number, position: Vector3, target: Vector3): void;
}

export function createCameraPath(keys: readonly CameraKey[] = CAMERA_KEYS): CameraPath {
  // Centripetal Catmull-Rom: smooth (C1) through every key, without the loops
  // and overshoot a uniform spline makes when keys are unevenly spaced.
  const positions = new CatmullRomCurve3(
    keys.map((k) => new Vector3(...k.position)),
    false,
    "centripetal",
  );
  const targets = new CatmullRomCurve3(
    keys.map((k) => new Vector3(...k.target)),
    false,
    "centripetal",
  );
  const stops = keys.map((k) => k.at);
  return {
    sample(progress, position, target) {
      const t = curveParameter(progress, stops);
      positions.getPoint(t, position);
      targets.getPoint(t, target);
    },
  };
}

export const BASE_FOV = 42;
export const MAX_FOV = 68;

/**
 * Vertical field of view for a viewport aspect ratio. Landscape keeps the base
 * lens; portrait widens it so the horizontal framing stays what a square
 * viewport would see — the core is never cropped on a phone.
 */
export function fovForAspect(aspect: number, base = BASE_FOV, max = MAX_FOV): number {
  if (!(aspect > 0) || aspect >= 1) return base;
  const half = (base * Math.PI) / 360;
  return Math.min(max, (2 * Math.atan(Math.tan(half) / aspect) * 180) / Math.PI);
}
