import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Vector3, type PerspectiveCamera } from "three";

import { damp } from "../math";
import type { ExperienceStore } from "../scroll/experience-store";
import { MAX_FRAME_DT } from "../scroll/progress-math";
import { sampleKeys } from "../timeline/timeline";
import {
  createCameraPath,
  FOCUS_KEYS,
  FOV_KEYS,
  fovForAspect,
  FRAME_KEYS,
  NEAR_KEYS,
} from "./camera-path";

/**
 * Pointer parallax: the furthest the camera leans (world units, along its own
 * right/up axes) and how lazily it follows (1/s). Deliberately tiny — a sense
 * of depth, never a steering wheel. Scaled down while passing close geometry.
 */
const LEAN = { x: 0.2, y: 0.11, lambda: 1.6 };
const WORLD_UP = new Vector3(0, 1, 0);

/** Places the camera on the scroll-driven path every frame, after the timeline. */
export function CameraRig({ store, parallax }: { store: ExperienceStore; parallax: boolean }) {
  const path = useMemo(() => createCameraPath(), []);
  const scratch = useMemo(
    () => ({
      position: new Vector3(),
      target: new Vector3(),
      forward: new Vector3(),
      right: new Vector3(),
      up: new Vector3(),
    }),
    [],
  );
  const lean = useRef({ x: 0, y: 0 });
  /** The lens shift last applied (and for which viewport), so it is only set when it changes. */
  const frame = useRef({ key: "" });

  useFrame((state, delta) => {
    const s = store.state;
    const camera = state.camera as PerspectiveCamera;
    const dt = Math.min(delta, MAX_FRAME_DT);
    const p = s.progress;
    const aspect = state.size.width / Math.max(1, state.size.height);

    const fov = fovForAspect(aspect, sampleKeys(FOV_KEYS, p));
    const near = sampleKeys(NEAR_KEYS, p);
    if (Math.abs(camera.fov - fov) > 0.01 || Math.abs(camera.near - near) > 1e-4) {
      camera.fov = fov;
      camera.near = near;
      camera.far = 1600;
      camera.updateProjectionMatrix();
    }

    // Composition: a horizontal lens shift (landscape only) — the subject slides right to give
    // the editorial type its column. setViewOffset keeps the projection exact for the labels
    // and the product panel, which project through the same camera.
    const { width: w, height: h } = state.size;
    const shift = aspect >= 1 ? sampleKeys(FRAME_KEYS, p) : 0;
    const frameKey = `${shift.toFixed(4)}:${w}x${h}`;
    if (frameKey !== frame.current.key) {
      frame.current.key = frameKey;
      if (Math.abs(shift) < 1e-4) camera.clearViewOffset();
      else camera.setViewOffset(w, h, -shift * w, 0, w, h);
    }

    const { position, target, forward, right, up } = scratch;
    path.sample(p, position, target);

    // Portrait screens step back from single-object scenes so the subject keeps its margins.
    if (aspect < 1) {
      const focus = sampleKeys(FOCUS_KEYS, p);
      // Enough to keep the subject's full WIDTH in a narrow horizontal field of view.
      const back = 1 + (1 - aspect) * 0.95 * focus;
      position.sub(target).multiplyScalar(back).add(target);
    }

    const closeness = near < 0.08 ? 0.25 : 1;
    const l = lean.current;
    l.x = damp(l.x, parallax ? s.pointer.x * LEAN.x * closeness : 0, LEAN.lambda, dt);
    l.y = damp(l.y, parallax ? s.pointer.y * LEAN.y * closeness : 0, LEAN.lambda, dt);
    forward.subVectors(target, position).normalize();
    right.crossVectors(forward, WORLD_UP).normalize();
    up.crossVectors(right, forward);
    position.addScaledVector(right, l.x).addScaledVector(up, l.y);

    camera.position.copy(position);
    camera.lookAt(target);

    s.camera.x = position.x;
    s.camera.y = position.y;
    s.camera.z = position.z;
    s.camera.fov = camera.fov;
  }, -1);

  return null;
}
