/**
 * Repair before validate (go-live step 3). A week's detail used to fail as a whole — "Week 01
 * couldn't be prepared" — when the model overshot one small bound (a 5th step bullet, 25 list
 * rows, a quiz answer of 3, "true" as a string). Those are fixed here, deterministically, before
 * Zod sees the response; anything that cannot be repaired honestly (no tasks, no mission) is left
 * for validation to reject. Pure: no I/O.
 */

const WORKSPACES = ["list", "interviews", "learn", "summary", "generic"] as const;
const CATEGORIES = [
  "problem",
  "willingness_to_pay",
  "distribution",
  "delivery",
  "retention",
  "pricing",
  "competition",
  "other",
] as const;

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

const toStrings = (v: unknown): string[] | null =>
  Array.isArray(v)
    ? v
        .map((x) => (typeof x === "string" ? x.trim() : typeof x === "number" ? String(x) : ""))
        .filter(Boolean)
    : null;

/** An optional string list capped at `max` (null when absent or not a list). */
const capped = (v: unknown, max: number): string[] | null => {
  const s = toStrings(v);
  return s && s.length > 0 ? s.slice(0, max) : null;
};

const toBool = (v: unknown, fallback: boolean): boolean =>
  typeof v === "boolean" ? v : v === "true" ? true : v === "false" ? false : fallback;

const toNum = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number.parseFloat(v) : NaN;
  return Number.isFinite(n) ? n : null;
};

const clampInt = (v: unknown, min: number, max: number): number | null => {
  const n = toNum(v);
  return n === null ? null : Math.min(max, Math.max(min, Math.round(n)));
};

const str = (v: unknown): string | null =>
  typeof v === "string" ? v : typeof v === "number" ? String(v) : null;

export function repairTask(raw: unknown): unknown {
  if (!isObj(raw)) return raw;
  const t: Obj = { ...raw };
  for (const k of ["what", "why", "how", "timeEstimate", "doneWhen"]) {
    const s = str(t[k]);
    if (s !== null) t[k] = s;
  }
  t.resource = str(t.resource);
  t.dependsOn = typeof t.dependsOn === "string" && t.dependsOn.trim() ? t.dependsOn : null;
  t.deadlineDaysFromStart = clampInt(t.deadlineDaysFromStart, 0, 6) ?? 0;
  t.required = toBool(t.required, true);
  t.evidenceRequired = toBool(t.evidenceRequired, false);

  const steps = toStrings(t.steps);
  t.steps = steps && steps.length >= 2 ? steps.slice(0, 4) : undefined;

  t.assumptionCategory =
    typeof t.assumptionCategory === "string" &&
    (CATEGORIES as readonly string[]).includes(t.assumptionCategory)
      ? t.assumptionCategory
      : t.assumptionCategory == null
        ? null
        : "other";
  t.workspace =
    typeof t.workspace === "string" && (WORKSPACES as readonly string[]).includes(t.workspace)
      ? t.workspace
      : "generic";
  t.workspaceTarget = t.workspaceTarget == null ? null : clampInt(t.workspaceTarget, 1, 20);
  t.firstMessageEn = str(t.firstMessageEn);
  t.firstMessageHi = str(t.firstMessageHi);
  t.questions = capped(t.questions, 5);
  t.lesson = capped(t.lesson, 5);
  t.prompts = capped(t.prompts, 3);

  // The quiz only survives whole: three questions, nine options, three answers in 0-2.
  const qq = capped(t.quizQuestions, 3);
  const qo = capped(t.quizOptions, 9);
  const qa = Array.isArray(t.quizAnswers)
    ? t.quizAnswers.map((a) => clampInt(a, 0, 2)).filter((a): a is number => a !== null)
    : null;
  const quizOk = qq && qo && qa && qo.length >= qq.length * 3 && qa.length >= qq.length;
  t.quizQuestions = quizOk ? qq : null;
  t.quizOptions = quizOk ? qo : null;
  t.quizAnswers = quizOk ? qa.slice(0, 3) : null;

  t.fallback = str(t.fallback);
  return t;
}

/** The whole week: tasks capped at 5, mistakes at 3, evidence target in 0-50. */
export function repairWeekDetail(raw: unknown): unknown {
  if (!isObj(raw)) return raw;
  const w: Obj = { ...raw };
  if (Array.isArray(w.tasks)) w.tasks = w.tasks.filter(isObj).slice(0, 5).map(repairTask);
  const mistakes = toStrings(w.mistakesToAvoid);
  if (mistakes) w.mistakesToAvoid = mistakes.slice(0, 3);
  for (const k of ["mission", "evidenceRequired", "successThreshold"]) {
    const s = str(w[k]);
    if (s !== null) w[k] = s;
  }
  w.evidenceTarget = w.evidenceTarget == null ? null : clampInt(w.evidenceTarget, 0, 50);
  w.adaptationNote = str(w.adaptationNote);
  return w;
}
