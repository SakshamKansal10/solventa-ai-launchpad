import { describe, it, expect, vi } from "vitest";

/**
 * Proves the P0 "Build My Roadmap → No roadmap, Go to Dashboard" fix:
 * getRoadmap's default (no opportunityId) lookup must never return a bare
 * `null` when there IS a real, determinable opportunity to build a roadmap
 * for — that used to be indistinguishable from "founder has genuinely
 * never selected anything" and rendered as a permanent-feeling dead end.
 * It now returns `{ needsBuild: { opportunityId, title } }` in that case,
 * using the exact same consultation-scoped resolution as getDashboard's
 * primary (selected > AI-designated flagship > highest fit_score, scoped
 * to only the latest consultation). A bare `null` is reserved for the one
 * genuinely honest case: no consultation completed at all.
 *
 * Everything Supabase is mocked; this makes no live database call.
 */

vi.mock("@tanstack/react-start", () => {
  const handler = (fn: (args: { data: unknown }) => unknown) => (args?: { data: unknown }) =>
    fn(args ?? { data: undefined });
  return {
    createServerFn: () => ({
      handler,
      validator: () => ({ handler }),
    }),
  };
});
vi.mock("@/lib/supabase/server", () => ({ requireUser: vi.fn() }));

import { requireUser } from "@/lib/supabase/server";
import { getRoadmap } from "@/lib/actions/roadmap";

const requireUserMock = vi.mocked(requireUser);
const FAKE_USER = { id: "user-1", email: "founder@example.com" };
const LATEST_DNA_ID = "dna-2";

interface Row {
  [key: string]: unknown;
}

/** Same minimal generic fake as dashboard.test.ts — covers exactly the
 * query shapes getRoadmap/findOpportunityNeedingRoadmap use. */
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

const LATEST_DNA_ROW: Row = {
  id: LATEST_DNA_ID,
  user_id: FAKE_USER.id,
  created_at: "2026-02-01T00:00:00Z",
};

describe("getRoadmap — needsBuild resolution (no active roadmap yet)", () => {
  it("REGRESSION (exact reported bug): navigating to /dashboard/roadmap before ever building anything resolves needsBuild to the current consultation's flagship, never a bare dead-end null", async () => {
    const opportunities: Row[] = [
      {
        id: "opp-flagship",
        user_id: FAKE_USER.id,
        business_dna_id: LATEST_DNA_ID,
        status: "active",
        fit_score: 60,
        opportunity_index: 0,
        title: "The AI's designated flagship",
      },
      {
        id: "opp-alt",
        user_id: FAKE_USER.id,
        business_dna_id: LATEST_DNA_ID,
        status: "active",
        fit_score: 95,
        opportunity_index: 1,
        title: "Higher fit_score, but not the designated flagship",
      },
    ];
    const supabase = createFakeSupabase({
      opportunities,
      business_dna: [LATEST_DNA_ROW],
      roadmaps: [],
    });
    requireUserMock.mockResolvedValue({ supabase, user: FAKE_USER } as never);

    const result = await getRoadmap({ data: {} });

    expect(result).toEqual({
      needsBuild: { opportunityId: "opp-flagship", title: "The AI's designated flagship" },
    });
  });

  it("resolves needsBuild to an explicitly selected opportunity over the passive flagship/fit_score fallback", async () => {
    const opportunities: Row[] = [
      {
        id: "opp-selected",
        user_id: FAKE_USER.id,
        business_dna_id: LATEST_DNA_ID,
        status: "selected",
        fit_score: 40,
        opportunity_index: 1,
        title: "Explicitly selected by the founder",
      },
      {
        id: "opp-flagship-unselected",
        user_id: FAKE_USER.id,
        business_dna_id: LATEST_DNA_ID,
        status: "active",
        fit_score: 90,
        opportunity_index: 0,
        title: "AI flagship, but not what the founder picked",
      },
    ];
    const supabase = createFakeSupabase({
      opportunities,
      business_dna: [LATEST_DNA_ROW],
      roadmaps: [],
    });
    requireUserMock.mockResolvedValue({ supabase, user: FAKE_USER } as never);

    const result = await getRoadmap({ data: {} });

    expect(result).toEqual({
      needsBuild: { opportunityId: "opp-selected", title: "Explicitly selected by the founder" },
    });
  });

  it("needsBuild is scoped to only the LATEST consultation — an old consultation's opportunities are never offered up to build", async () => {
    const opportunities: Row[] = [
      {
        id: "opp-old",
        user_id: FAKE_USER.id,
        business_dna_id: "dna-old",
        status: "active",
        fit_score: 99,
        opportunity_index: 0,
        title: "Old consultation's flagship — must never win",
      },
      {
        id: "opp-new",
        user_id: FAKE_USER.id,
        business_dna_id: LATEST_DNA_ID,
        status: "active",
        fit_score: 50,
        opportunity_index: 0,
        title: "Latest consultation's flagship",
      },
    ];
    const supabase = createFakeSupabase({
      opportunities,
      business_dna: [
        LATEST_DNA_ROW,
        { id: "dna-old", user_id: FAKE_USER.id, created_at: "2026-01-01T00:00:00Z" },
      ],
      roadmaps: [],
    });
    requireUserMock.mockResolvedValue({ supabase, user: FAKE_USER } as never);

    const result = await getRoadmap({ data: {} });

    expect(result).toEqual({
      needsBuild: { opportunityId: "opp-new", title: "Latest consultation's flagship" },
    });
  });

  it("returns a genuine, honest null when no consultation has ever been completed", async () => {
    const supabase = createFakeSupabase({
      opportunities: [],
      business_dna: [],
      roadmaps: [],
    });
    requireUserMock.mockResolvedValue({ supabase, user: FAKE_USER } as never);

    const result = await getRoadmap({ data: {} });

    expect(result).toBeNull();
  });

  it("an opportunityId-specific lookup for an opportunity with genuinely no roadmap still returns plain null, never needsBuild", async () => {
    const opportunities: Row[] = [
      {
        id: "opp-alternative",
        user_id: FAKE_USER.id,
        business_dna_id: LATEST_DNA_ID,
        status: "active",
        fit_score: 50,
        title: "An alternative the founder hasn't committed to",
      },
    ];
    const supabase = createFakeSupabase({
      opportunities,
      business_dna: [LATEST_DNA_ROW],
      roadmaps: [],
    });
    requireUserMock.mockResolvedValue({ supabase, user: FAKE_USER } as never);

    const result = await getRoadmap({ data: { opportunityId: "opp-alternative" } });

    expect(result).toBeNull();
  });
});
