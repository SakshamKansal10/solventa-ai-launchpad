import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";

import { useExperienceValue, type ExperienceStore } from "../scroll/experience-store";
import { ADAPT, median, nextNotch, notchDpr, QUALITY_NOTCHES, type QualityPreset } from "./quality";

/**
 * Adaptive quality inside the visit's tier (owner decision, proposal A): frame time is sampled
 * only while the story is MOVING, in any scene — the light opening at rest says nothing about the
 * universe or the path. Each ~2 s window of moving frames whose median is slower than 20 ms steps
 * quality down one notch (lower pixel ratio, fewer filaments drawn), as far as the last notch.
 * It never steps back up during a visit (no oscillation).
 *
 * No visible hitch: the step goes through R3F's own setDpr (no React render — re-rendering the
 * canvas would re-render the whole scene tree) and is applied at a calm moment, when the story
 * has (nearly) come to rest, or after at most CALM_WAIT_MS. A notch never unmounts anything or
 * changes the page. Off under ?freeze (deterministic review frames).
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
  const sample = useRef({ frames: [] as number[], time: 0, pending: -1, waited: 0, pinned: false });

  const apply = (notch: number) => {
    const s = store.state;
    s.perf.notch = notch;
    s.perf.filamentShare = QUALITY_NOTCHES[notch].filamentShare;
    setDpr(notchDpr(preset, window.devicePixelRatio || 1, notch));
  };

  // Measurement aid (scripts/film-perf.mjs): ?perf=1&notch=N pins a notch and turns adapting off.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const pinned = Number(q.get("notch"));
    if (!q.has("perf") || !q.has("notch") || !(pinned in QUALITY_NOTCHES)) return;
    sample.current.pinned = true;
    apply(pinned);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store]);

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
    if (!adaptive || w.pinned) return;
    const ms = delta * 1000;
    // A decided step waits for a calm moment (the story at rest), at most CALM_WAIT_MS.
    if (w.pending >= 0) {
      w.waited += Math.min(ms, ADAPT.stallMs);
      if (Math.abs(s.velocity) < ADAPT.calmVelocity || w.waited >= ADAPT.calmWaitMs) {
        apply(w.pending);
        w.pending = -1;
      }
      return;
    }
    if (s.perf.notch >= QUALITY_NOTCHES.length - 1) return;
    const moving =
      Math.abs(s.targetProgress - s.progress) > 1e-4 || Math.abs(s.velocity) > ADAPT.calmVelocity;
    if (!moving || ms <= 0 || ms > ADAPT.stallMs) return;
    w.frames.push(ms);
    w.time += ms;
    if (w.time < ADAPT.windowMs) return;
    const next = nextNotch(s.perf.notch, w.frames);
    s.perf.medians.push(Math.round(median(w.frames) * 10) / 10);
    w.frames = [];
    w.time = 0;
    if (next > s.perf.notch) {
      w.pending = next;
      w.waited = 0;
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
