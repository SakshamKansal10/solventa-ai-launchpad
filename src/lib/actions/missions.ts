import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import {
  evaluateDoneRule,
  readWorkspace,
  type DoneGate,
  type EntryKind,
  type EntryValue,
  type MissionEntry,
  type WorkspaceSpec,
  type WorkspaceType,
} from "@/lib/missions/workspace";
import { getSchemaCapabilities } from "@/lib/schema-capabilities.server";
import { requireUser } from "@/lib/supabase/server";

/**
 * Mission workspaces (redesign-v2 part 4, feature 1): what a mission page shows under its
 * headline and what the founder produced there. Until migration 0015 is applied the workspace is
 * `available: false` and the mission page keeps its plain steps (nothing breaks).
 */

export interface MissionWorkspaceDTO {
  available: boolean;
  type: WorkspaceType;
  spec: WorkspaceSpec | null;
  fallback: string | null;
  entries: MissionEntry[];
  gate: DoneGate;
  /** Names from the founder's own lists in this roadmap — interviews pick from them. */
  listNames: string[];
}

const ENTRY_KINDS = ["list_row", "interview", "quiz", "note", "summary"] as const;

// mission_entries is newer than the generated database types.
const db = (supabase: unknown) => supabase as SupabaseClient;

const toEntry = (r: {
  id: string;
  kind: string;
  data: unknown;
  created_at: string;
}): MissionEntry => ({
  id: r.id,
  kind: r.kind as EntryKind,
  data: (r.data && typeof r.data === "object" ? r.data : {}) as Record<string, EntryValue>,
  createdAt: r.created_at,
});

export const getMissionWorkspace = createServerFn({ method: "GET" })
  .validator(z.object({ taskId: z.string().uuid() }))
  .handler(async ({ data }): Promise<MissionWorkspaceDTO> => {
    const { supabase, user } = await requireUser();
    const caps = await getSchemaCapabilities(supabase);
    const empty: MissionWorkspaceDTO = {
      available: false,
      type: "generic",
      spec: null,
      fallback: null,
      entries: [],
      gate: { met: true, have: 0, need: 0, metric: null },
      listNames: [],
    };
    if (!caps.missionWorkspaces) return empty;

    const { data: task, error } = await db(supabase)
      .from("roadmap_tasks")
      .select("id, week_id, workspace, workspace_spec, done_rule, fallback")
      .eq("id", data.taskId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!task) throw new Error("Mission not found");
    const ws = readWorkspace(task);

    const { data: rows, error: entriesError } = await db(supabase)
      .from("mission_entries")
      .select("id, kind, data, created_at")
      .eq("task_id", data.taskId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    if (entriesError) throw new Error(entriesError.message);
    const entries = (rows ?? []).map(toEntry);

    // The founder's own lists (any mission of theirs): the people an interview can be with.
    let listNames: string[] = [];
    if (ws.type === "interviews") {
      const { data: lists } = await db(supabase)
        .from("mission_entries")
        .select("data")
        .eq("user_id", user.id)
        .eq("kind", "list_row")
        .order("created_at", { ascending: true })
        .limit(200);
      listNames = Array.from(
        new Set(
          (lists ?? [])
            .map((l) => String((l.data as { name?: unknown })?.name ?? "").trim())
            .filter(Boolean),
        ),
      );
    }

    return {
      available: true,
      type: ws.type,
      spec: ws.spec,
      fallback: ws.fallback,
      entries,
      gate: evaluateDoneRule(ws.rule, entries, ws.spec),
      listNames,
    };
  });

/** Saves one entry (a list row, an interview log, a quiz attempt, a note or a summary). With an
 * id it updates that entry; without, it adds one. Returns the saved entry. */
export const saveMissionEntry = createServerFn({ method: "POST" })
  .validator(
    z.object({
      taskId: z.string().uuid(),
      id: z.string().uuid().optional(),
      kind: z.enum(ENTRY_KINDS),
      // Small, flat records typed by the founder: strings, numbers, booleans, number arrays.
      data: z.record(
        z.string().max(40),
        z.union([
          z.string().max(2000),
          z.number(),
          z.boolean(),
          z.array(z.union([z.number(), z.string().max(2000)])).max(10),
        ]),
      ),
    }),
  )
  .handler(async ({ data }): Promise<MissionEntry> => {
    const { supabase, user } = await requireUser();
    const caps = await getSchemaCapabilities(supabase);
    if (!caps.missionWorkspaces) throw new Error("Mission workspaces are not available yet");
    const now = new Date().toISOString();
    if (data.id) {
      const { data: row, error } = await db(supabase)
        .from("mission_entries")
        .update({ data: data.data, updated_at: now })
        .eq("id", data.id)
        .eq("user_id", user.id)
        .select("id, kind, data, created_at")
        .single();
      if (error) throw new Error(error.message);
      return toEntry(row);
    }
    const { data: row, error } = await db(supabase)
      .from("mission_entries")
      .insert({ user_id: user.id, task_id: data.taskId, kind: data.kind, data: data.data })
      .select("id, kind, data, created_at")
      .single();
    if (error) throw new Error(error.message);
    return toEntry(row);
  });

export const deleteMissionEntry = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { supabase, user } = await requireUser();
    const { error } = await db(supabase)
      .from("mission_entries")
      .delete()
      .eq("id", data.id)
      .eq("user_id", user.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/**
 * "Stuck?" (part 4, feature 3). Every answer is stored with its mission (drop-off data, once
 * migration 0017 is applied). "No time this week" moves the week's open missions by seven days —
 * no penalty, nothing lost. The other two answers are handled on the page (the mission's fallback;
 * Ask Sol with the mission as context).
 */
export const reportStuck = createServerFn({ method: "POST" })
  .validator(z.object({ taskId: z.string().uuid(), reason: z.enum(["cant", "time", "wrong"]) }))
  .handler(async ({ data }): Promise<{ moved: boolean; newDeadline: string | null }> => {
    const { supabase, user } = await requireUser();
    const caps = await getSchemaCapabilities(supabase);
    const { data: task, error } = await db(supabase)
      .from("roadmap_tasks")
      .select("id, week_id")
      .eq("id", data.taskId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!task) throw new Error("Mission not found");
    if (caps.stuck) {
      await db(supabase)
        .from("mission_stuck_events")
        .insert({ user_id: user.id, task_id: data.taskId, reason: data.reason });
    }
    if (data.reason !== "time" || !task.week_id) return { moved: false, newDeadline: null };

    const { data: open } = await db(supabase)
      .from("roadmap_tasks")
      .select("id, deadline")
      .eq("week_id", task.week_id)
      .eq("user_id", user.id)
      .neq("status", "done");
    let newDeadline: string | null = null;
    for (const t of open ?? []) {
      if (!t.deadline) continue;
      const d = new Date(`${t.deadline}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() + 7);
      const next = d.toISOString().slice(0, 10);
      if (!newDeadline || next > newDeadline) newDeadline = next;
      await db(supabase)
        .from("roadmap_tasks")
        .update({ deadline: next })
        .eq("id", t.id)
        .eq("user_id", user.id);
    }
    if (caps.stuck) {
      const { data: week } = await db(supabase)
        .from("roadmap_weeks")
        .select("shifted_days")
        .eq("id", task.week_id)
        .eq("user_id", user.id)
        .maybeSingle();
      await db(supabase)
        .from("roadmap_weeks")
        .update({ shifted_days: Number(week?.shifted_days ?? 0) + 7 })
        .eq("id", task.week_id)
        .eq("user_id", user.id);
    }
    return { moved: true, newDeadline };
  });
