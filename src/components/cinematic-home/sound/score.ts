import { k, progressOf, sampleKeys, type SceneId } from "../timeline/timeline";
import { arrivalWindow, FRAMES } from "../world/core/core-design";
import { SIGNALS, signalWindow } from "../world/context/context-model";

/**
 * The score — what the soundtrack does at every point of the film, as PURE
 * data (like the camera and the timeline): continuous layer levels as keyed
 * curves over scroll progress, and one-shot cues pinned to moments. The audio
 * engine only renders this, so the sound is as reversible and testable as the
 * picture. Sound never carries meaning on its own — everything it marks is
 * also seen.
 */

export interface Mix {
  /** Ambient system bed: a high-end machine in a huge quiet space. */
  bed: number;
  /** Bed brightness (low-pass cutoff, Hz): closed = restricted, open = space. */
  cutoff: number;
  /** Low-frequency tension (sub drone with slow beating). */
  tension: number;
  /** Spatial harmonic pad (the universe, the finale). */
  pad: number;
  /** Stereo width of the pad (0 = mono, 1 = wide). */
  width: number;
  /** Computation texture: fine information ticks per second. */
  ticks: number;
  /** Forward-motion pulse along the path (gain). */
  pulse: number;
  /** Overall level (a brief silence before decisions). */
  master: number;
}

const K = k;

const BED = [
  K("void", 0, 0),
  K("void", 0.45, 0.42),
  K("awakening", 0.5, 0.55),
  K("context", 1, 0.55),
  K("passage", 0.55, 0.32),
  K("passage", 0.9, 0.2),
  K("universe", 0.05, 0.6),
  K("computation", 1, 0.5),
  K("three", 0.4, 0.34),
  K("selection", 0.12, 0.14),
  K("selection", 0.5, 0.12),
  K("selection", 0.75, 0.42),
  K("validate", 0.2, 0.42),
  K("crisis", 0.5, 0.3),
  K("adaptation", 0.8, 0.45),
  K("handoff", 0.8, 0.28),
  K("product", 0.5, 0.24),
  K("return", 1, 0.36),
  K("finale", 0.4, 0.42),
  K("finale", 1, 0.36),
];
const CUTOFF = [
  K("void", 0, 260),
  K("awakening", 0.8, 700),
  K("context", 1, 950),
  K("passage", 0.6, 300),
  K("passage", 0.92, 220),
  K("universe", 0.06, 2600),
  K("computation", 0.6, 1700),
  K("convergence", 1, 1100),
  K("three", 0.6, 700),
  K("selection", 0.4, 420),
  K("selection", 0.8, 1300),
  K("build", 0.5, 1500),
  K("elevate", 1, 2200),
  K("crisis", 0.6, 380),
  K("adaptation", 0.9, 1600),
  K("product", 0.4, 900),
  K("finale", 0.5, 1800),
];
const TENSION = [
  K("context", 0.9, 0),
  K("passage", 0.35, 0.12),
  K("passage", 0.9, 0.62),
  K("universe", 0.04, 0),
  K("three", 0.3, 0),
  K("three", 0.9, 0.34),
  K("selection", 0.45, 0.4),
  K("selection", 0.6, 0),
  K("evidence", 0.5, 0),
  K("crisis", 0.4, 0.28),
  K("adaptation", 0.6, 0.12),
  K("adaptation", 1, 0),
];
const PAD = [
  K("passage", 0.95, 0),
  K("universe", 0.08, 0.5),
  K("computation", 0.8, 0.3),
  K("convergence", 1, 0.16),
  K("three", 0.4, 0.05),
  K("selection", 0.62, 0),
  K("selection", 0.85, 0.22),
  K("unfold", 1, 0.12),
  K("elevate", 0.6, 0.3),
  K("evidence", 0.4, 0.08),
  K("crisis", 0.4, 0),
  K("adaptation", 0.9, 0.18),
  K("product", 0.4, 0.06),
  K("return", 0.8, 0.12),
  K("finale", 0.45, 0.48),
  K("finale", 1, 0.4),
];
const WIDTH = [
  K("passage", 0.9, 0.15),
  K("universe", 0.2, 1),
  K("convergence", 1, 0.5),
  K("selection", 0.5, 0.2),
  K("elevate", 0.8, 0.9),
  K("product", 0.5, 0.4),
  K("finale", 0.6, 0.85),
];
const TICKS = [
  K("universe", 0.6, 0),
  K("computation", 0.1, 11),
  K("computation", 0.9, 14),
  K("convergence", 0.8, 5),
  K("three", 0.2, 0),
];
const PULSE = [
  K("unfold", 0.7, 0),
  K("validate", 0.2, 0.16),
  K("build", 0.4, 0.24),
  K("elevate", 0.8, 0.2),
  K("evidence", 0.3, 0.05),
  K("evidence", 0.6, 0),
];
const MASTER = [
  K("void", 0, 1),
  // A held breath before the one is chosen.
  K("selection", 0.1, 1),
  K("selection", 0.3, 0.55),
  K("selection", 0.55, 0.55),
  K("selection", 0.65, 1),
];

