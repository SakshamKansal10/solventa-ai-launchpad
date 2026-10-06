import { Vector3 } from "three";
import { describe, expect, it } from "vitest";

import {
  BASE_FOV,
  CAMERA_KEYS,
  createCameraPath,
  curveParameter,
  fovForAspect,
  MAX_FOV,
} from "./camera-path";

describe("curveParameter", () => {
  const stops = [0, 0.1, 0.5, 1];

  it("reaches control point i exactly at its own progress", () => {
    stops.forEach((stop, i) => expect(curveParameter(stop, stops)).toBeCloseTo(i / 3, 12));
  });

  it("interpolates within a segment and clamps outside 0 → 1", () => {
    expect(curveParameter(0.3, stops)).toBeCloseTo((1 + 0.5) / 3, 12);
    expect(curveParameter(-1, stops)).toBe(0);
    expect(curveParameter(2, stops)).toBe(1);
  });
});

describe("camera path", () => {
  const path = createCameraPath();
  const position = new Vector3();
  const target = new Vector3();

  it("keys are in scroll order, spanning the whole timeline", () => {
    expect(CAMERA_KEYS[0].at).toBe(0);
    expect(CAMERA_KEYS[CAMERA_KEYS.length - 1].at).toBe(1);
    for (let i = 1; i < CAMERA_KEYS.length; i++) {
      expect(CAMERA_KEYS[i].at).toBeGreaterThan(CAMERA_KEYS[i - 1].at);
    }
  });

  it("sits exactly on every key when scroll reaches it", () => {
    for (const key of CAMERA_KEYS) {
      path.sample(key.at, position, target);
      expect(position.toArray().map((v) => +v.toFixed(6))).toEqual([...key.position]);
      expect(target.toArray().map((v) => +v.toFixed(6))).toEqual([...key.target]);
    }
  });

  it("moves continuously — no jumps, no NaN — across the whole scroll", () => {
    const previous = new Vector3();
    path.sample(0, previous, target);
    for (let i = 1; i <= 4000; i++) {
      path.sample(i / 4000, position, target);
      expect(Number.isFinite(position.x + position.y + position.z)).toBe(true);
      expect(Number.isFinite(target.x + target.y + target.z)).toBe(true);
      expect(position.distanceTo(previous)).toBeLessThan(0.1);
      previous.copy(position);
    }
  });
});

describe("fovForAspect", () => {
  it("keeps the base lens on landscape screens", () => {
    expect(fovForAspect(16 / 9)).toBe(BASE_FOV);
    expect(fovForAspect(1)).toBe(BASE_FOV);
  });

  it("widens for portrait so the horizontal framing holds, within a cap", () => {
    const tablet = fovForAspect(3 / 4);
    const phone = fovForAspect(390 / 844);
    expect(tablet).toBeGreaterThan(BASE_FOV);
    expect(phone).toBeGreaterThan(tablet);
    expect(phone).toBeLessThanOrEqual(MAX_FOV);
  });

  it("ignores a degenerate size", () => {
    expect(fovForAspect(0)).toBe(BASE_FOV);
    expect(fovForAspect(Number.NaN)).toBe(BASE_FOV);
  });
});
