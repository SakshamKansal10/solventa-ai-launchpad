import { k, progressOf, sampleKeys, type SceneId } from "../timeline/timeline";
import { ASSEMBLY } from "../world/core/core-design";
import { finaleAt } from "../overlay/copy";
import { SIGNALS, signalWindow } from "../world/context/context-model";

/**
 * The score — what the soundtrack does at every point of the film, as PURE
 * data (like the camera and the timeline): continuous layer levels as keyed
 * curves over scroll progress, and one-shot cues pinned to the visible events
 * they belong to (by scene id and local progress). The audio engine only renders
 * this, so the sound is as reversible and testable as the picture. Sound never
 * carries meaning on its own — everything it marks is also seen.
 *
 * Layers: A ambient intelligence (bed) · B computation (event cues) · C suspense
 * (tension, master dips) · D structural interaction (locks, aligns, gates) ·
 * E reveal impact · F resolution. One SIGNATURE MOTIF opens the film and returns,
 * resolved, with the Solventia emblem at the end.
 *
 * Character: soothing, warm and minimal — a calm ambient bed that keeps breathing while the
 * visitor rests (idle never means silence), tonal events only where the picture resolves
 * something, ONE restrained signature tone for the emblem. No mechanical clicks or ticks, no
 * noise sweeps or risers (nothing that reads as reversed), no forward pulse.
 */

export interface Mix {
  /** A — ambient system bed: a high-end machine in a huge quiet space. */
  bed: number;
  /** Bed brightness (low-pass cutoff, Hz): closed = restricted, open = space. */
  cutoff: number;
  /** C — low-frequency tension (sub drone with slow beating). */
  tension: number;
  /** E/F — spatial harmonic pad (the universe, the finale). */
  pad: number;
  /** Stereo width of the pad (0 = mono, 1 = wide). */
  width: number;
  /** Forward-motion pulse along the path (gain). */
  pulse: number;
  /** Overall level: brief, deliberate near-silences before decisions and reveals. */
  master: number;
}

const K = k;

/** The finale's identity moment: where the approved emblem lands (finale-local). */
const EMBLEM_AT = finaleAt(0.3);
/** …and where its name has settled, a breath later. */
const NAME_AT = finaleAt(0.42);

