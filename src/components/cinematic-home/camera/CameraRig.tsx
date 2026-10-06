import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Vector3, type PerspectiveCamera } from "three";

import { damp } from "../math";
import type { ExperienceStore } from "../scroll/experience-store";
import { MAX_FRAME_DT } from "../scroll/progress-math";
import { createCameraPath, fovForAspect } from "./camera-path";

/**
 * Pointer parallax: the furthest the camera leans (world units, along its own
 * right/up axes) and how lazily it follows (1/s). Deliberately tiny — a sense
 * of depth, never a steering wheel.
 */
const LEAN = { x: 0.22, y: 0.12, lambda: 1.8 };
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

  useFrame((state, delta) => {
    const s = store.state;
    const camera = state.camera as PerspectiveCamera;
    const dt = Math.min(delta, MAX_FRAME_DT);

    const fov = fovForAspect(state.size.width / state.size.height);
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }

    const { position, target, forward, right, up } = scratch;
    path.sample(s.progress, position, target);

    const l = lean.current;
    l.x = damp(l.x, parallax ? s.pointer.x * LEAN.x : 0, LEAN.lambda, dt);
    l.y = damp(l.y, parallax ? s.pointer.y * LEAN.y : 0, LEAN.lambda, dt);
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
