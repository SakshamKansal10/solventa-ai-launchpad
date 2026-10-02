import type { ProofState } from "@/lib/proof/state";

/**
 * The Command Center's execution path: from "a direction was chosen" to "it
 * grows", read off the founder's REAL assumptions. Each stop owns the
 * assumption categories that belong to it, so its state is whatever the
 * evidence says — never a score or a percentage.
 */

export type PathNodeId =
  "direction" | "problem" | "payment" | "offer" | "delivery" | "repeatability" | "growth";

export type PathStatus = "completed" | "testing" | "contradicted" | "untested" | "none";

export const PATH_NODES: { id: PathNodeId; categories: string[] }[] = [
  { id: "direction", categories: [] },
  { id: "problem", categories: ["problem"] },
  { id: "payment", categories: ["willingness_to_pay", "pricing"] },
  { id: "offer", categories: ["competition", "other"] },
  { id: "delivery", categories: ["delivery"] },
  { id: "repeatability", categories: ["retention"] },
  { id: "growth", categories: ["distribution"] },
];

export function statusOf(states: ProofState[]): PathStatus {
  if (states.length === 0) return "none";
  if (states.some((s) => s === "contradicted")) return "contradicted";
  if (states.every((s) => s === "supported")) return "completed";
  if (states.some((s) => s !== "untested")) return "testing";
  return "untested";
}

export interface PathStop<A> {
  id: PathNodeId;
  items: A[];
  status: PathStatus;
}

/** Stops in path order, plus the index of "you are here": the first stop after
 * the direction that is not yet fully supported (-1 when everything is). */
export function buildPath<A extends { category: string; state: ProofState }>(
  assumptions: A[],
): { stops: PathStop<A>[]; currentIndex: number } {
  const stops = PATH_NODES.map((n) => {
    const items = assumptions.filter((a) => n.categories.includes(a.category));
    const status: PathStatus =
      n.id === "direction" ? "completed" : statusOf(items.map((a) => a.state));
    return { id: n.id, items, status };
  });
  return { stops, currentIndex: stops.findIndex((s, i) => i > 0 && s.status !== "completed") };
}
