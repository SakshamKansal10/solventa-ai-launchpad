import { useEffect, type RefObject } from "react";

import { damp } from "../math";
import { createOverlaySync } from "../overlay/overlay-sync";
import type { ExperienceStore } from "../scroll/experience-store";
import { MAX_FRAME_DT, pacedStep, PROGRESS_SMOOTHING } from "../scroll/progress-math";
import { dwellAt, sceneAt, type ScenePosition } from "./timeline";

/**
 * The story's heartbeat — on the PAGE, not inside the WebGL canvas. From hydration on, every
 * animation frame smooths raw scroll into the progress the film renders (paced through the
 * moments that must be read — see pacedStep), publishes it, and moves the overlay (the identity,
 * captions, tone, count). So the first gesture moves the opening at once, whether the 3D world is
 * still loading or not; when the world starts it simply renders the position the story is
 * already at — it never "catches up".
 *
 * Arriving mid-page (reload, back/forward) starts where the visitor is — no fly-in. A fresh visit
 * starts at the opening and eases from there, however far the visitor scrolled before the page
 * woke up. With `freeze`, progress snaps to scroll and ambient time stops (review, tests).
 */
export function useStoryDriver(
  store: ExperienceStore,
  stageRef: RefObject<HTMLElement | null>,
  { enabled, animate, freeze }: { enabled: boolean; animate: boolean; freeze: boolean },
) {
  useEffect(() => {
    if (!enabled) return;
    const sync = createOverlaySync(store);
    const scene: ScenePosition = { index: 0, local: 0 };
    const nav = performance.getEntriesByType?.("navigation")[0] as
      PerformanceNavigationTiming | undefined;
    const resuming = nav?.type === "reload" || nav?.type === "back_forward";
    let started = false;
    let last = 0;
    let raf = 0;

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const s = store.state;
      const dt = last ? Math.min(Math.max(0, (now - last) / 1000), MAX_FRAME_DT) : 0;
      last = now;
      if (!started) {
        started = true;
        if (resuming) s.progress = s.targetProgress;
      }
      if (freeze) s.progress = s.targetProgress;
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
      // Ambient time runs while the stage is on screen (as the world's own loop does).
      if (animate && !freeze && s.stageActive) s.time += dt;

      const out = sceneAt(s.progress, undefined, scene);
      s.sceneLocal = out.local;
      if (out.index !== s.sceneIndex) {
        s.sceneIndex = out.index;
        store.emit();
      }

      if (!s.stageActive) return;
      const stage = stageRef.current;
      sync(
        s.progress,
        stage?.clientWidth || window.innerWidth,
        stage?.clientHeight || window.innerHeight,
        animate && !freeze,
      );
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [store, stageRef, enabled, animate, freeze]);
}
