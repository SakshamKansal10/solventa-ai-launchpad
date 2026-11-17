import type { SupabaseClient } from "@supabase/supabase-js";

import { getSchemaCapabilities, isSchemaMissingError } from "@/lib/schema-capabilities.server";
import type { Database } from "@/lib/supabase/types";

/**
 * One direction-generation job per founder at a time (owner, 2026-11-17, Jobs M and N): the first
 * consultation, "Find 3 more directions" and Ask Sol's "Find new directions". A second request
 * while one runs gets the SAME job back and never starts a second generation; leaving and coming
 * back shows the running job; "Try again" after a failure reuses the failed job.
 *
 * The guarantee lives in the database (migration 0021: a unique index on the founder's running
 * job). Until that migration is applied, an in-process lock gives the same answer within one
 * server instance — the client's own guard (the button disables at the first tap) covers the rest.
 */
export type JobKind = "consultation" | "more" | "refresh";
export type JobStep = "reading" | "fitting" | "writing";
export type JobStatus = "running" | "done" | "failed";

export interface GenerationJob {
  id: string;
  kind: JobKind;
  status: JobStatus;
  step: JobStep;
  createdAt: string;
  updatedAt: string;
  businessDnaId: string | null;
  batchNumber: number | null;
  added: number | null;
  /** A plain error category for the screen (never a raw message). */
  error: string | null;
}

type Db = SupabaseClient<Database>;
type Row = {
  id: string;
  kind: JobKind;
  status: JobStatus;
  step: JobStep;
  created_at: string;
  updated_at: string;
  business_dna_id: string | null;
  batch_number: number | null;
  added: number | null;
  error: string | null;
};

/** A job still "running" after this is dead (the function's limit is 300 s): it is failed, so
 * the founder can try again instead of waiting forever. */
export const STALE_MS = 6 * 60_000;

const toJob = (r: Row): GenerationJob => ({
  id: r.id,
  kind: r.kind,
  status: r.status,
  step: r.step,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  businessDnaId: r.business_dna_id,
  batchNumber: r.batch_number,
  added: r.added,
  error: r.error,
});

const jobs = (db: Db) =>
  (db as unknown as SupabaseClient).from("generation_jobs") as unknown as ReturnType<
    SupabaseClient["from"]
  >;

/** In-process fallback while migration 0021 is not applied. */
const memory = new Map<string, Row & { user_id: string }>();

async function hasTable(db: Db): Promise<boolean> {
  return (await getSchemaCapabilities(db)).generationJobs;
}

const isStale = (r: Row) =>
  r.status === "running" && Date.now() - Date.parse(r.updated_at) > STALE_MS;

async function failStale(db: Db, r: Row): Promise<void> {
  const patch = {
    status: "failed" as const,
    error: "stale",
    finished_at: new Date().toISOString(),
  };
  const mem = memory.get(r.id);
  if (mem) Object.assign(mem, patch, { updated_at: patch.finished_at });
  else await jobs(db).update(patch).eq("id", r.id).eq("status", "running");
}

/** The founder's running job, if any (a dead one is failed on the way). */
export async function runningJob(db: Db, userId: string): Promise<GenerationJob | null> {
  if (!(await hasTable(db))) {
    for (const r of memory.values())
      if (r.user_id === userId && r.status === "running") {
        if (isStale(r)) await failStale(db, r);
        else return toJob(r);
      }
    return null;
  }
  const { data, error } = await jobs(db)
    .select("*")
    .eq("user_id", userId)
    .eq("status", "running")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  if (isStale(data as Row)) {
    await failStale(db, data as Row);
    return null;
  }
  return toJob(data as Row);
}

/** The founder's latest job (running, or finished in the last 15 minutes) — what the generation
 * screen shows when the founder comes back. */
export async function latestJob(db: Db, userId: string): Promise<GenerationJob | null> {
  const running = await runningJob(db, userId);
  if (running) return running;
  const recent = (r: Row) => Date.now() - Date.parse(r.updated_at) < 15 * 60_000;
  if (!(await hasTable(db))) {
    const mine = [...memory.values()]
      .filter((r) => r.user_id === userId && recent(r))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    return mine[0] ? toJob(mine[0]) : null;
  }
  const { data, error } = await jobs(db)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    if (isSchemaMissingError(error)) return null;
    throw new Error(error.message);
  }
  return data && recent(data as Row) ? toJob(data as Row) : null;
}

/**
 * Starts a job — or returns the one already running (`started: false`), whatever its kind.
 * `retryId` restarts that failed job in place instead of creating a new one.
 */
