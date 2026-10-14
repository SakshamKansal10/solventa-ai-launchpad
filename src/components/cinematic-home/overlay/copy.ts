import { progressOf, type SceneId } from "../timeline/timeline";
import { SIGNALS } from "../world/context/context-model";

/**
 * Every word the cinematic homepage shows, and exactly when. One message per moment, set large
 * enough to be read while scrolling: an optional chapter kicker (where in the journey we are),
 * the statement, and at most one short supporting line. Words wrapped in *asterisks* carry the
 * champagne accent — used only where the story reaches conviction. Pure data.
 *
 * The journey: your reality → possibilities → one direction → validate → evidence → next move.
 */
export type Span = [SceneId, number, SceneId, number];

export interface Caption {
  id: string;
  kind: "statement" | "finale";
  /** The chapter of the journey this moment belongs to (small, above the statement). */
  kicker?: string;
  /** Semantic accent of the kicker mark: violet = reasoning, gold = conviction, pearl = clarity. */
  tone?: "violet" | "gold" | "pearl";
  text: string;
  sub?: string;
  /** "accent": the supporting line carries the champagne accent instead of the quiet grey. */
  subTone?: "quiet" | "accent" | "note";
  /**
   * A kicker made of stages (Validate · Build · Elevate): only the stage being travelled is lit
   * (champagne), the one behind it settles, the ones ahead stay quiet. Each entry: the stage's
   * name and the scene it belongs to.
   */
  stages?: { label: string; scene: SceneId }[];
  /** Where a reasoning (violet) kicker resolves to conviction (champagne): [scene, local]. */
  resolveAt?: [SceneId, number];
  span: Span;
  /** "title": the statement block in the lower third; "end": the finale composition. */
  place: "title" | "end";
}

export const CAPTIONS: Caption[] = [
  {
    id: "void",
    kind: "statement",
    text: "Every founder begins with uncertainty.",
    span: ["void", 0.12, "awakening", 0.16],
    place: "title",
  },
  {
    id: "awakening",
    kind: "statement",
    text: "Solventia turns uncertainty into *direction*.",
    span: ["awakening", 0.5, "context", 0.06],
    place: "title",
  },
  {
    id: "context",
    kind: "statement",
    kicker: "Your reality",
    tone: "pearl",
    text: "It starts with your real situation.",
    sub: "Illustrative founder profile",
    subTone: "note",
    span: ["context", 0.16, "context", 0.74],
    place: "title",
  },
  {
    id: "universe",
    kind: "statement",
    kicker: "Possibilities",
    tone: "violet",
    text: "Hundreds of possible directions.",
    span: ["universe", 0.22, "universe", 0.96],
    place: "title",
  },
  {
    id: "computation",
    kind: "statement",
    kicker: "Possibilities",
    tone: "violet",
    text: "Your reality narrows them.",
    span: ["computation", 0.04, "computation", 0.64],
    place: "title",
  },
  {
    id: "selection",
    kind: "statement",
    kicker: "One direction",
    tone: "gold",
    text: "*One* direction worth testing.",
    span: ["selection", 0.6, "unfold", 0.22],
    place: "title",
  },
  {
    id: "validate",
    kind: "statement",
    stages: [
      { label: "Validate", scene: "validate" },
      { label: "Build", scene: "build" },
      { label: "Elevate", scene: "elevate" },
    ],
    text: "Prove it before you build it.",
    span: ["validate", 0.06, "elevate", 0.72],
    place: "title",
  },
  {
    id: "adaptation",
    kind: "statement",
    kicker: "Evidence",
    tone: "violet",
    // Violet while the system recalculates; champagne once the new route holds.
    resolveAt: ["adaptation", 0.78],
    text: "When evidence changes, your path changes.",
    span: ["crisis", 0.28, "adaptation", 0.94],
    place: "title",
  },
  {
    id: "connected",
    kind: "statement",
    text: "It doesn’t stop at the idea.",
    sub: "Your context, evidence and progress stay connected.",
    subTone: "quiet",
    span: ["connected", 0.16, "return", 0.36],
    place: "title",
  },
  {
    id: "finale",
    kind: "finale",
    text: "Find the direction *worth building*.",
    sub: "Your reality. Your evidence. Your path forward.",
    // Staged inside one composition — the S completes alone first; then the wordmark, the
    // promise, the line and the CTA — then a protected hold.
    span: ["finale", 0.36, "finale", 1.01],
    place: "end",
  },
];

