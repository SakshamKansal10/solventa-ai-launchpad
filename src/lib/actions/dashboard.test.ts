import { describe, it, expect, vi } from "vitest";

/**
 * Proves the dashboard's "primary" opportunity always matches whichever
 * roadmap is actually active — not just whichever active opportunity has
 * the highest fit_score. Explore More Opportunities can add a
 * higher-scoring opportunity without activating its roadmap (deliberate —
 * exploring more must never silently switch the founder's current path),
 * which used to make the dashboard show that new idea as "Your Strongest
 * Match" while the roadmap page kept showing the real current one.
 *
 * Everything Supabase is mocked; this makes no live database call.
 */

vi.mock("@tanstack/react-start", () => {
  const handler = (fn: (args?: { data: unknown }) => unknown) => (args?: { data: unknown }) =>
    fn(args);
  return { createServerFn: () => ({ handler }) };
});
vi.mock("@/lib/supabase/server", () => ({ requireUser: vi.fn() }));

import { requireUser } from "@/lib/supabase/server";
import { getDashboard } from "@/lib/actions/dashboard";

const requireUserMock = vi.mocked(requireUser);
const FAKE_USER = { id: "user-1", email: "founder@example.com" };

interface Row {
  [key: string]: unknown;
}

/** Minimal generic fake covering exactly the query shapes getDashboard
 * uses: .select().eq(...).order(...)*.maybeSingle()|list, filtering an
 * in-memory table by whatever .eq() calls were chained. */
function createFakeSupabase(tables: Record<string, Row[]>) {
  function builder(table: string) {
    const filters: [string, unknown][] = [];
    const orderSpecs: [string, boolean][] = [];
    function rows() {
      const filtered = (tables[table] ?? []).filter((r) => filters.every(([c, v]) => r[c] === v));
      return [...filtered].sort((a, b) => {
        for (const [col, ascending] of orderSpecs) {
          const av = a[col] as string | number;
          const bv = b[col] as string | number;
          if (av === bv) continue;
          const cmp = av < bv ? -1 : 1;
          return ascending ? cmp : -cmp;
        }
        return 0;
      });
    }
    const api = {
      select: () => api,
      eq(col: string, val: unknown) {
        filters.push([col, val]);
        return api;
      },
      order(col: string, opts?: { ascending?: boolean }) {
        orderSpecs.push([col, opts?.ascending ?? true]);
        return api;
      },
      limit: () => api,
      async maybeSingle() {
        return { data: rows()[0] ?? null, error: null };
      },
      then(resolve: (v: { data: Row[]; error: null }) => void) {
        resolve({ data: rows(), error: null });
      },
    };
    return api;
  }
  return { from: (table: string) => builder(table) };
}

describe("getDashboard primary-opportunity selection", () => {
  it("primary matches the ACTIVE roadmap's opportunity, not just the highest fit_score among active opportunities", async () => {
    const opportunities: Row[] = [
      {
        id: "opp-current",
        user_id: FAKE_USER.id,
        status: "active",
        fit_score: 70,
        created_at: "2026-01-01T00:00:00Z",
        title: "Current path",
      },
      {
        id: "opp-explored-higher-score",
        user_id: FAKE_USER.id,
        status: "active",
        fit_score: 90,
        created_at: "2026-02-01T00:00:00Z",
        title: "Newly explored, scores higher, never activated",
      },
    ];
    const roadmaps: Row[] = [
      // Only opp-current's roadmap is active — Explore More never
      // activates the new opportunity's roadmap automatically.
      { opportunity_id: "opp-current", user_id: FAKE_USER.id, status: "active", id: "rm-1" },
      {
        opportunity_id: "opp-explored-higher-score",
        user_id: FAKE_USER.id,
        status: "available",
        id: "rm-2",
      },
    ];
    const supabase = createFakeSupabase({
      profiles: [{ id: FAKE_USER.id, full_name: "Founder", email: FAKE_USER.email }],
      opportunities,
      business_dna: [],
      roadmaps,
    });
    requireUserMock.mockResolvedValue({ supabase, user: FAKE_USER } as never);

    const dashboard = await getDashboard();

    expect(dashboard.primary?.id).toBe("opp-current");
    expect(dashboard.alternatives.map((o) => o.id)).toEqual(["opp-explored-higher-score"]);
  });

  it("falls back to the highest-scoring active opportunity when no roadmap is active at all", async () => {
    const opportunities: Row[] = [
      {
        id: "opp-a",
        user_id: FAKE_USER.id,
        status: "active",
        fit_score: 60,
        created_at: "2026-01-01T00:00:00Z",
      },
      {
        id: "opp-b",
        user_id: FAKE_USER.id,
        status: "active",
        fit_score: 80,
        created_at: "2026-01-02T00:00:00Z",
      },
    ];
    const supabase = createFakeSupabase({
      profiles: [],
      opportunities,
      business_dna: [],
      roadmaps: [],
    });
    requireUserMock.mockResolvedValue({ supabase, user: FAKE_USER } as never);

    const dashboard = await getDashboard();

    expect(dashboard.primary?.id).toBe("opp-b");
  });

  it("an explicitly selected opportunity always wins, regardless of which roadmap is active", async () => {
    const opportunities: Row[] = [
      {
        id: "opp-selected",
        user_id: FAKE_USER.id,
        status: "selected",
        fit_score: 50,
        created_at: "2026-01-01T00:00:00Z",
      },
      {
        id: "opp-other",
        user_id: FAKE_USER.id,
        status: "active",
        fit_score: 95,
        created_at: "2026-01-02T00:00:00Z",
      },
    ];
    const supabase = createFakeSupabase({
      profiles: [],
      opportunities,
      business_dna: [],
      roadmaps: [{ opportunity_id: "opp-other", user_id: FAKE_USER.id, status: "active" }],
    });
    requireUserMock.mockResolvedValue({ supabase, user: FAKE_USER } as never);

    const dashboard = await getDashboard();

    expect(dashboard.primary?.id).toBe("opp-selected");
  });
});