export async function startJob(
  db: Db,
  userId: string,
  kind: JobKind,
  retryId?: string | null,
): Promise<{ job: GenerationJob; started: boolean }> {
  const already = await runningJob(db, userId);
  if (already) return { job: already, started: false };
  const now = new Date().toISOString();

  if (!(await hasTable(db))) {
    const prev = retryId ? memory.get(retryId) : undefined;
    if (prev && prev.user_id === userId && prev.status === "failed") {
      Object.assign(prev, { status: "running", step: "reading", error: null, updated_at: now });
      return { job: toJob(prev), started: true };
    }
    const row = {
      id: crypto.randomUUID(),
      user_id: userId,
      kind,
      status: "running" as const,
      step: "reading" as const,
      created_at: now,
      updated_at: now,
      business_dna_id: null,
      batch_number: null,
      added: null,
      error: null,
    };
    memory.set(row.id, row);
    return { job: toJob(row), started: true };
  }

  if (retryId) {
    const { data: prev } = await jobs(db)
      .select("attempts")
      .eq("id", retryId)
      .eq("user_id", userId)
      .eq("status", "failed")
      .maybeSingle();
    if (prev) {
      const { data, error } = await jobs(db)
        .update({
          status: "running",
          step: "reading",
          error: null,
          updated_at: now,
          finished_at: null,
          attempts: ((prev as { attempts: number }).attempts ?? 1) + 1,
        })
        .eq("id", retryId)
        .eq("status", "failed")
        .select("*")
        .maybeSingle();
      if (data) return { job: toJob(data as Row), started: true };
      if (error && error.code !== "23505") throw new Error(error.message);
      // Another request started a job in between: that one is the job.
      const other = await runningJob(db, userId);
      if (other) return { job: other, started: false };
    }
  }

  const { data, error } = await jobs(db)
    .insert({ user_id: userId, kind, status: "running", step: "reading" })
    .select("*")
    .single();
  if (error?.code === "23505") {
    // A concurrent request won the race: return ITS job, never start a second one.
    const other = await runningJob(db, userId);
    if (other) return { job: other, started: false };
  }
  if (error || !data) throw new Error(error?.message ?? "Could not start the generation");
  return { job: toJob(data as Row), started: true };
}

/** The real step the server is on (shown on the generation screen). Best-effort. */
export async function setJobStep(db: Db, jobId: string, step: JobStep): Promise<void> {
  const now = new Date().toISOString();
  const mem = memory.get(jobId);
  if (mem) {
    Object.assign(mem, { step, updated_at: now });
    return;
  }
  try {
    await jobs(db).update({ step, updated_at: now }).eq("id", jobId).eq("status", "running");
  } catch {
    // The step is a display detail; generation goes on.
  }
}

export async function finishJob(
  db: Db,
  jobId: string,
  result:
    | { status: "done"; businessDnaId?: string | null; batchNumber?: number | null; added?: number }
    | { status: "failed"; error: string },
): Promise<GenerationJob | null> {
  const now = new Date().toISOString();
  const patch =
    result.status === "done"
      ? {
          status: "done" as const,
          business_dna_id: result.businessDnaId ?? null,
          batch_number: result.batchNumber ?? null,
          added: result.added ?? null,
          error: null,
        }
      : { status: "failed" as const, error: result.error };
  const mem = memory.get(jobId);
  if (mem) {
    Object.assign(mem, patch, { updated_at: now });
    return toJob(mem);
  }
  const { data } = await jobs(db)
    .update({ ...patch, updated_at: now, finished_at: now })
    .eq("id", jobId)
    .select("*")
    .maybeSingle();
  return data ? toJob(data as Row) : null;
}

/** A plain category for a failure (the screen shows "Try again", or the daily-limit message). */
export function failureCategory(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/DAILY_LIMIT/.test(msg)) return "limit";
  return "failed";
}

/** Waits (server side) for a running job to end — a second request for the same generation
 * returns the first one's result instead of generating again. */
export async function waitForJob(
  db: Db,
  userId: string,
  jobId: string,
  timeoutMs = 300_000,
): Promise<GenerationJob | null> {
  const until = Date.now() + timeoutMs;
  for (;;) {
    const running = await runningJob(db, userId);
    if (!running || running.id !== jobId || Date.now() > until) break;
    await new Promise((r) => setTimeout(r, 1_500));
  }
  const mem = memory.get(jobId);
  if (mem) return toJob(mem);
  if (!(await hasTable(db))) return null;
  const { data } = await jobs(db).select("*").eq("id", jobId).maybeSingle();
  return data ? toJob(data as Row) : null;
}
