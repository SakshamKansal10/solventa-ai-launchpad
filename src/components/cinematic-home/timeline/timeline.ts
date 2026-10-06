import { clamp01 } from "../math";

/**
 * The cinematic homepage's single source of truth for WHEN things happen.
 *
 * Scroll progress (0 → 1 across the whole cinematic section) is divided into
 * the eight narrative scenes. Every other channel — camera keyframes, core
 * energy, node order — is anchored to a scene through `progressOf`, never to a
 * raw number, so lengthening one scene later re-times everything after it
 * without touching any other file.
 *
 * Pure data + pure functions: no three.js, no DOM. Safe to import from the DOM
 * overlay, the static fallback and the WebGL scene alike.
 */

export type SceneId =
  | "chaos"
  | "context"
  | "possibilities"
  | "intelligence"
  | "direction"
  | "execution"
  | "evidence"
  | "adaptation";

export interface SceneDef {
  id: SceneId;
  /** Development label only — not homepage copy. */
  label: string;
  /** Scroll length of the scene, in large-viewport heights (lvh). */
  lengthVh: number;
}

export const SCENES: readonly SceneDef[] = [
  { id: "chaos", label: "Chaos", lengthVh: 125 },
  { id: "context", label: "Context", lengthVh: 125 },
  { id: "possibilities", label: "Possibilities", lengthVh: 125 },
  { id: "intelligence", label: "Intelligence", lengthVh: 125 },
  { id: "direction", label: "Direction", lengthVh: 125 },
  { id: "execution", label: "Execution", lengthVh: 125 },
  { id: "evidence", label: "Evidence", lengthVh: 125 },
  { id: "adaptation", label: "Adaptation", lengthVh: 125 },
];

export interface SceneRange extends SceneDef {
  index: number;
  /** Global progress where the scene starts (inclusive). */
  start: number;
  /** Global progress where the scene ends (exclusive, except the last scene). */
  end: number;
}

export function buildSceneRanges(scenes: readonly SceneDef[]): SceneRange[] {
  const total = scenes.reduce((sum, s) => sum + s.lengthVh, 0);
  let cursor = 0;
  return scenes.map((scene, index) => {
    const start = cursor / total;
    cursor += scene.lengthVh;
    // The last scene ends exactly at 1 — no floating-point gap at the bottom.
    const end = index === scenes.length - 1 ? 1 : cursor / total;
    return { ...scene, index, start, end };
  });
}

export const SCENE_RANGES: readonly SceneRange[] = buildSceneRanges(SCENES);

/** Total scroll distance of the cinematic section, in lvh. */
export const TIMELINE_SCROLL_VH = SCENES.reduce((sum, s) => sum + s.lengthVh, 0);

/** Global progress of a point inside a scene (`local` 0 = its start, 1 = its end). */
export function progressOf(
  id: SceneId,
  local = 0,
  ranges: readonly SceneRange[] = SCENE_RANGES,
): number {
  const range = ranges.find((r) => r.id === id);
  if (!range) throw new Error(`Unknown scene: ${id}`);
  return range.start + (range.end - range.start) * clamp01(local);
}

export interface ScenePosition {
  index: number;
  /** How far through the scene, 0 → 1. */
  local: number;
}

/** Which scene a global progress falls in. Pass `out` to avoid allocating (per-frame use). */
export function sceneAt(
  progress: number,
  ranges: readonly SceneRange[] = SCENE_RANGES,
  out: ScenePosition = { index: 0, local: 0 },
): ScenePosition {
  const p = clamp01(progress);
  out.index = 0;
  out.local = 0;
  for (let i = ranges.length - 1; i >= 0; i--) {
    const r = ranges[i];
    if (p >= r.start) {
      out.index = i;
      out.local = clamp01((p - r.start) / (r.end - r.start));
      break;
    }
  }
  return out;
}

export interface Key {
  at: number;
  value: number;
}

/**
 * A keyframed channel's value at `progress`: holds the first/last value
 * outside the keys and eases (smoothstep) between neighbours, so every key is
 * a gentle stop rather than a corner. Keys must be sorted by `at`.
 */
export function sampleKeys(keys: readonly Key[], progress: number): number {
  if (keys.length === 0) return 0;
  const p = clamp01(progress);
  if (p <= keys[0].at) return keys[0].value;
  for (let i = 1; i < keys.length; i++) {
    const b = keys[i];
    if (p <= b.at) {
      const a = keys[i - 1];
      const span = b.at - a.at;
      const u = span > 0 ? (p - a.at) / span : 1;
      return a.value + (b.value - a.value) * u * u * (3 - 2 * u);
    }
  }
  return keys[keys.length - 1].value;
}

/** How charged the placeholder core is: 0 dormant → 1 peak (mid-Intelligence). */
export const CORE_ENERGY: readonly Key[] = [
  { at: 0, value: 0.06 },
  { at: progressOf("context"), value: 0.12 },
  { at: progressOf("possibilities", 0.5), value: 0.45 },
  { at: progressOf("intelligence", 0.5), value: 1 },
  { at: progressOf("direction", 0.5), value: 0.65 },
  { at: 1, value: 0.5 },
];

/** How ordered the placeholder node field is: 0 drifting chaos → 1 structured. */
export const NODE_ORDER: readonly Key[] = [
  { at: 0, value: 0 },
  { at: progressOf("context", 0.6), value: 0.65 },
  { at: progressOf("intelligence"), value: 1 },
  { at: 1, value: 1 },
];

export interface TimelineSample {
  sceneIndex: number;
  sceneLocal: number;
  coreEnergy: number;
  nodeOrder: number;
}

const scratchScene: ScenePosition = { index: 0, local: 0 };

/** Everything the scene needs for one frame, written into `out` (no per-frame allocation). */
export function sampleTimeline(progress: number, out: TimelineSample): TimelineSample {
  sceneAt(progress, SCENE_RANGES, scratchScene);
  out.sceneIndex = scratchScene.index;
  out.sceneLocal = scratchScene.local;
  out.coreEnergy = sampleKeys(CORE_ENERGY, progress);
  out.nodeOrder = sampleKeys(NODE_ORDER, progress);
  return out;
}