export function mixAt(p: number): Mix {
  return {
    bed: sampleKeys(BED, p),
    cutoff: sampleKeys(CUTOFF, p),
    tension: sampleKeys(TENSION, p),
    pad: sampleKeys(PAD, p),
    width: sampleKeys(WIDTH, p),
    ticks: sampleKeys(TICKS, p),
    pulse: sampleKeys(PULSE, p),
    master: sampleKeys(MASTER, p),
  };
}

export type CueKind =
  | "activation"
  | "flyby"
  | "lock"
  | "signal"
  | "align"
  | "unlock"
  | "reveal"
  | "wave"
  | "narrow"
  | "resolve"
  | "unfold"
  | "gate"
  | "disruption"
  | "reroute"
  | "handoff"
  | "link"
  | "finale";

export interface Cue {
  at: number;
  kind: CueKind;
  /** 0 → 1: which voice of the cue (pitch / pan / layer). */
  index: number;
  /** For path gates: which phase the traveller is in. */
  phase?: "validate" | "build" | "elevate";
}

const cue = (scene: SceneId, at: number, kind: CueKind, index = 0, phase?: Cue["phase"]): Cue => ({
  at: progressOf(scene, at),
  kind,
  index,
  phase,
});

function buildCues(): Cue[] {
  const out: Cue[] = [cue("awakening", 0.03, "activation")];
  // Each layer of the Engine flies in and locks into its gimbal.
  FRAMES.forEach((_, i) => {
    const [w0, w1] = arrivalWindow(i);
    if (i % 2 === 0) out.push(cue("awakening", w0 + 0.04, "flyby", i / 5));
    out.push(cue("awakening", w1 - 0.02, "lock", i / 5));
  });
  // The founder's signals dock, one by one.
  SIGNALS.forEach((_, i) => {
    const [a, b] = signalWindow(i);
    out.push(cue("context", a + (b - a) * 0.8, "signal", i / 5));
  });
  // The gimbal aligns into an aperture (outer → inner), the kernel unlocks, the world opens.
  for (let i = 0; i < 7; i++) out.push(cue("passage", 0.15 + i * 0.045, "align", i / 6));
  out.push(cue("passage", 0.58, "unlock"));
  out.push(cue("passage", 0.96, "reveal"));
  // Six context waves through the universe; then the narrowing, stage by stage.
  for (let i = 0; i < 6; i++) out.push(cue("computation", 0.08 + i * 0.14, "wave", i / 5));
  [0.04, 0.29, 0.54, 0.86].forEach((at, i) => out.push(cue("convergence", at, "narrow", i / 3)));
  out.push(cue("three", 0.06, "narrow", 1));
  out.push(cue("selection", 0.62, "resolve"));
  out.push(cue("unfold", 0.12, "unfold"));
  // Gates passed along the path — a different voice in each phase.
  for (const [phase, n] of [
    ["validate", 6],
    ["build", 6],
    ["elevate", 5],
  ] as const) {
    for (let i = 0; i < n; i++) out.push(cue(phase, (i + 0.5) / n, "gate", i / (n - 1), phase));
  }
  out.push(cue("evidence", 0.62, "disruption"));
  for (let i = 0; i < 5; i++) out.push(cue("adaptation", 0.28 + i * 0.09, "reroute", i / 4));
  out.push(cue("handoff", 0.62, "handoff"));
  for (let i = 0; i < 5; i++) out.push(cue("connected", 0.12 + i * 0.1, "link", i / 4));
  out.push(cue("finale", 0.34, "finale"));
  return out.sort((a, b) => a.at - b.at);
}

export const CUES: readonly Cue[] = buildCues();

/** Largest progress step that still counts as "playing through" (bigger = a jump: stay quiet). */
export const MAX_STEP = 0.02;

/**
 * Cues crossed while moving FORWARD from p0 to p1. Scrolling back, or jumping
 * (restoring a position, dragging the scrollbar), is silent — the soundtrack
 * accompanies travel, it never replays a burst of everything skipped.
 */
export function cuesBetween(p0: number, p1: number): Cue[] {
  if (!(p1 > p0) || p1 - p0 > MAX_STEP) return [];
  return CUES.filter((c) => c.at > p0 && c.at <= p1);
}
