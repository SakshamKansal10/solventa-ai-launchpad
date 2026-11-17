import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";

import { useExperienceValue, type ExperienceStore } from "../scroll/experience-store";
import {
  ADAPT,
  median,
  adaptNotch,
  notchDpr,
  QUALITY_NOTCHES,
  type QualityPreset,
} from "./quality";

/**
 * Adaptive quality inside the live film (owner, 2026-11-17: it replaces every tier switch — the
 * page never changes, only how finely the world is drawn). Frame time is sampled only while the
 * story is MOVING, and only from ADAPT.warmupMs after the world is ready (loading hitches say
 * nothing). Each ~2 s window of moving frames slower than 20 ms (median) steps quality down one
 * level (lower pixel ratio, floor 0.75; fewer filaments drawn); two windows in a row faster than
 * 12.5 ms step it back up. The level lives in this page only: never stored between visits.
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
  const sample = useRef({
    frames: [] as number[],
    time: 0,
    pending: -1,
    pendingReason: "",
    waited: 0,
    pinned: false,
    fast: 0,
    readyAt: 0,
  });

  const apply = (notch: number, reason?: string) => {
    const s = store.state;
    s.perf.notch = notch;
    if (reason) s.perf.reason = reason;
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
        apply(w.pending, w.pendingReason);
        w.pending = -1;
      }
      return;
    }
    // Loading and first-draw hitches are not the film's running speed.
    if (!s.ready) return;
    const now = performance.now();
    if (!w.readyAt) w.readyAt = now;
    if (now - w.readyAt < ADAPT.warmupMs) return;
    const moving =
      Math.abs(s.targetProgress - s.progress) > 1e-4 || Math.abs(s.velocity) > ADAPT.calmVelocity;
    if (!moving || ms <= 0 || ms > ADAPT.stallMs) return;
    w.frames.push(ms);
    w.time += ms;
    if (w.time < ADAPT.windowMs) return;
    const m = Math.round(median(w.frames) * 10) / 10;
    const next = adaptNotch(s.perf.notch, w.frames, w.fast);
    s.perf.medians.push(m);
    w.frames = [];
    w.time = 0;
    w.fast = next.fastStreak;
    if (next.notch !== s.perf.notch) {
      w.pending = next.notch;
      w.pendingReason =
        next.notch > s.perf.notch
          ? `frames slow (median ${m} ms) → level ${next.notch + 1}`
          : `frames recovered (median ${m} ms) → level ${next.notch + 1}`;
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
  const held = useExperienceValue(store, (s) => s.worldHeld);
  useEffect(() => {
    // R3F hands useFrame `timestamp − elapsedTime` as the delta, so the timestamp is in SECONDS
    // (rAF gives milliseconds): every frame callback then gets its delta in seconds.
    store.state.renderWorld =
      active && compiled && !held ? (now: number) => advance(now / 1000) : null;
    return () => {
      store.state.renderWorld = null;
    };
  }, [store, active, compiled, held, advance]);
  return null;
}