/** A statement split into plain and accented (champagne) runs: "*One direction* worth testing." */
export function accentRuns(text: string): { text: string; accent: boolean }[] {
  return text
    .split("*")
    .map((t, i) => ({ text: t, accent: i % 2 === 1 }))
    .filter((r) => r.text.length > 0);
}

/** The statement without its accent marks (for measuring, tests and assistive text). */
export const plainText = (text: string) => text.replaceAll("*", "");

/**
 * Opacity of a caption at progress p: eased in over the first 16%, out over the last 16% —
 * capped, so a long-held statement still arrives as briskly as a short one and is fully legible
 * for most of its span.
 */
export function captionOpacity(c: Caption, p: number): number {
  const a = progressOf(c.span[0], c.span[1]);
  const b = c.span[3] > 1 ? 1.01 : progressOf(c.span[2], c.span[3]);
  if (p <= a || p >= b) return 0;
  const edge = Math.min(0.009, Math.max(0.004, (b - a) * 0.16));
  const fin = Math.min(1, (p - a) / edge);
  const fout = b >= 1 ? 1 : Math.min(1, (b - p) / edge);
  const t = Math.min(fin, fout);
  return t * t * (3 - 2 * t);
}

/**
 * The narrowing count: one large figure that replaces the statements while the possibilities
 * fall away (360 → 120 → 36 → 9 → 3), so the reduction is read as a number, not inferred.
 */
// …and it stays on the last three while they are compared, so the comparison is never mute.
export const COUNT_SPAN: Span = ["computation", 0.7, "selection", 0.3];
export const COUNT_LABEL = "directions still fit";

/**
 * Labels that follow a point in the world (anchor id → text). Only what carries meaning: the
 * founder's six signals, the three directions and their fit, three milestones and the evidence.
 */
export interface WorldLabelDef {
  anchor: string;
  /**
   * signal    — a founder signal: small category, large value
   * direction — a future's name
   * fit       — a comparison result (the value) with what failed (the label)
   * step      — a milestone on the path
   * quote     — the evidence itself
   */
  kind: "signal" | "direction" | "fit" | "step" | "quote";
  text: string;
  sub?: string;
  /** The chosen direction and its readout carry the conviction accent. */
  chosen?: boolean;
}

/**
 * Three levels only, everywhere: the statement (largest), the VALUE or result (clearly readable),
 * the LABEL (small, crisp). Values dominate their labels.
 */
export const LABELS: WorldLabelDef[] = [
  ...SIGNALS.map((s) => ({
    anchor: `signal-${s.id}`,
    kind: "signal" as const,
    text: s.label,
    sub: s.value,
  })),
  // Priority order (overlapping labels yield to earlier ones): the one and its readout first.
  { anchor: "finalist-1", kind: "direction", text: "Direction 02", chosen: true },
  { anchor: "fit-1", kind: "fit", text: "6 of 6 signals hold", chosen: true },
  { anchor: "finalist-0", kind: "direction", text: "Direction 01" },
  { anchor: "finalist-2", kind: "direction", text: "Direction 03" },
  // The comparison's result, under each future, once the six signals have landed.
  { anchor: "fit-0", kind: "fit", text: "4 of 6 signals hold", sub: "Capital · access fail" },
  { anchor: "fit-2", kind: "fit", text: "4 of 6 signals hold", sub: "Time · experience fail" },
  { anchor: "milestone-0", kind: "step", text: "Speak to customers" },
  { anchor: "milestone-2", kind: "step", text: "Test willingness to pay" },
  { anchor: "milestone-3", kind: "step", text: "Build a first prototype" },
  {
    anchor: "evidence",
    text: "“I wouldn’t pay for this version.”",
    sub: "Illustrative customer response",
    kind: "quote",
  },
];