const BED = [
  K("void", 0, 0),
  K("void", 0.45, 0.42),
  K("awakening", 0.5, 0.55),
  K("context", 1, 0.55),
  K("passage", 0.55, 0.3),
  K("passage", 0.6, 0.04),
  K("passage", 0.72, 0.04),
  K("passage", 0.8, 0.6),
  K("computation", 1, 0.5),
  K("three", 0.4, 0.34),
  K("selection", 0.12, 0.14),
  K("selection", 0.5, 0.12),
  K("selection", 0.75, 0.42),
  K("validate", 0.2, 0.42),
  K("crisis", 0.5, 0.3),
  K("adaptation", 0.8, 0.45),
  K("handoff", 0.8, 0.28),
  K("product", 0.5, 0.22),
  K("return", 1, 0.36),
  K("finale", 0.4, 0.42),
  K("finale", 1, 0.36),
];
const CUTOFF = [
  K("void", 0, 260),
  K("awakening", 0.8, 700),
  K("context", 1, 950),
  K("passage", 0.6, 300),
  K("passage", 0.72, 220),
  K("passage", 0.78, 2600),
  K("computation", 0.6, 1700),
  // The nine: the field narrows around the decision.
  K("convergence", 0.9, 780),
  K("three", 0.6, 680),
  K("selection", 0.4, 420),
  K("selection", 0.8, 1300),
  K("build", 0.5, 1500),
  K("elevate", 1, 2300),
  K("evidence", 0.55, 1400),
  K("evidence", 0.7, 520),
  K("crisis", 0.6, 380),
  K("adaptation", 0.9, 1600),
  K("product", 0.4, 900),
  // The approach: as the interface resolves back toward the S, the busy top end is taken away —
  // the space narrows and focuses — and only opens again, warm rather than bright, for the name.
  K("connected", 0.8, 700),
  K("return", 0.6, 420),
  K("finale", 0.2, 300),
  K("finale", EMBLEM_AT, 300),
  K("finale", NAME_AT + 0.03, 1100),
  K("finale", 0.8, 1400),
];
const TENSION = [
  K("context", 0.9, 0),
  K("passage", 0.3, 0.06),
  K("passage", 0.54, 0.42),
  K("passage", 0.6, 0),
  K("three", 0.3, 0),
  K("three", 0.95, 0.22),
  K("selection", 0.2, 0.18),
  K("selection", 0.26, 0),
  K("evidence", 0.5, 0),
  K("crisis", 0.4, 0.16),
  K("adaptation", 0.6, 0.06),
  K("adaptation", 1, 0),
  // An almost imperceptible rise under the approach, released the moment the emblem lands.
  K("return", 0.3, 0),
  K("finale", EMBLEM_AT - 0.07, 0.06),
  K("finale", EMBLEM_AT, 0),
];
const PAD = [
  K("passage", 0.74, 0),
  K("passage", 0.86, 0.5),
  K("computation", 0.8, 0.3),
  K("convergence", 1, 0.16),
  K("three", 0.4, 0.05),
  K("selection", 0.62, 0),
  K("selection", 0.85, 0.22),
  K("unfold", 1, 0.12),
  K("elevate", 0.6, 0.32),
  K("evidence", 0.4, 0.08),
  K("crisis", 0.4, 0),
  K("adaptation", 0.9, 0.18),
  K("product", 0.4, 0.06),
  K("return", 0.5, 0.05),
  K("finale", EMBLEM_AT, 0.04),
  // Resolution: the harmony arrives with the name and settles into warmth for the CTA.
  K("finale", NAME_AT + 0.03, 0.4),
  K("finale", 0.8, 0.42),
  K("finale", 1, 0.38),
];
const WIDTH = [
  K("passage", 0.74, 0.15),
  K("passage", 0.9, 1),
  K("convergence", 1, 0.45),
  K("selection", 0.5, 0.2),
  K("elevate", 0.8, 0.95),
  K("product", 0.5, 0.4),
  K("return", 0.6, 0.15),
  K("finale", EMBLEM_AT, 0.15),
  K("finale", 0.66, 0.85),
];
/** The forward pulse is retired (minimal score): kept as a silent layer for the mix shape. */
const PULSE = [K("void", 0, 0)];
const MASTER = [
  K("void", 0, 1),
  // Near-silence inside the lens, immediately before the universe opens…
  K("passage", 0.56, 1),
  K("passage", 0.6, 0.12),
  K("passage", 0.71, 0.12),
  K("passage", 0.735, 1),
  // … and before the one is chosen.
  K("selection", 0.18, 1),
  K("selection", 0.27, 0.12),
  K("selection", 0.56, 0.12),
  K("selection", 0.64, 1),
  // Evidence: the normal soundscape briefly contracts. (Keys must stay in film order.)
  K("evidence", 0.56, 1),
  K("evidence", 0.62, 0.62),
  K("evidence", 0.8, 1),
  // The breath: a short, controlled reduction immediately before the emblem lands — not digital
  // silence — and the space is back a hair before it arrives, so the identity tone lands in full.
  K("finale", EMBLEM_AT - 0.07, 1),
  K("finale", EMBLEM_AT - 0.045, 0.22),
  K("finale", EMBLEM_AT - 0.012, 0.22),
  K("finale", EMBLEM_AT - 0.003, 1),
];

export function mixAt(p: number): Mix {
  return {
    bed: sampleKeys(BED, p),
    cutoff: sampleKeys(CUTOFF, p),
    tension: sampleKeys(TENSION, p),
    pad: sampleKeys(PAD, p),
    width: sampleKeys(WIDTH, p),
    pulse: sampleKeys(PULSE, p),
    master: sampleKeys(MASTER, p),
  };
}

export type CueKind =
  | "motif"
  | "flyby"
  | "lock"
  | "kernel"
  | "signal"
  | "align"
  | "unlock"
  | "reveal"
  | "evaluate"
  | "compare"
  | "narrow"
  | "resolve"
  | "unfold"
  | "gate"
  | "disruption"
  | "reroute"
  | "stabilize"
  | "handoff"
  | "link"
  | "signature"
  | "wordmark";

