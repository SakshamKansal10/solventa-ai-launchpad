import { progressOf, type SceneId } from "../timeline/timeline";
import { SIGNALS, signalWindow } from "../world/context/context-model";

/**
 * Every word the cinematic homepage shows, and exactly when. ONE dominant idea per viewport, set
 * as editorial type: a few deliberate lines (uppercase, very large), at most a small kicker above
 * and one quiet line below. Words wrapped in *asterisks* carry the champagne accent — only where
 * the story reaches conviction. Pure data.
 *
 * The journey: identity → your reality → 360 possibilities → three → one → validate → evidence →
 * the product → don't guess → the finale. (The opening identity is the brand lockup itself — see
 * BrandOpening — not a caption.)
 */
export type Span = [SceneId, number, SceneId, number];

export interface Caption {
  id: string;
  /**
   * statement — a major editorial statement
   * datum     — one founder signal, read large (value) under its label
   * quote     — a voice from the world (sentence case, never shouted)
   * finale    — the closing composition
   */
  kind: "statement" | "datum" | "quote" | "finale";
  /** "medium": a statement that shares the frame with one large object (a narrower column). */
  size?: "major" | "medium";
  /** Small line above the statement (chapter, or a datum's label). */
  kicker?: string;
  /** Semantic accent of the kicker mark: violet = reasoning, gold = conviction, pearl = clarity. */
  tone?: "violet" | "gold" | "pearl";
  /** The statement, one entry per deliberate line. */
  lines: string[];
  sub?: string;
  /** "note": the supporting line is a small label (e.g. "illustrative"). */
  subTone?: "quiet" | "note";
  /** A kicker made of stages (Validate · Build · Elevate), every stage equal. */
  stages?: string[];
  /** Where a reasoning (violet) kicker resolves to conviction (champagne): [scene, local]. */
  resolveAt?: [SceneId, number];
  span: Span;
  /**
   * low  — the editorial block, bottom-left on the page grid
   * top  — top-left, under the site bar (where the scene fills the lower frame)
   * end  — the finale composition
   */
  place: "low" | "top" | "end";
  /** A founder-signal caption: which signal, so it carries that signal's semantic icon. */
  signal?: (typeof SIGNALS)[number]["id"];
}

/** Each founder signal's value as deliberate lines (set very large, one data point at a time). */
const DATUM_LINES: Record<(typeof SIGNALS)[number]["id"], string[]> = {
  capital: ["₹50,000"],
  skills: ["Digital", "development"],
  location: ["India"],
  time: ["12 hours", "a week"],
  experience: ["Beginner"],
  access: ["Limited"],
};

/** The founder signals, each read on its own while it is acquired (one data point at a time). */
const DATA: Caption[] = SIGNALS.map((s, i) => {
  const [a] = signalWindow(i);
  const next = i < SIGNALS.length - 1 ? signalWindow(i + 1)[0] : 0.86;
  return {
    id: `datum-${s.id}`,
    kind: "datum",
    kicker: `${String(i + 1).padStart(2, "0")} / ${String(SIGNALS.length).padStart(2, "0")} · ${s.label}`,
    lines: DATUM_LINES[s.id],
    span: ["context", a + 0.1, "context", next + 0.1],
    place: "low",
    signal: s.id,
  };
});

