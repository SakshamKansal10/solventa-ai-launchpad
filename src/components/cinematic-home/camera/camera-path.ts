import { CatmullRomCurve3, Vector3 } from "three";

import { clamp01 } from "../math";
import { k, progressOf, type Key, type SceneId } from "../timeline/timeline";
import { CAMERA_PATH_KEYS } from "./camera-keys";

export type Vec3 = readonly [number, number, number];

export interface CameraKey {
  /** Global scroll progress at which the camera is exactly at this key. */
  at: number;
  position: Vec3;
  /** Point the camera looks at. */
  target: Vec3;
}

/** Author keys against scenes: key("context", 0.5, [x,y,z], [tx,ty,tz]). */
export const key = (scene: SceneId, at: number, position: Vec3, target: Vec3): CameraKey => ({
  at: progressOf(scene, at),
  position,
  target,
});

export const CAMERA_KEYS: readonly CameraKey[] = CAMERA_PATH_KEYS;

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
      const l = b > a ? clamp01((p - a) / (b - a)) : 1;
      return (i + l) / (n - 1);
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
    keys.map((kk) => new Vector3(...kk.position)),
    false,
    "centripetal",
  );
  const targets = new CatmullRomCurve3(
    keys.map((kk) => new Vector3(...kk.target)),
    false,
    "centripetal",
  );
  const stops = keys.map((kk) => kk.at);
  return {
    sample(progress, position, target) {
      const t = curveParameter(progress, stops);
      positions.getPoint(t, position);
      targets.getPoint(t, target);
    },
  };
}

export const BASE_FOV = 40;
export const MAX_FOV = 64;

/** Lens per scene: a long, quiet lens outside; compression in the gap; a wide reveal inside. */
export const FOV_KEYS: Key[] = [
  k("void", 0, 34),
  k("awakening", 1, 38),
  k("context", 1, 38),
  k("passage", 0.5, 31),
  k("passage", 0.84, 28),
  k("passage", 1, 50),
  k("universe", 0.7, 46),
  k("computation", 0.6, 48),
  k("convergence", 1, 40),
  k("three", 1, 42),
  k("unfold", 1, 46),
  k("elevate", 1, 48),
  k("adaptation", 1, 46),
  k("handoff", 0.9, 26),
  k("product", 0, 26),
  k("return", 1, 40),
  k("finale", 1, 34),
];

/** Near plane: tiny only while architecture passes the lens. */
export const NEAR_KEYS: Key[] = [
  k("context", 1, 0.2),
  k("passage", 0.35, 0.03),
  k("passage", 1, 0.03),
  k("universe", 0.4, 0.1),
];

/** How much a scene is about ONE object — portrait screens step back from it. */
export const FOCUS_KEYS: Key[] = [
  k("void", 0, 1),
  k("context", 1, 1),
  k("passage", 0.4, 0),
  k("convergence", 1, 0.3),
  k("three", 0.2, 1),
  k("selection", 1, 1),
  k("unfold", 0.6, 0),
  k("adaptation", 1, 0),
  k("handoff", 0.6, 1),
  k("connected", 0.4, 1),
  k("return", 0.6, 0.6),
  k("finale", 0.4, 1),
];

/**
 * Vertical field of view for a viewport aspect ratio. Landscape keeps the
 * scene's lens; portrait widens it so the horizontal framing stays what a
 * square viewport would see — the subject is never cropped on a phone.
 */
export function fovForAspect(aspect: number, base = BASE_FOV, max = MAX_FOV): number {
  if (!(aspect > 0) || aspect >= 1) return base;
  const half = (base * Math.PI) / 360;
  return Math.min(Math.max(max, base), (2 * Math.atan(Math.tan(half) / aspect) * 180) / Math.PI);
}
