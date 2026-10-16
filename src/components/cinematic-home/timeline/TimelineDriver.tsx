import { useFrame } from "@react-three/fiber";
import { useRef } from "react";

import { damp } from "../math";
import type { ExperienceStore } from "../scroll/experience-store";
import { MAX_FRAME_DT, pacedStep, PROGRESS_SMOOTHING } from "../scroll/progress-math";
import { dwellAt, sceneAt, type ScenePosition } from "./timeline";

/**
 * The per-frame heartbeat, first in the frame: smooths raw scroll into the
 * progress the scene renders (paced through the moments that must be read — see pacedStep)
 * and publishes it for every later frame callback.
 * Only a scene change reaches React. With `freeze`, progress snaps to scroll
 * and ambient time stops — deterministic frames for review and tests.
 */
export function TimelineDriver({
  store,
  animate,
  freeze,
}: {
  store: ExperienceStore;
  animate: boolean;
  freeze: boolean;
}) {
  const scene = useRef<ScenePosition>({ index: 0, local: 0 });
  const started = useRef(false);

  useFrame((_, delta) => {
    const s = store.state;
    const dt = Math.min(delta, MAX_FRAME_DT);
    if (!started.current || freeze) {
      // Arriving mid-page (reload, back button) starts where the visitor is — no fly-in.
      s.progress = s.targetProgress;
      started.current = true;
    }
    const previous = s.progress;
    s.progress = pacedStep(
      s.progress,
      s.targetProgress,
      PROGRESS_SMOOTHING,
      dwellAt(s.progress),
      dt,
    );
    if (Math.abs(s.targetProgress - s.progress) < 1e-5) s.progress = s.targetProgress;
    s.velocity = damp(s.velocity, dt > 0 ? (s.progress - previous) / dt : 0, 6, dt);
    if (animate && !freeze) s.time += dt;

    const out = sceneAt(s.progress, undefined, scene.current);
    s.sceneLocal = out.local;
    if (out.index !== s.sceneIndex) {
      s.sceneIndex = out.index;
      store.emit();
    }
  }, -2);

  return null;
}
