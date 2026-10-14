import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import type { Object3D } from "three";

import type { ExperienceStore } from "../scroll/experience-store";

/**
 * Lifts the void onto a fully prepared world. Before declaring ready it
 * compiles EVERY shader the film will need — with every hidden object made
 * visible for that one pass — using the renderer's parallel async compile, so
 * no scene pays a first-appearance compile stall mid-scroll.
 */
export function ReadySignal({ store }: { store: ExperienceStore }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const phase = useRef<"start" | "compiling" | "done">("start");
  const frames = useRef(0);
  useFrame(() => {
    if (store.state.ready) return;
    frames.current += 1;
    if (phase.current === "start" && frames.current >= 2) {
      phase.current = "compiling";
      const hidden: Object3D[] = [];
      scene.traverse((o) => {
        if (!o.visible) {
          hidden.push(o);
          o.visible = true;
        }
      });
      // compileAsync collects its programs synchronously, so visibility can be restored at once.
      const done = gl.compileAsync(scene, camera);
      for (const o of hidden) o.visible = false;
      void done
        .catch(() => undefined)
        .finally(() => {
          phase.current = "done";
          frames.current = 0;
        });
    }
    if (phase.current === "done" && frames.current >= 2) {
      store.state.ready = true;
      store.emit();
    }
  });
  return null;
}
