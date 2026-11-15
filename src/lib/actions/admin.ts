import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";

import { requireUser } from "@/lib/supabase/server";

export const DROP_OFF_STEPS = [
  "consultation_finished",
  "direction_chosen",
  "roadmap_built",
  "mission1_started",
  "mission1_done",
  "week1_done",
] as const;
export type DropOffStep = (typeof DROP_OFF_STEPS)[number];

export type DropOffDTO =
  | { allowed: false }
  | {
      allowed: true;
      steps: Record<DropOffStep, number>;
      stuck: { cant: number; time: number; wrong: number };
    };

/**
 * Drop-off numbers for the owner (redesign-v2 part 4, feature 10). Counts only, from the
 * project's own tables, through one aggregate SQL function that refuses anyone whose profile is
 * not marked admin (migration 0019). No third-party tracker. Anyone else — or a database without
 * the migration — gets `allowed: false`, and the page shows nothing.
 */
export const getDropOff = createServerFn({ method: "GET" }).handler(
  async (): Promise<DropOffDTO> => {
    const { supabase } = await requireUser();
    const { data, error } = await (supabase as unknown as SupabaseClient).rpc(
      "admin_dropoff_counts",
    );
    if (error || !data) return { allowed: false };
    const raw = data as Record<string, unknown>;
    const num = (v: unknown) => (typeof v === "number" ? v : Number(v ?? 0) || 0);
    const stuck = (raw.stuck ?? {}) as Record<string, unknown>;
    return {
      allowed: true,
      steps: Object.fromEntries(DROP_OFF_STEPS.map((s) => [s, num(raw[s])])) as Record<
        DropOffStep,
        number
      >,
      stuck: { cant: num(stuck.cant), time: num(stuck.time), wrong: num(stuck.wrong) },
    };
  },
);
