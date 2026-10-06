import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";

import { useExperienceValue, type ExperienceStore } from "../scroll/experience-store";
import { governDpr, type GovernorState, type QualityPreset } from "./quality";

/**
 * Measures real frame rate in one-second windows and trades resolution for
 * smoothness: two slow windows drop the pixel ratio a step; sustained headroom
 * wins a step back (a limited number of times). Also publishes renderer
 * counters for the dev HUD.
 */
export function PerformanceGovernor({
  store,
  preset,
}: {
  store: ExperienceStore;
  preset: QualityPreset;
}) {
  const setDpr = useThree((s) => s.setDpr);
  const sampleWindow = useRef({ frames: 0, time: 0 });
  const governor = useRef<GovernorState | null>(null);

  useFrame((state, delta) => {
    const s = store.state;
    // three resets these per render, so this reads the previous frame's totals.
    s.renderer.calls = state.gl.info.render.calls;
    s.renderer.triangles = state.gl.info.render.triangles;
    s.renderer.geometries = state.gl.info.memory.geometries;
    s.renderer.textures = state.gl.info.memory.textures;

    const w = sampleWindow.current;
    if (delta > 0.25) {
      // A stall (tab switch, GC, debugger) is not a performance signal.
      w.frames = 0;
      w.time = 0;
      return;
    }
    w.frames += 1;
    w.time += delta;
    if (w.time < 1) return;
    const fps = w.frames / w.time;
    w.frames = 0;
    w.time = 0;

    const ceiling = Math.min(preset.dpr[1], window.devicePixelRatio || 1);
    const current = governor.current ?? {
      dpr: state.viewport.dpr,
      slow: 0,
      fast: 0,
      recoveries: 0,
    };
    const next = governDpr(current, fps, preset, ceiling);
    if (next.dpr !== current.dpr) {
      setDpr(next.dpr);
      s.perf.dprChanges += 1;
    }
    governor.current = next;
    s.perf.fps = fps;
    s.perf.dpr = next.dpr;
  }, -3);

  return null;
}

/** Stops rendering entirely while the cinematic section is scrolled out of view. */
export function RenderGate({ store }: { store: ExperienceStore }) {
  const setFrameloop = useThree((s) => s.setFrameloop);
  const active = useExperienceValue(store, (s) => s.stageActive);
  useEffect(() => {
    setFrameloop(active ? "always" : "never");
  }, [active, setFrameloop]);
  return null;
}
