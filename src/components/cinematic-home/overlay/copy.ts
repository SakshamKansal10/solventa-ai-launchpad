import { progressOf, type SceneId } from "../timeline/timeline";
import { SIGNALS } from "../world/context/context-model";
import { WEIGHTS } from "../world/universe/scoring";

/**
 * Every word the cinematic homepage shows, and exactly when. Minimal by
 * design: the visuals carry the story, the copy only names it. Pure data.
 */
export type Span = [SceneId, number, SceneId, number];

export interface Caption {
  id: string;
  kind: "statement" | "title" | "line" | "quiet" | "finale";
  text: string;
  sub?: string;
  span: Span;
  place: "lower" | "upper" | "centre" | "bottom";
}

export const CAPTIONS: Caption[] = [
  {
    id: "void",
    kind: "statement",
    text: "Every founder begins with uncertainty.",
    span: ["void", 0.12, "awakening", 0.18],
    place: "lower",
  },
  {
    id: "awakening",
    kind: "statement",
    text: "There is a direction hidden inside your reality.",
    span: ["awakening", 0.55, "context", 0.1],
    place: "lower",
  },
  {
    id: "context",
    kind: "line",
    text: "Solventia starts with you.",
    sub: "Illustrative founder profile",
    span: ["context", 0.04, "context", 0.96],
    place: "upper",
  },
  {
    id: "universe",
    kind: "quiet",
    text: "Hundreds of possible directions.",
    span: ["universe", 0.25, "computation", 0.06],
    place: "lower",
  },
  {
    id: "computation",
    kind: "line",
    text: "Your context reshapes every one of them.",
    span: ["computation", 0.06, "computation", 0.95],
    place: "upper",
  },
  {
    id: "selection",
    kind: "statement",
    text: "One direction worth testing.",
    span: ["selection", 0.7, "unfold", 0.22],
    place: "bottom",
  },
  {
    id: "validate",
    kind: "title",
    text: "Validate",
    sub: "Discover what reality supports.",
    span: ["validate", 0.02, "validate", 0.9],
    place: "upper",
  },
  {
    id: "build",
    kind: "title",
    text: "Build",
    sub: "Turn evidence into execution.",
    span: ["build", 0.02, "build", 0.9],
    place: "upper",
  },
  {
    id: "elevate",
    kind: "title",
    text: "Elevate",
    sub: "Improve what proves valuable.",
    span: ["elevate", 0.02, "elevate", 0.92],
    place: "upper",
  },
  {
    id: "evidence",
    kind: "statement",
    text: "Plans are assumptions until reality responds.",
    span: ["crisis", 0.22, "adaptation", 0.12],
    place: "lower",
  },
  {
    id: "adaptation",
    kind: "statement",
    text: "The path changes when the evidence changes.",
    span: ["adaptation", 0.5, "handoff", 0.25],
    place: "lower",
  },
  {
    id: "connected",
    kind: "statement",
    text: "A chatbot answers.",
    sub: "Solventia carries the journey forward.",
    span: ["connected", 0.32, "return", 0.4],
    place: "upper",
  },
  {
    id: "finale",
    kind: "finale",
    text: "Find the direction worth building.",
    sub: "Your reality. Your evidence. Your path forward.",
    // Staged inside one composition (identity → line → promise → CTA), then a protected hold.
    span: ["finale", 0.3, "finale", 1.01],
    place: "bottom",
  },
];

/** Opacity of a caption at progress p: eased in over the first 16%, out over the last 16%. */
export function captionOpacity(c: Caption, p: number): number {
  const a = progressOf(c.span[0], c.span[1]);
  const b = c.span[3] > 1 ? 1.01 : progressOf(c.span[2], c.span[3]);
  if (p <= a || p >= b) return 0;
  const edge = Math.max(0.004, (b - a) * 0.16);
  const fin = Math.min(1, (p - a) / edge);
  const fout = b >= 1 ? 1 : Math.min(1, (b - p) / edge);
  const t = Math.min(fin, fout);
  return t * t * (3 - 2 * t);
}

/** Labels that follow a point in the world (anchor id → text). */
export const LABELS: {
  anchor: string;
  text: string;
  sub?: string;
  kind: "tag" | "quote" | "direction";
}[] = [
  // Each founder signal is named with its weight in the (illustrative) model.
  ...SIGNALS.map((s) => ({
    anchor: `signal-${s.id}`,
    text: `${s.label} · w ${WEIGHTS[s.id].toFixed(2).slice(1)}`,
    sub: s.value,
    kind: "tag" as const,
  })),
  // The five territories of the universe (visual categories of the demonstration).
  { anchor: "territory-A", text: "Capability alignment", kind: "tag" },
  { anchor: "territory-B", text: "Capital feasibility", sub: "Threshold · ₹50,000", kind: "tag" },
  { anchor: "territory-C", text: "Market access", kind: "tag" },
  { anchor: "territory-D", text: "Execution complexity", kind: "tag" },
  { anchor: "territory-E", text: "Emerging possibilities", kind: "tag" },
  { anchor: "finalist-0", text: "Direction 01", kind: "direction" },
  { anchor: "finalist-1", text: "Direction 02", kind: "direction" },
  { anchor: "finalist-2", text: "Direction 03", kind: "direction" },
  { anchor: "milestone-0", text: "Speak to potential customers", kind: "tag" },
  { anchor: "milestone-1", text: "Test the problem", kind: "tag" },
  { anchor: "milestone-2", text: "Test willingness to pay", kind: "tag" },
  { anchor: "milestone-3", text: "Create first prototype", kind: "tag" },
  { anchor: "milestone-4", text: "Gather early feedback", kind: "tag" },
  { anchor: "milestone-5", text: "Improve the offering", kind: "tag" },
  {
    anchor: "evidence",
    text: "“I wouldn’t pay for this version.”",
    sub: "Illustrative customer response",
    kind: "quote",
  },
  { anchor: "isolated", text: "An isolated answer", sub: "No context · no history", kind: "tag" },
  { anchor: "chain-0", text: "Context", kind: "tag" },
  { anchor: "chain-1", text: "Opportunity", kind: "tag" },
  { anchor: "chain-2", text: "Evidence", kind: "tag" },
  { anchor: "chain-3", text: "Path", kind: "tag" },
  { anchor: "chain-4", text: "Progress", kind: "tag" },
];

/** The context waves re-entering the universe (computation): label per wave. */
export const WAVE_LABELS = SIGNALS.map((s, k) => ({
  id: `wave-${s.id}`,
  text: `${s.label} · ${s.value}`,
  span: ["computation", 0.04 + k * 0.115, "computation", 0.2 + k * 0.115] as Span,
}));
