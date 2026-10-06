import { useEffect, type RefObject } from "react";

import type { ExperienceStore } from "./experience-store";
import { sectionProgress } from "./progress-math";

/** Below this progress the visitor is "still at the top" (the scroll cue shows). */
const AT_START = 0.01;

/**
 * Native scroll → raw progress (0 → 1) through the cinematic section.
 *
 * Scrolling stays 100% native (keyboard, trackpad momentum, anchor links,
 * scroll restoration and screen readers all behave as on any page). The
 * listener is passive, reads only `scrollY`, and measures the section on
 * resize — never per scroll event — so it cannot cause layout thrash. The
 * WebGL frame loop does the smoothing.
 */
export function useScrollController(
  store: ExperienceStore,
  sectionRef: RefObject<HTMLElement | null>,
  enabled: boolean,
) {
  useEffect(() => {
    const section = sectionRef.current;
    if (!enabled || !section) return;
    let top = 0;
    let height = 0;

    const update = () => {
      const s = store.state;
      const y = window.scrollY;
      s.targetProgress = sectionProgress(y, top, height, window.innerHeight);
      // Content after the section slides over the fixed stage; once it covers
      // the whole viewport the stage is invisible and rendering can pause.
      const stageActive = y < top + height;
      const atStart = s.targetProgress < AT_START;
      if (stageActive !== s.stageActive || atStart !== s.atStart) {
        s.stageActive = stageActive;
        s.atStart = atStart;
        store.emit();
      }
    };
    const measure = () => {
      const rect = section.getBoundingClientRect();
      top = rect.top + window.scrollY;
      height = rect.height;
      update();
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(section);
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", measure);
    };
  }, [store, sectionRef, enabled]);
}
