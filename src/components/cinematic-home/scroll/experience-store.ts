import { createContext, useContext, useSyncExternalStore } from "react";

import type { Capability, DeviceProfile } from "../device/capabilities";

/**
 * State shared by the DOM side (scroll listener, overlay, HUD) and the WebGL
 * side (camera, core, nodes).
 *
 * Continuous values — progress, camera position, fps — are written straight
 * into `state` and read every frame; they NEVER trigger a React render. Only
 * discrete events (scene change, ready, stage visibility) call `emit()`, which
 * re-renders the few components subscribed through `useExperienceValue`.
 * React stays completely out of the 60 fps loop.
 */
export interface ExperienceState {
  /** Raw scroll progress through the cinematic section (0 → 1). */
  targetProgress: number;
  /** Smoothed progress the scene actually renders. */
  progress: number;
  /** Smoothed rate of change of `progress` (per second). */
  velocity: number;
  /** Seconds of animated time (frozen while the stage is paused). */
  time: number;
  sceneIndex: number;
  sceneLocal: number;
  /** Pointer over the viewport, −1 → 1 on both axes (0, 0 = centre). */
  pointer: { x: number; y: number };
  camera: { x: number; y: number; z: number; fov: number };
  /** False once the cinematic section has scrolled fully out of view. */
  stageActive: boolean;
  /** Still at the very top — drives the scroll cue. */
  atStart: boolean;
  /** First frames are on screen — the loading veil can lift. */
  ready: boolean;
  perf: { fps: number; dpr: number; dprChanges: number };
  renderer: {
    calls: number;
    triangles: number;
    /** Visible gold filaments, visible opportunity nodes, GPU geometries and textures. */
    filaments: number;
    nodes: number;
    geometries: number;
    textures: number;
  };
  device: DeviceProfile | null;
  capability: Capability | null;
  /** World-space points the DOM labels follow (written by the worlds each frame). */
  anchors: Map<string, Anchor>;
  /** The product surface's world matrix and how much the real DOM has taken it over. */
  slab: { visible: boolean; matrix: Float32Array; dom: number; released: boolean };
  /** DOM elements the canvas drives directly every frame (never through React state). */
  dom: {
    anchors: Map<string, HTMLElement>;
    captions: Map<string, HTMLElement>;
    panel: HTMLElement | null;
    counter: HTMLElement | null;
  };
}

export interface Anchor {
  x: number;
  y: number;
  z: number;
  /** Opacity 0 → 1. */
  o: number;
}

export function createExperienceStore() {
  const state: ExperienceState = {
    targetProgress: 0,
    progress: 0,
    velocity: 0,
    time: 0,
    sceneIndex: 0,
    sceneLocal: 0,
    pointer: { x: 0, y: 0 },
    camera: { x: 0, y: 0, z: 0, fov: 0 },
    stageActive: true,
    atStart: true,
    ready: false,
    perf: { fps: 0, dpr: 1, dprChanges: 0 },
    renderer: { calls: 0, triangles: 0, filaments: 0, nodes: 0, geometries: 0, textures: 0 },
    device: null,
    capability: null,
    anchors: new Map(),
    slab: { visible: false, matrix: new Float32Array(16), dom: 0, released: false },
    dom: { anchors: new Map(), captions: new Map(), panel: null, counter: null },
  };
  const listeners = new Set<() => void>();
  return {
    state,
    /** Announce a DISCRETE change. Never call this per frame. */
    emit() {
      for (const listener of listeners) listener();
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export type ExperienceStore = ReturnType<typeof createExperienceStore>;

export const ExperienceStoreContext = createContext<ExperienceStore | null>(null);

export function useExperienceStore(): ExperienceStore {
  const store = useContext(ExperienceStoreContext);
  if (!store) throw new Error("useExperienceStore must be used inside <CinematicHome>");
  return store;
}

/**
 * Subscribe to ONE discrete value; re-renders only when it changes. Select
 * only values that change through `emit()` — never per-frame ones.
 */
export function useExperienceValue<T>(
  store: ExperienceStore,
  select: (state: ExperienceState) => T,
): T {
  const read = () => select(store.state);
  return useSyncExternalStore(store.subscribe, read, read);
}