export interface Cue {
  at: number;
  kind: CueKind;
  /** 0 → 1: which voice of the cue (pitch / pan / layer). */
  index: number;
  /** For path gates: which phase the traveller is in. */
  phase?: "validate" | "build" | "elevate";
  /** Major cues (reveals, decisions) — never more than one voice of them at once. */
  major?: boolean;
}

const cue = (
  scene: SceneId,
  at: number,
  kind: CueKind,
  index = 0,
  extra: Partial<Pick<Cue, "phase" | "major">> = {},
): Cue => ({ at: progressOf(scene, at), kind, index, ...extra });

function buildCues(): Cue[] {
  // The signature motif: one delicate phrase as the first signal appears in the void.
  const out: Cue[] = [cue("void", 0.17, "motif", 0)];
  // The S assembles in silence over the bed (no flybys, no lock clicks). The Engine is complete: a deep, refined harmonic activation as the kernel lights.
  out.push(cue("awakening", ASSEMBLY.kernel[0] + 0.03, "kernel", 0, { major: true }));
  // The founder's signals are acquired, one by one.
  SIGNALS.forEach((_, i) => {
    const [a, b] = signalWindow(i);
    out.push(cue("context", a + (b - a) * 0.88, "signal", i / 5));
  });
  // The world opens: one wide, warm swell.
  out.push(cue("passage", 0.735, "reveal", 0, { major: true }));
  // The narrowing, stage by stage; the nine; the three.
  [0.04, 0.29, 0.54, 0.86].forEach((at, i) => out.push(cue("convergence", at, "narrow", i / 3)));
  out.push(cue("three", 0.06, "narrow", 1));
  // The near-silent pause, then the one.
  out.push(cue("selection", 0.645, "resolve", 0, { major: true }));
  // The path itself is carried by the bed and the pad (no gate ticks). Evidence: one held tone
  // that loses its footing; the revised path: one resolved chord.
  out.push(cue("evidence", 0.62, "disruption", 0, { major: true }));
  out.push(cue("adaptation", 0.8, "stabilize", 0, { major: true }));
  out.push(cue("handoff", 0.62, "handoff"));
  // The interface's pathways converge where the emblem will form: the identity theme returns as
  // a low, distant fifth (no bright detail — the space is narrowing toward the S).
  out.push(cue("return", 0.45, "motif", 1));
  // The approved emblem lands: ONE restrained identity tone.
  out.push(cue("finale", EMBLEM_AT, "signature", 0, { major: true }));
  // A breath later, SOLVENTIA: the motif, now complete — the tension resolved.
  out.push(cue("finale", NAME_AT, "wordmark", 0, { major: true }));
  return out.sort((a, b) => a.at - b.at);
}

export const CUES: readonly Cue[] = buildCues();

/** Largest progress step that still counts as "playing through" (bigger = a jump: stay quiet). */
export const MAX_STEP = 0.02;
/** A fired cue re-arms only once the visitor is back this far before it (no boundary chatter). */
export const REARM = 0.006;

/**
 * Cues crossed while moving FORWARD from p0 to p1. Scrolling back, or jumping
 * (restoring a position, dragging the scrollbar), is silent — the soundtrack
 * accompanies travel, it never replays a burst of everything skipped.
 */
export function cuesBetween(p0: number, p1: number): Cue[] {
  if (!(p1 > p0) || p1 - p0 > MAX_STEP) return [];
  return CUES.filter((c) => c.at > p0 && c.at <= p1);
}

/**
 * The live gate: forward crossings fire once; a fired cue stays silent until the
 * visitor has moved REARM back before it — so moving back and forth around a
 * scroll boundary never re-triggers a major sound.
 */
export function createCueGate(start: number) {
  const armed = CUES.map((c) => start < c.at);
  let last = start;
  return {
    step(p: number): Cue[] {
      const fired: Cue[] = [];
      for (const c of cuesBetween(last, p)) {
        const i = CUES.indexOf(c);
        if (armed[i]) {
          armed[i] = false;
          fired.push(c);
        }
      }
      CUES.forEach((c, i) => {
        if (!armed[i] && p < c.at - REARM) armed[i] = true;
      });
      last = p;
      return fired;
    },
  };
}
