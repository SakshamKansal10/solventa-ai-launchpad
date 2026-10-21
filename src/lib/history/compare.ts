/**
 * Comparing two consultations — only from what each one stored.
 *
 * Every row is a field both consultations recorded (or failed to record). A row
 * is "changed" only when both sides hold a value and the values differ, or when
 * one side has a value and the other has none; two missing values are "unknown",
 * never "the same". Nothing is inferred, averaged or filled in.
 */

import type { Range } from "@/lib/fit/model";

export type { Range };

export interface ConsultationSnapshot {
  status: string | null;
  location: string | null;
  hours: Range | null;
  capital: Range | null;
  currency: string | null;
  scale: string | null;
  skills: string[];
  experienceYears: number | null;
}

export type CompareField =
  "status" | "location" | "hours" | "capital" | "scale" | "skills" | "experienceYears";

export const COMPARE_FIELDS: CompareField[] = [
  "status",
  "location",
  "hours",
  "capital",
  "scale",
  "skills",
  "experienceYears",
];

export type RowState = "same" | "changed" | "unknown";

export interface CompareRow {
  field: CompareField;
  state: RowState;
}

function present(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "string") return v.trim().length > 0;
  return true;
}

function key(field: CompareField, s: ConsultationSnapshot): string {
  const v = s[field as keyof ConsultationSnapshot];
  if (field === "skills") {
    return [...(v as string[])]
      .map((x) => x.trim().toLowerCase())
      .sort()
      .join("|");
  }
  if (field === "hours" || field === "capital") {
    const r = v as Range;
    return `${r.min}-${r.max}${field === "capital" ? (s.currency ?? "") : ""}`;
  }
  return String(v).trim().toLowerCase();
}

export function compareConsultations(
  a: ConsultationSnapshot,
  b: ConsultationSnapshot,
): CompareRow[] {
  return COMPARE_FIELDS.map((field) => {
    const va = a[field as keyof ConsultationSnapshot];
    const vb = b[field as keyof ConsultationSnapshot];
    const pa = present(va);
    const pb = present(vb);
    if (!pa && !pb) return { field, state: "unknown" };
    if (pa !== pb) return { field, state: "changed" };
    return { field, state: key(field, a) === key(field, b) ? "same" : "changed" };
  });
}

export interface DirectionLike {
  title: string;
}

/** Which direction titles appear in only one of the two consultations. */
export function directionDiff(a: DirectionLike[], b: DirectionLike[]) {
  const norm = (t: string) => t.trim().toLowerCase();
  const inA = new Set(a.map((d) => norm(d.title)));
  const inB = new Set(b.map((d) => norm(d.title)));
  return {
    onlyA: a.filter((d) => !inB.has(norm(d.title))).map((d) => d.title),
    onlyB: b.filter((d) => !inA.has(norm(d.title))).map((d) => d.title),
    shared: a.filter((d) => inB.has(norm(d.title))).map((d) => d.title),
  };
}
