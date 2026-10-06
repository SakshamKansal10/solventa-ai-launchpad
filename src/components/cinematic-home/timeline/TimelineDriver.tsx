import { useFrame } from "@react-three/fiber";
import { useRef } from "react";

import { damp } from "../math";
import type { ExperienceStore } from "../scroll/experience-store";
import { MAX_FRAME_DT, PROGRESS_SMOOTHING } from "../scroll/progress-math";
import { sampleTimeline, type TimelineSample } from "./timeline";

/**
 * The per-frame heartbeat, first in the frame: smooths raw scroll into the
 * progress the scene renders, samples the timeline ONCE, and publishes the
 * result for every later frame callback. Only a scene change reaches React.
 */
export function TimelineDriver({ store, animate }: { store: ExperienceStore; animate: boolean }) {
  const sample = useRef<TimelineSample>({
    sceneIndex: 0,
    sceneLocal: 0,
    coreEnergy: 0,
    nodeOrder: 0,
  });
  const started = useRef(false);

  useFrame((_, delta) => {
    const s = store.state;
    const dt = Math.min(delta, MAX_FRAME_DT);
    if (!started.current) {
      // Arriving mid-page (reload, back button) starts where the visitor is — no fly-in.
      s.progress = s.targetProgress;
      started.current = true;
    }
    const previous = s.progress;
    s.progress = damp(s.progress, s.targetProgress, PROGRESS_SMOOTHING, dt);
    if (Math.abs(s.targetProgress - s.progress) < 1e-5) s.progress = s.targetProgress;
    s.velocity = damp(s.velocity, dt > 0 ? (s.progress - previous) / dt : 0, 6, dt);
    if (animate) s.time += dt;

    const out = sampleTimeline(s.progress, sample.current);
    s.sceneLocal = out.sceneLocal;
    s.coreEnergy = out.coreEnergy;
    s.nodeOrder = out.nodeOrder;
    if (out.sceneIndex !== s.sceneIndex) {
      s.sceneIndex = out.sceneIndex;
      store.emit();
    }
  }, -2);

  return null;
}