export const CAPTIONS: Caption[] = [
  {
    id: "awakening",
    kind: "statement",
    lines: ["Your", "reality.", "Made", "*actionable*."],
    size: "medium",
    span: ["awakening", 0.6, "context", 0.1],
    place: "low",
  },
  {
    id: "context",
    kind: "statement",
    kicker: "Your reality",
    tone: "pearl",
    lines: [],
    sub: "Illustrative founder profile",
    subTone: "note",
    span: ["context", 0.12, "context", 0.96],
    place: "top",
  },
  ...DATA,
  {
    id: "universe",
    kind: "statement",
    kicker: "Possibilities",
    tone: "violet",
    lines: ["360", "possibilities."],
    span: ["universe", 0.2, "universe", 0.96],
    place: "low",
  },
  {
    id: "computation",
    kind: "statement",
    kicker: "Possibilities",
    tone: "violet",
    lines: ["Your reality", "narrows them."],
    span: ["computation", 0.04, "computation", 0.64],
    place: "low",
  },
  {
    id: "three",
    kind: "statement",
    kicker: "Three remain",
    tone: "violet",
    lines: ["3 directions."],
    span: ["three", 0.12, "three", 0.6],
    place: "low",
  },
  {
    id: "selection",
    kind: "statement",
    kicker: "One direction",
    tone: "gold",
    lines: ["*One* worth", "testing."],
    span: ["selection", 0.38, "unfold", 0.3],
    place: "top",
  },
  {
    id: "validate",
    kind: "statement",
    stages: ["Validate", "Build", "Elevate"],
    lines: ["Prove it", "before you", "build it."],
    span: ["validate", 0.06, "elevate", 0.72],
    place: "low",
  },
  {
    id: "evidence",
    kind: "quote",
    lines: ["“I wouldn’t pay", "for this version.”"],
    sub: "Illustrative customer response",
    subTone: "note",
    span: ["evidence", 0.3, "crisis", 0.26],
    place: "top",
  },
  {
    id: "adaptation",
    kind: "statement",
    kicker: "Evidence",
    tone: "violet",
    // Violet while the system recalculates; champagne once the new route holds.
    resolveAt: ["adaptation", 0.78],
    lines: ["Evidence changes.", "Your path *adapts*."],
    span: ["crisis", 0.3, "adaptation", 0.94],
    place: "low",
  },
  {
    id: "connected",
    kind: "statement",
    lines: ["Don’t guess", "what to build", "next."],
    sub: "Your context, evidence and progress stay connected.",
    subTone: "quiet",
    span: ["connected", 0.36, "return", 0.04],
    place: "low",
  },
  {
    id: "finale",
    kind: "finale",
    lines: ["Find the direction *worth building*."],
    // Staged inside one composition — the trajectories resolve on the approved emblem; then the
    // wordmark, the signature, the line and the CTA — then a protected hold.
    span: ["finale", 0, "finale", 1.01],
    place: "end",
  },
];

/**
 * The finale's reveal runs across this part of its scene (finale-local): the trajectories draw
 * in (0 → 0.32 of the reveal), the emblem lands (≈ 0.3), then the wordmark, the signature, the
 * line and the CTA. The score's identity tone is pinned to the emblem's arrival.
 */
export const FINALE_REVEAL = { from: 0, to: 0.7 } as const;
/** Finale-local position of a point of the reveal (0 → 1). */
export const finaleAt = (r: number) =>
  FINALE_REVEAL.from + (FINALE_REVEAL.to - FINALE_REVEAL.from) * r;

/** A line split into plain and accented (champagne) runs: "*One* worth testing." */
export function accentRuns(text: string): { text: string; accent: boolean }[] {
  return text
    .split("*")
    .map((t, i) => ({ text: t, accent: i % 2 === 1 }))
    .filter((r) => r.text.length > 0);
}

/** The statement without its accent marks (for measuring, tests and assistive text). */
export const plainText = (text: string) => text.replaceAll("*", "");

/** A caption's statement as one plain sentence. */
export const captionText = (c: Caption) => plainText(c.lines.join(" "));

/**
 * Presence of a caption at progress p (0 → 1): rises over the first 16% of its span and falls
 * over the last 16% — capped, so a long-held statement still arrives as briskly as a short one.
 * The overlay turns this into a masked, line-by-line reveal (never a fade to nothing).
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
 * The narrowing count: one very large figure that replaces the statements while the
 * possibilities fall away (360 → 120 → 36 → 9), so the reduction is read as a number, not
 * inferred. The three that remain are then named (“3 directions.”).
 */
export const COUNT_SPAN: Span = ["computation", 0.7, "three", 0.1];
export const COUNT_LABEL = "directions still fit";

/**
 * Labels that follow a point in the world (anchor id → text). Only what carries meaning once the
 * statements have said the rest: three milestones on the path.
 */
export interface WorldLabelDef {
  anchor: string;
  /** step — a milestone on the path */
  kind: "step";
  text: string;
}

export const LABELS: WorldLabelDef[] = [
  { anchor: "milestone-0", kind: "step", text: "Speak to customers" },
  { anchor: "milestone-2", kind: "step", text: "Test willingness to pay" },
  { anchor: "milestone-3", kind: "step", text: "Build a first prototype" },
];
