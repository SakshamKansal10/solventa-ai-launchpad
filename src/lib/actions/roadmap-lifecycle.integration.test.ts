import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { startFakeStack, type FakeStack } from "../../../e2e/harness/fake-supabase";
import { roadmapSkeleton } from "@/lib/ai/fixtures/e2e-gemini";
import type { RoadmapSkeletonPlan } from "@/lib/ai/schemas";
import {
  getSchemaCapabilities,
  resetSchemaCapabilitiesCache,
} from "@/lib/schema-capabilities.server";
import type { Database } from "@/lib/supabase/types";
import { GENERATION_LOCK_TTL_MS } from "@/lib/roadmap/state";
import {
  acquireWeekLock,
  createBuildingRoadmap,
  persistSkeleton,
} from "./roadmap-lifecycle.server";

/**
 * The roadmap's "never generate a week twice" guarantees, tested against a REAL
 * Postgres (the repo's own migrations on PGlite) through the same supabase-js
 * client the app uses — so the compare-and-swap lock, the unique indexes and the
 * row-level-security policies are exercised for real, under real concurrency.
 */

type Db = SupabaseClient<Database>;

let stack: FakeStack;

function clientFor(accessToken: string): Db {
  return createClient<Database>(stack.url, stack.anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function newFounder(email: string) {
  const { user, session } = await stack.createUser({
    email,
    password: "pw-pw-pw-pw",
    fullName: email,
  });
  const opp = await stack.db.admin<{ id: string }>(
    `with dna as (
       insert into business_dna (user_id, onboarding_answers, normalized_signals, founder_analysis, ai_model, profile_hash, initial_ai_calls, prompt_version)
       values ($1, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, 'test', $2, 1, 'test') returning id)
     insert into opportunities (user_id, business_dna_id, title, one_liner, who_for, fit_score, score_breakdown, candidate, status, batch_number, ai_model)
     select $1, dna.id, 'A direction', 'One liner', 'Someone', 50, '{}'::jsonb, '{}'::jsonb, 'active', 1, 'test' from dna returning id`,
    [user.id, `hash-${email}`],
  );
  return { userId: user.id, db: clientFor(session.access_token), opportunityId: opp[0].id };
}

beforeAll(async () => {
  stack = await startFakeStack();
}, 120_000);

afterAll(async () => {
  await stack.close();
});

describe("roadmap creation and week generation are race-safe", () => {
  it("ten simultaneous 'build my roadmap' requests create exactly one roadmap", async () => {
    resetSchemaCapabilitiesCache();
    const f = await newFounder("race-build@example.test");
    const caps = await getSchemaCapabilities(f.db);
    expect(caps.weekLock && caps.roadmapStates).toBe(true);

    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        createBuildingRoadmap(f.db, f.userId, f.opportunityId, caps),
      ),
    );
    expect(results.filter((r) => r.created)).toHaveLength(1);
    expect(new Set(results.map((r) => r.id)).size).toBe(1);
    const rows = await stack.db.admin("select id from roadmaps where user_id = $1", [f.userId]);
    expect(rows).toHaveLength(1);
  });

  it("ten simultaneous requests to generate the same week: one acquires the lock, nine are told it is busy", async () => {
    resetSchemaCapabilitiesCache();
    const f = await newFounder("race-week@example.test");
    const caps = await getSchemaCapabilities(f.db);
    const { id: roadmapId } = await createBuildingRoadmap(f.db, f.userId, f.opportunityId, caps);
    await persistSkeleton(
      f.db,
      f.userId,
      roadmapId,
      roadmapSkeleton() as RoadmapSkeletonPlan,
      new Date(),
      caps,
    );

    const week2 = await stack.db.admin<{ id: string }>(
      "select id from roadmap_weeks where user_id = $1 and global_number = 2",
      [f.userId],
    );
    const outcomes = await Promise.all(
      Array.from({ length: 10 }, () => acquireWeekLock(f.db, f.userId, week2[0].id, caps)),
    );
    expect(outcomes.filter((o) => o === "acquired")).toHaveLength(1);
    expect(outcomes.filter((o) => o === "busy")).toHaveLength(9);

    const row = await stack.db.admin<{ generation_status: string; generation_attempts: number }>(
      "select generation_status, generation_attempts from roadmap_weeks where id = $1",
      [week2[0].id],
    );
    expect(row[0].generation_status).toBe("generating");
    expect(row[0].generation_attempts).toBe(1);
  });

  it("a failed week can be taken again, and an abandoned (stale) lock is recoverable", async () => {
    resetSchemaCapabilitiesCache();
    const f = await newFounder("stale-lock@example.test");
    const caps = await getSchemaCapabilities(f.db);
    const { id: roadmapId } = await createBuildingRoadmap(f.db, f.userId, f.opportunityId, caps);
    await persistSkeleton(
      f.db,
      f.userId,
      roadmapId,
      roadmapSkeleton() as RoadmapSkeletonPlan,
      new Date(),
      caps,
    );
    const week = (
      await stack.db.admin<{ id: string }>(
        "select id from roadmap_weeks where user_id = $1 and global_number = 2",
        [f.userId],
      )
    )[0].id;

    expect(await acquireWeekLock(f.db, f.userId, week, caps)).toBe("acquired");
    expect(await acquireWeekLock(f.db, f.userId, week, caps)).toBe("busy");

    // The request died: its lock outlives the TTL, so the next request may take over.
    await stack.db.admin(
      "update roadmap_weeks set generation_started_at = now() - ($2 || ' milliseconds')::interval where id = $1",
      [week, String(GENERATION_LOCK_TTL_MS + 5_000)],
    );
    expect(await acquireWeekLock(f.db, f.userId, week, caps)).toBe("acquired");

    // An explicit failure releases it for a retry.
    await stack.db.admin("update roadmap_weeks set generation_status = 'failed' where id = $1", [
      week,
    ]);
    expect(await acquireWeekLock(f.db, f.userId, week, caps)).toBe("acquired");
  });

  it("a week that already has missions is never regenerated", async () => {
    resetSchemaCapabilitiesCache();
    const f = await newFounder("has-missions@example.test");
    const caps = await getSchemaCapabilities(f.db);
    const { id: roadmapId } = await createBuildingRoadmap(f.db, f.userId, f.opportunityId, caps);
    await persistSkeleton(
      f.db,
      f.userId,
      roadmapId,
      roadmapSkeleton() as RoadmapSkeletonPlan,
      new Date(),
      caps,
    );
    const week = (
      await stack.db.admin<{ id: string }>(
        "select id from roadmap_weeks where user_id = $1 and global_number = 1",
        [f.userId],
      )
    )[0].id;
    await stack.db.admin(
      `insert into roadmap_tasks (week_id, phase_id, user_id, order_index, what, why, how, done_when, status)
       select id, phase_id, $2, 0, 'A mission', 'why', 'how', 'done', 'pending' from roadmap_weeks where id = $1`,
      [week, f.userId],
    );
    expect(await acquireWeekLock(f.db, f.userId, week, caps)).toBe("ready");
  });

  it("the database refuses a duplicate week number or mission position outright", async () => {
    resetSchemaCapabilitiesCache();
    const f = await newFounder("uniques@example.test");
    const caps = await getSchemaCapabilities(f.db);
    const { id: roadmapId } = await createBuildingRoadmap(f.db, f.userId, f.opportunityId, caps);
    await persistSkeleton(
      f.db,
      f.userId,
      roadmapId,
      roadmapSkeleton() as RoadmapSkeletonPlan,
      new Date(),
      caps,
    );
    const phase = (
      await stack.db.admin<{ id: string }>(
        "select id from roadmap_phases where roadmap_id = $1 order by order_index limit 1",
        [roadmapId],
      )
    )[0].id;

    const dup = await f.db.from("roadmap_weeks").insert({
      phase_id: phase,
      user_id: f.userId,
      order_index: 99,
      week_number: 99,
      title: "duplicate",
      objective: "duplicate",
      status: "locked",
      roadmap_id: roadmapId,
      global_number: 1,
    });
    expect(dup.error?.code).toBe("23505");

    const second = await f.db.from("roadmaps").insert({
      user_id: f.userId,
      opportunity_id: f.opportunityId,
      status: "building",
      ai_model: "x",
    });
    expect(second.error?.code).toBe("23505");
  });

  it("another founder cannot see or change this founder's weeks (row-level security)", async () => {
    resetSchemaCapabilitiesCache();
    const owner = await newFounder("owner@example.test");
    const stranger = await newFounder("stranger@example.test");
    const caps = await getSchemaCapabilities(owner.db);
    const { id: roadmapId } = await createBuildingRoadmap(
      owner.db,
      owner.userId,
      owner.opportunityId,
      caps,
    );
    await persistSkeleton(
      owner.db,
      owner.userId,
      roadmapId,
      roadmapSkeleton() as RoadmapSkeletonPlan,
      new Date(),
      caps,
    );
    const week = (
      await stack.db.admin<{ id: string }>(
        "select id from roadmap_weeks where user_id = $1 and global_number = 2",
        [owner.userId],
      )
    )[0].id;

    const seen = await stranger.db.from("roadmap_weeks").select("id").eq("id", week);
    expect(seen.data).toEqual([]);
    expect(await acquireWeekLock(stranger.db, stranger.userId, week, caps)).toBe("busy");
    const steal = await stranger.db.from("roadmaps").select("id").eq("id", roadmapId);
    expect(steal.data).toEqual([]);
  });
});
