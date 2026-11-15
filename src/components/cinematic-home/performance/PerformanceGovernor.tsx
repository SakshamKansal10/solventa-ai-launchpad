import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";

import { useExperienceValue, type ExperienceStore } from "../scroll/experience-store";
import { ADAPT, median, nextNotch, notchDpr, QUALITY_NOTCHES, type QualityPreset } from "./quality";

/**
 * Adaptive quality inside the visit's tier: frame time is sampled over the first ~2 s the world
 * renders; a median slower than 20 ms steps quality down one notch (lower pixel ratio, fewer
 * filaments drawn), and the check runs once more. Then it stops — no oscillation. A notch never
 * unmounts anything or changes the page. Off under ?freeze (deterministic review frames).
 * Also publishes renderer counters for the dev HUD and scripts/film-perf.mjs.
 */
export function PerformanceGovernor({
  store,
  preset,
  adaptive,
}: {
  store: ExperienceStore;
  preset: QualityPreset;
  adaptive: boolean;
}) {
  const setDpr = useThree((s) => s.setDpr);
  const sample = useRef({ frames: [] as number[], time: 0, windows: 0 });

  useFrame((state, delta) => {
    const s = store.state;
    // Review hook: with ?freeze / ?debug / ?perf the scene graph is inspectable for profiling.
    const hook = (window as unknown as { __cine?: { three?: unknown } }).__cine;
    if (hook && !hook.three)
      hook.three = { scene: state.scene, gl: state.gl, camera: state.camera };
    // three resets these per render, so this reads the previous frame's totals.
    s.renderer.calls = state.gl.info.render.calls;
    s.renderer.triangles = state.gl.info.render.triangles;
    s.renderer.geometries = state.gl.info.memory.geometries;
    s.renderer.textures = state.gl.info.memory.textures;
    s.perf.dpr = state.viewport.dpr;

    const w = sample.current;
    if (!adaptive || w.windows >= ADAPT.windows) return;
    const ms = delta * 1000;
    if (ms <= 0 || ms > ADAPT.stallMs) return;
    w.frames.push(ms);
    w.time += ms;
    if (w.time < ADAPT.windowMs) return;
    const notch = nextNotch(s.perf.notch, w.frames);
    s.perf.medians.push(Math.round(median(w.frames) * 10) / 10);
    w.frames = [];
    w.time = 0;
    w.windows += 1;
    if (notch !== s.perf.notch) {
      s.perf.notch = notch;
      s.perf.filamentShare = QUALITY_NOTCHES[notch].filamentShare;
      setDpr(notchDpr(preset, window.devicePixelRatio || 1, notch));
    }
  }, -3);

  return null;
}

/**
 * Renders only once every shader is compiled (ReadySignal), and stops rendering entirely while the
 * cinematic section is scrolled out of view. The canvas never runs its own loop
 * (frameloop="never"): the story driver's tick calls `renderWorld`, so the page has ONE
 * requestAnimationFrame loop for scroll, overlay and world.
 */
export function RenderGate({ store }: { store: ExperienceStore }) {
  const advance = useThree((s) => s.advance);
  const active = useExperienceValue(store, (s) => s.stageActive);
  const compiled = useExperienceValue(store, (s) => s.compiled);
  useEffect(() => {
    // R3F hands useFrame `timestamp − elapsedTime` as the delta, so the timestamp is in SECONDS
    // (rAF gives milliseconds): every frame callback then gets its delta in seconds.
    store.state.renderWorld = active && compiled ? (now: number) => advance(now / 1000) : null;
    return () => {
      store.state.renderWorld = null;
    };
  }, [store, active, compiled, advance]);
  return null;
}
