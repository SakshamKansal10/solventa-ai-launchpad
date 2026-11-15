import { z } from "zod";

/**
 * Mission workspaces (redesign-v2 part 4): what a mission page shows under its headline, what the
 * founder produces there, and the rule that decides when "Mark as done" unlocks. Pure — the same
 * code runs on the server (validation) and in the page (the gate and its reason).
 */

export const WORKSPACE_TYPES = ["list", "interviews", "learn", "summary", "generic"] as const;
export type WorkspaceType = (typeof WORKSPACE_TYPES)[number];

export const workspaceSpecSchema = z.object({
  /** list: how many rows the mission asks for, and what each row records. */
  target: z.number().int().min(1).max(50).optional(),
  /** interviews: the first message to send (both languages), 3–5 open questions, one rule. */
  firstMessage: z.object({ en: z.string().min(1), hi: z.string().min(1) }).optional(),
  questions: z.array(z.string().min(1)).max(6).optional(),
  rule: z.string().optional(),
  /** learn: a short lesson in 3–5 points and a 3-question check. */
  lesson: z.array(z.string().min(1)).max(6).optional(),
  quiz: z
    .array(
      z.object({
        q: z.string().min(1),
        options: z.array(z.string().min(1)).min(2).max(4),
        answer: z.number().int().min(0).max(3),
      }),
    )
    .max(5)
    .optional(),
  /** summary: 2–3 prompts for "what I learned". */
  prompts: z.array(z.string().min(1)).max(4).optional(),
});
export type WorkspaceSpec = z.infer<typeof workspaceSpecSchema>;

export const DONE_METRICS = [
  "list.count",
  "interviews.count",
  "quiz.correct",
  "summary.filled",
  "note.filled",
] as const;
export type DoneMetric = (typeof DONE_METRICS)[number];

export const doneRuleSchema = z.object({
  metric: z.enum(DONE_METRICS),
  min: z.number().int().min(1).max(50),
});
export type DoneRule = z.infer<typeof doneRuleSchema>;

export type EntryKind = "list_row" | "interview" | "quiz" | "note" | "summary";
/** What an entry holds: small, flat values typed by the founder. */
export type EntryValue = string | number | boolean | (string | number)[];
export interface MissionEntry {
  id: string;
  kind: EntryKind;
  data: Record<string, EntryValue>;
  createdAt: string;
}

const filled = (v: unknown) => typeof v === "string" && v.trim().length > 0;

/** The value a done rule measures, from what the founder produced. */
export function metricValue(
  metric: DoneMetric,
  entries: readonly MissionEntry[],
  spec?: WorkspaceSpec | null,
): number {
  switch (metric) {
    case "list.count":
      // A row counts once it names someone.
      return entries.filter((e) => e.kind === "list_row" && filled(e.data.name)).length;
    case "interviews.count":
      return entries.filter((e) => e.kind === "interview").length;
    case "quiz.correct": {
      const latest = entries.filter((e) => e.kind === "quiz").at(-1);
      const answers = (latest?.data.answers as number[] | undefined) ?? [];
      return (spec?.quiz ?? []).filter((q, i) => answers[i] === q.answer).length;
    }
    case "summary.filled": {
      const latest = entries.filter((e) => e.kind === "summary").at(-1);
      const answers = (latest?.data.answers as string[] | undefined) ?? [];
      return answers.filter(filled).length;
    }
    case "note.filled":
      return entries.filter((e) => e.kind === "note" && filled(e.data.text)).length;
  }
}

export interface DoneGate {
  met: boolean;
  have: number;
  need: number;
  metric: DoneMetric | null;
}

/** Whether "Mark as done" may be pressed. A mission without a rule is never gated. */
export function evaluateDoneRule(
  rule: DoneRule | null | undefined,
  entries: readonly MissionEntry[],
  spec?: WorkspaceSpec | null,
): DoneGate {
  if (!rule) return { met: true, have: 0, need: 0, metric: null };
  const have = metricValue(rule.metric, entries, spec);
  return { met: have >= rule.min, have, need: rule.min, metric: rule.metric };
}

/** Parses stored jsonb defensively: a malformed spec or rule means "generic, ungated". */
export function readWorkspace(raw: {
  workspace?: unknown;
  workspace_spec?: unknown;
  done_rule?: unknown;
  fallback?: unknown;
}): {
  type: WorkspaceType;
  spec: WorkspaceSpec | null;
  rule: DoneRule | null;
  fallback: string | null;
} {
  const type = (WORKSPACE_TYPES as readonly string[]).includes(String(raw.workspace))
    ? (raw.workspace as WorkspaceType)
    : "generic";
  const spec = workspaceSpecSchema.safeParse(raw.workspace_spec ?? {});
  const rule = doneRuleSchema.safeParse(raw.done_rule);
  return {
    type,
    spec: spec.success ? spec.data : null,
    rule: rule.success ? rule.data : null,
    fallback: typeof raw.fallback === "string" && raw.fallback.trim() ? raw.fallback : null,
  };
}
