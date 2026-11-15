/**
 * Stages of getting the film ready, as User Timing marks (`cine:*`). They cost nothing measurable
 * and are read by scripts/film-ready.mjs to split time-to-`data-ready` into: bundle download,
 * canvas creation, environment, shader compile, texture upload and geometry warm-up.
 */
export type ReadyStage =
  | "bundle-start"
  | "bundle-loaded"
  | "canvas-created"
  | "environment"
  | "shaders"
  | "textures"
  | "geometry"
  | "ready";

const seen = new Set<ReadyStage>();

export function markStage(stage: ReadyStage, detail?: Record<string, number>) {
  if (seen.has(stage) || typeof performance === "undefined" || !performance.mark) return;
  seen.add(stage);
  try {
    performance.mark(`cine:${stage}`, detail ? { detail } : undefined);
  } catch {
    /* marks are diagnostics only */
  }
}
