import { useFrame } from "@react-three/fiber";
import { useRef } from "react";

import type { ExperienceStore } from "../scroll/experience-store";

/** Frames rendered before the veil lifts — by then shaders are compiled and the scene is real. */
const FRAMES_BEFORE_READY = 3;

/** Lifts the loading veil onto a rendered scene, never onto a blank canvas. */
export function ReadySignal({ store }: { store: ExperienceStore }) {
  const frames = useRef(0);
  useFrame(() => {
    if (store.state.ready) return;
    frames.current += 1;
    if (frames.current >= FRAMES_BEFORE_READY) {
      store.state.ready = true;
      store.emit();
    }
  });
  return null;
}
