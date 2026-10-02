/**
 * Proof state — transparent, deterministic, replayable.
 *
 * There is deliberately NO 0–100 "proof score". An assumption is in exactly one
 * of five states, chosen from the evidence a founder recorded:
 *
 *   untested      no evidence yet
 *   weak          some evidence, not yet enough to lean on (or only a lone
 *                 contradiction, or only neutral notes)
 *   mixed         supporting AND contradicting evidence, no clear winner
 *   supported     enough INDEPENDENT supporting evidence and it clearly outweighs
 *                 anything against it
 *   contradicted  enough independent contradicting evidence and it clearly
 *                 outweighs anything for it
 *
 * Every decision returns a `reason` (code + numbers) so the UI can always answer
 * "why is this state?", and `replayStateHistory` re-runs the rules after each
 * piece of evidence in date order so "why did it change?" has a real answer.
 * AI may summarise evidence elsewhere; it never sets state.
 */

export type ProofState = "untested" | "weak" | "mixed" | "supported" | "contradicted";
export type EvidenceSignal = "supports" | "neutral" | "contradicts";
export type EvidenceType =
  | "interview"
  | "quote"
  | "payment"
  | "observation"
  | "experiment"
  | "analytics"
  | "document"
  | "url"
  | "screenshot"
  | "survey"
  | "other";

export interface EvidenceLike {
  id: string;
  signal: EvidenceSignal;
  evidence_type: EvidenceType;
  source_person?: string | null;
  occurred_on: string;
  created_at?: string;
}

/** How much a single piece of evidence weighs. Money changing hands beats
 * conversations; conversations and measured results beat impressions. */
export const EVIDENCE_STRENGTH: Record<EvidenceType, 1 | 2 | 3> = {
  payment: 3,
  interview: 2,
  quote: 2,
  experiment: 2,
  analytics: 2,
  survey: 2,
  observation: 1,
  document: 1,
  url: 1,
  screenshot: 1,
  other: 1,
};

export const DEFAULT_SUCCESS_THRESHOLD = 3;

export type ReasonCode =
  | "no_evidence"
  | "only_neutral"
  | "few_supporters"
  | "supported_threshold"
  | "contradictions_outweigh"
  | "conflicting"
  | "weak_negative";

export interface StateResult {
  state: ProofState;
  reason: { code: ReasonCode; params: Record<string, number> };
  supporters: number;
  contradictors: number;
  supportWeight: number;
  contradictWeight: number;
}

/** Two items from the same named person are ONE independent source. Items with
 * no named source are each treated as independent (we can't prove otherwise). */
function sourceKey(e: EvidenceLike): string {
  const person = e.source_person?.trim().toLowerCase();
  return person ? `p:${person}` : `id:${e.id}`;
}

function tally(items: EvidenceLike[]) {
  const bySource = new Map<string, number>();
  for (const e of items) {
    const key = sourceKey(e);
    bySource.set(key, Math.max(bySource.get(key) ?? 0, EVIDENCE_STRENGTH[e.evidence_type]));
  }
  let weight = 0;
  for (const w of bySource.values()) weight += w;
  return { independent: bySource.size, weight };
}

export function deriveProofState(
  evidence: EvidenceLike[],
  successThreshold: number = DEFAULT_SUCCESS_THRESHOLD,
): StateResult {
  const T = Math.max(1, successThreshold);
  const sup = tally(evidence.filter((e) => e.signal === "supports"));
  const con = tally(evidence.filter((e) => e.signal === "contradicts"));
  const base = {
    supporters: sup.independent,
    contradictors: con.independent,
    supportWeight: sup.weight,
    contradictWeight: con.weight,
  };

  if (evidence.length === 0) {
    return { ...base, state: "untested", reason: { code: "no_evidence", params: {} } };
  }
  if (sup.independent === 0 && con.independent === 0) {
    return {
      ...base,
      state: "weak",
      reason: { code: "only_neutral", params: { n: evidence.length } },
    };
  }

  if (con.independent >= T && con.weight > 2 * sup.weight) {
    return {
      ...base,
      state: "contradicted",
      reason: {
        code: "contradictions_outweigh",
        params: { c: con.independent, s: sup.independent },
      },
    };
  }
  if (sup.independent >= T && sup.weight > 2 * con.weight) {
    return {
      ...base,
      state: "supported",
      reason: { code: "supported_threshold", params: { n: sup.independent, t: T } },
    };
  }
  if (sup.independent > 0 && con.independent > 0) {
    return {
      ...base,
      state: "mixed",
      reason: { code: "conflicting", params: { s: sup.independent, c: con.independent } },
    };
  }
  if (con.independent > 0) {
    return {
      ...base,
      state: "weak",
      reason: { code: "weak_negative", params: { c: con.independent } },
    };
  }
  return {
    ...base,
    state: "weak",
    reason: { code: "few_supporters", params: { n: sup.independent, t: T } },
  };
}

export interface StateTransition {
  evidenceId: string;
  at: string;
  from: ProofState;
  to: ProofState;
  reason: StateResult["reason"];
}

const chronological = (a: EvidenceLike, b: EvidenceLike) =>
  a.occurred_on.localeCompare(b.occurred_on) ||
  (a.created_at ?? "").localeCompare(b.created_at ?? "") ||
  a.id.localeCompare(b.id);

/** Re-runs the rules after each piece of evidence, oldest first, and returns
 * every point where the state actually changed. */
export function replayStateHistory(
  evidence: EvidenceLike[],
  successThreshold: number = DEFAULT_SUCCESS_THRESHOLD,
): StateTransition[] {
  const ordered = [...evidence].sort(chronological);
  const out: StateTransition[] = [];
  let prev: ProofState = "untested";
  for (let i = 0; i < ordered.length; i++) {
    const res = deriveProofState(ordered.slice(0, i + 1), successThreshold);
    if (res.state !== prev) {
      out.push({
        evidenceId: ordered[i].id,
        at: ordered[i].occurred_on,
        from: prev,
        to: res.state,
        reason: res.reason,
      });
      prev = res.state;
    }
  }
  return out;
}

export const PROOF_STATES: ProofState[] = [
  "untested",
  "weak",
  "mixed",
  "supported",
  "contradicted",
];

export function summarizeStates(states: ProofState[]): Record<ProofState, number> {
  const out: Record<ProofState, number> = {
    untested: 0,
    weak: 0,
    mixed: 0,
    supported: 0,
    contradicted: 0,
  };
  for (const s of states) out[s]++;
  return out;
}
