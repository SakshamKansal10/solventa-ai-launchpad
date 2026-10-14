import { clamp01 } from "../math";

/**
 * The cinematic homepage's single source of truth for WHEN things happen.
 *
 * Scroll progress (0 → 1 across the whole cinematic section) is divided into
 * the narrative scenes below. Every other channel — camera keys, core
 * assembly, universe scoring, path construction — is anchored to a scene
 * through `progressOf` / `local`, never to a raw number, so re-timing one
 * scene re-times everything after it without touching any other file.
 *
 * Pure data + pure functions: no three.js, no DOM.
 */

export type SceneId =
  | "void"
  | "awakening"
  | "context"
  | "passage"
  | "universe"
  | "computation"
  | "convergence"
  | "three"
  | "selection"
  | "unfold"
  | "validate"
  | "build"
  | "elevate"
  | "evidence"
  | "crisis"
  | "adaptation"
  | "handoff"
  | "product"
  | "connected"
  | "return"
  | "finale";

export interface SceneDef {
  id: SceneId;
  /** Development label (HUD, tests) — not homepage copy. */
  label: string;
  /** Scroll length of the scene, in large-viewport heights (lvh). */
  lengthVh: number;
}

/**
 * Eight moments, each one message: identity · your reality · possibilities · one direction ·
 * validate · evidence · the product · the finale. The scenes between them are transitions and
 * are kept short; Build and Elevate pass inside Validate's moment, Crisis inside Evidence's.
 */
export const SCENES: readonly SceneDef[] = [
  { id: "void", label: "Void", lengthVh: 45 },
  { id: "awakening", label: "Core awakening", lengthVh: 105 },
  // Long enough to read each founder signal — its category and its value — one at a time.
  { id: "context", label: "Context", lengthVh: 150 },
  { id: "passage", label: "Core → universe", lengthVh: 85 },
  { id: "universe", label: "Opportunity universe", lengthVh: 75 },
  { id: "computation", label: "Computation", lengthVh: 65 },
  { id: "convergence", label: "Convergence", lengthVh: 95 },
  { id: "three", label: "Final three", lengthVh: 85 },
  { id: "selection", label: "One direction", lengthVh: 75 },
  { id: "unfold", label: "Opportunity → path", lengthVh: 45 },
  { id: "validate", label: "Validate", lengthVh: 75 },
  { id: "build", label: "Build", lengthVh: 38 },
  { id: "elevate", label: "Elevate", lengthVh: 38 },
  { id: "evidence", label: "Evidence", lengthVh: 48 },
  { id: "crisis", label: "Evidence crisis", lengthVh: 48 },
  { id: "adaptation", label: "Adaptation", lengthVh: 75 },
  { id: "handoff", label: "3D → interface", lengthVh: 55 },
  { id: "product", label: "Product", lengthVh: 100 },
  { id: "connected", label: "Connected intelligence", lengthVh: 45 },
  { id: "return", label: "Product → cinema", lengthVh: 35 },
  { id: "finale", label: "Finale", lengthVh: 120 },
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

const BY_ID = new Map<SceneId, SceneRange>(SCENE_RANGES.map((r) => [r.id, r]));

/** Total scroll distance of the cinematic section, in lvh. */
export const TIMELINE_SCROLL_VH = SCENES.reduce((sum, s) => sum + s.lengthVh, 0);

/** Global progress of a point inside a scene (`local` 0 = its start, 1 = its end). */
export function progressOf(
  id: SceneId,
  local = 0,
  ranges: readonly SceneRange[] = SCENE_RANGES,
): number {
  const range = ranges === SCENE_RANGES ? BY_ID.get(id) : ranges.find((r) => r.id === id);
  if (!range) throw new Error(`Unknown scene: ${id}`);
  return range.start + (range.end - range.start) * clamp01(local);
}

/** How far through scene `id` global progress `p` is, clamped 0 → 1. */
export function local(p: number, id: SceneId): number {
  const range = BY_ID.get(id);
  if (!range) throw new Error(`Unknown scene: ${id}`);
  return clamp01((p - range.start) / (range.end - range.start));
}

/** Linear 0 → 1 between two global progress values. */
export function between(p: number, a: number, b: number): number {
  return b > a ? clamp01((p - a) / (b - a)) : p >= b ? 1 : 0;
}

/** Eased (smoothstep) 0 → 1 between two points given as [scene, local] pairs. */
export function ramp(
  p: number,
  from: SceneId,
  fromLocal: number,
  to: SceneId,
  toLocal: number,
): number {
  const u = between(p, progressOf(from, fromLocal), progressOf(to, toLocal));
  return u * u * (3 - 2 * u);
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

/** Shorthand for authoring keys anchored to scenes: k("context", 0.5, 1.2). */
export const k = (id: SceneId, at: number, value: number): Key => ({
  at: progressOf(id, at),
  value,
});
