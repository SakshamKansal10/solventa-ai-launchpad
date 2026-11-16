/**
 * Estimates and sources (redesign-v2 part 4, feature 6). Every number the AI gives about the
 * market or income is one of two kinds:
 *
 * - `sourced`: it came from a cited search and carries the source's URL and the date it was
 *   looked up (`opportunity_evidence.source_url`, `retrieved_at`);
 * - `estimate`: anything else. The direction generator works without sources, so every number in
 *   a direction (income, starting money, revenue path) is an estimate by construction, and is
 *   stored as such on the direction (`candidate.numberKind`).
 *
 * An estimate is never shown without the Estimate tag.
 */
export type NumberKind = "estimate" | "sourced";

/** What a direction's own numbers are: the generator never cites a source. */
export const DIRECTION_NUMBER_KIND: NumberKind = "estimate";

/** A market evidence row's kind. A stored kind is trusted only when it is consistent: "sourced"
 * needs a URL, so a row without one is always an estimate. */
export function evidenceKind(row: {
  kind?: string | null;
  source_url?: string | null;
}): NumberKind {
  const url = row.source_url?.trim();
  if (!url) return "estimate";
  return row.kind === "estimate" ? "estimate" : "sourced";
}

/** Does this text state a number (Latin or Devanagari digits)? Then, unless it is sourced, it
 * carries the Estimate tag. */
export const hasNumber = (text: string | null | undefined) => /[0-9०-९]/.test(text ?? "");
