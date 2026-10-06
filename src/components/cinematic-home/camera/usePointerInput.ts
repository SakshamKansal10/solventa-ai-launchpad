import { useEffect } from "react";

import type { ExperienceStore } from "../scroll/experience-store";

/**
 * Pointer position for the camera's parallax lean — mouse and trackpad only
 * (touch has no hover, and a lean that follows a finger feels like a game).
 */
export function usePointerInput(store: ExperienceStore, enabled: boolean) {
  useEffect(() => {
    if (!enabled || !window.matchMedia("(pointer: fine)").matches) return;
    const pointer = store.state.pointer;
    const onMove = (event: PointerEvent) => {
      pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.y = 1 - (event.clientY / window.innerHeight) * 2;
    };
    const recentre = () => {
      pointer.x = 0;
      pointer.y = 0;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", recentre);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("mouseleave", recentre);
      recentre();
    };
  }, [store, enabled]);
}
