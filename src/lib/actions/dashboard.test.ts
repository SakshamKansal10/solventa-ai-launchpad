import { describe, it, expect, vi } from "vitest";

/**
 * Proves the dashboard's "primary" opportunity:
 * 1. Always matches whichever roadmap is actually active — not just
 *    whichever active opportunity has the highest fit_score. Explore More
 *    Opportunities can add a higher-scoring opportunity without activating
 *    its roadmap (deliberate — exploring more must never silently switch
 *    the founder's current path).
 * 2. Never falls back to an opportunity from an OLDER consultation just
 *    because it happens to score higher than the founder's latest one —
 *    completing a new consultation must show the new ideas, not resurrect
 *    an old one, unless the founder explicitly selected it or it has a
 *    real active roadmap (both real founder actions, honored regardless
 *    of which consultation produced them).
 *
 * Everything Supabase is mocked; this makes no live database call.
 */

vi.mock("@tanstack/react-start", () => {
  // Mirrors the real runtime, which always invokes a server function's
  // handler with a fully-formed context object — `getDashboard()` with no
  // arguments still reaches the handler as `{ data: undefined }`, never a
  // bare `undefined`.
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
import { getDashboard } from "@/lib/actions/dashboard";

const requireUserMock = vi.mocked(requireUser);
const FAKE_USER = { id: "user-1", email: "founder@example.com" };
const LATEST_DNA_ID = "dna-2";

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

// Every scenario below has one "current" business_dna row (id=LATEST_DNA_ID)
// unless a test is specifically about multiple consultations.
const LATEST_DNA_ROW: Row = {
  id: LATEST_DNA_ID,
  user_id: FAKE_USER.id,
  created_at: "2026-02-01T00:00:00Z",
};

describe("getDashboard primary-opportunity selection", () => {
  it("primary matches the ACTIVE roadmap's opportunity, not just the highest fit_score among active opportunities", async () => {
    const opportunities: Row[] = [
      {
        id: "opp-current",
        user_id: FAKE_USER.id,
        business_dna_id: LATEST_DNA_ID,
        status: "active",
        fit_score: 70,
        created_at: "2026-01-01T00:00:00Z",
        title: "Current path",
      },
      {
        id: "opp-explored-higher-score",
        user_id: FAKE_USER.id,
        business_dna_id: LATEST_DNA_ID,
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
      business_dna: [LATEST_DNA_ROW],
      roadmaps,
    });
    requireUserMock.mockResolvedValue({ supabase, user: FAKE_USER } as never);

    const dashboard = await getDashboard();

    expect(dashboard.primary?.id).toBe("opp-current");
    expect(dashboard.alternatives.map((o) => o.id)).toEqual(["opp-explored-higher-score"]);
  });

  it("falls back to the highest-scoring active opportunity in the latest consultation when no roadmap is active at all", async () => {
    const opportunities: Row[] = [
      {
        id: "opp-a",
        user_id: FAKE_USER.id,
        business_dna_id: LATEST_DNA_ID,
        status: "active",
        fit_score: 60,
        created_at: "2026-01-01T00:00:00Z",
      },
      {
        id: "opp-b",
        user_id: FAKE_USER.id,
        business_dna_id: LATEST_DNA_ID,
        status: "active",
        fit_score: 80,
        created_at: "2026-01-02T00:00:00Z",
      },
    ];
    const supabase = createFakeSupabase({
      profiles: [],
      opportunities,
      business_dna: [LATEST_DNA_ROW],
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
        business_dna_id: LATEST_DNA_ID,
        status: "selected",
        fit_score: 50,
        created_at: "2026-01-01T00:00:00Z",
      },
      {
        id: "opp-other",
        user_id: FAKE_USER.id,
        business_dna_id: LATEST_DNA_ID,
        status: "active",
        fit_score: 95,
        created_at: "2026-01-02T00:00:00Z",
      },
    ];
    const supabase = createFakeSupabase({
      profiles: [],
      opportunities,
      business_dna: [LATEST_DNA_ROW],
      roadmaps: [{ opportunity_id: "opp-other", user_id: FAKE_USER.id, status: "active" }],
    });
    requireUserMock.mockResolvedValue({ supabase, user: FAKE_USER } as never);

    const dashboard = await getDashboard();

    expect(dashboard.primary?.id).toBe("opp-selected");
  });

  it("REGRESSION: a returning founder who completes a new consultation sees the NEW ideas, never an old higher-scoring one, when nothing has been explicitly selected yet", async () => {
    const opportunities: Row[] = [
      // Old consultation — founder never selected anything, no roadmap
      // was ever built, but it scored higher than anything in the new batch.
      {
        id: "opp-old-high-score",
        user_id: FAKE_USER.id,
        business_dna_id: "dna-1-old",
        status: "active",
        fit_score: 99,
        created_at: "2026-01-01T00:00:00Z",
        title: "Old idea from a previous consultation",
      },
      // New consultation — lower score than the old one, but must win
      // because it's the LATEST consultation and nothing is explicitly
      // selected or active yet.
      {
        id: "opp-new-primary",
        user_id: FAKE_USER.id,
        business_dna_id: LATEST_DNA_ID,
        status: "active",
        fit_score: 70,
        created_at: "2026-02-01T00:00:00Z",
        title: "New idea from the latest consultation",
      },
      {
        id: "opp-new-alt",
        user_id: FAKE_USER.id,
        business_dna_id: LATEST_DNA_ID,
        status: "active",
        fit_score: 65,
        created_at: "2026-02-01T00:00:01Z",
        title: "New alternative from the latest consultation",
      },
    ];
    const supabase = createFakeSupabase({
      profiles: [],
      opportunities,
      business_dna: [LATEST_DNA_ROW],
      roadmaps: [],
    });
    requireUserMock.mockResolvedValue({ supabase, user: FAKE_USER } as never);

    const dashboard = await getDashboard();

    expect(dashboard.primary?.id).toBe("opp-new-primary");
    expect(dashboard.alternatives.map((o) => o.id)).toEqual(["opp-new-alt"]);
    // The old opportunity must never appear as primary or as an
    // alternative to the new consultation's ideas.
    expect(dashboard.alternatives.map((o) => o.id)).not.toContain("opp-old-high-score");
  });

  it("REGRESSION: explicitly re-selecting an idea from an OLD consultation still wins over the latest one", async () => {
    const opportunities: Row[] = [
      {
        id: "opp-old-reselected",
        user_id: FAKE_USER.id,
        business_dna_id: "dna-1-old",
        status: "selected",
        fit_score: 40,
        created_at: "2026-01-01T00:00:00Z",
        title: "Founder deliberately switched back to this old idea",
      },
      {
        id: "opp-new-primary",
        user_id: FAKE_USER.id,
        business_dna_id: LATEST_DNA_ID,
        status: "active",
        fit_score: 90,
        created_at: "2026-02-01T00:00:00Z",
        title: "New idea from the latest consultation",
      },
    ];
    const supabase = createFakeSupabase({
      profiles: [],
      opportunities,
      business_dna: [LATEST_DNA_ROW],
      roadmaps: [],
    });
    requireUserMock.mockResolvedValue({ supabase, user: FAKE_USER } as never);

    const dashboard = await getDashboard();

    expect(dashboard.primary?.id).toBe("opp-old-reselected");
  });

  it("REGRESSION: a consultationId deep link (e.g. from the ideas-ready email) pins the dashboard to THAT consultation, even when a newer one exists", async () => {
    const opportunities: Row[] = [
      {
        id: "opp-emailed",
        user_id: FAKE_USER.id,
        business_dna_id: "dna-emailed",
        status: "active",
        fit_score: 82,
        created_at: "2026-01-15T00:00:00Z",
        title: "The idea the email actually described",
      },
      // A consultation run AFTER the email was sent but BEFORE it was
      // clicked — without pinning, this would silently win as "latest".
      {
        id: "opp-newer",
        user_id: FAKE_USER.id,
        business_dna_id: LATEST_DNA_ID,
        status: "active",
        fit_score: 95,
        created_at: "2026-02-01T00:00:00Z",
        title: "A different, newer consultation's idea",
      },
    ];
    const supabase = createFakeSupabase({
      profiles: [],
      opportunities,
      business_dna: [LATEST_DNA_ROW, { id: "dna-emailed", user_id: FAKE_USER.id }],
      roadmaps: [],
    });
    requireUserMock.mockResolvedValue({ supabase, user: FAKE_USER } as never);

    const dashboard = await getDashboard({ data: { consultationId: "dna-emailed" } });

    expect(dashboard.primary?.id).toBe("opp-emailed");
    expect(dashboard.primary?.id).not.toBe("opp-newer");
  });

  it("REGRESSION: a consultationId that no longer resolves (e.g. a deleted consultation) falls back to the latest one instead of erroring", async () => {
    const opportunities: Row[] = [
      {
        id: "opp-latest",
        user_id: FAKE_USER.id,
        business_dna_id: LATEST_DNA_ID,
        status: "active",
        fit_score: 70,
        created_at: "2026-02-01T00:00:00Z",
        title: "Latest consultation's idea",
      },
    ];
    const supabase = createFakeSupabase({
      profiles: [],
      opportunities,
      business_dna: [LATEST_DNA_ROW],
      roadmaps: [],
    });
    requireUserMock.mockResolvedValue({ supabase, user: FAKE_USER } as never);

    const dashboard = await getDashboard({ data: { consultationId: "dna-does-not-exist" } });

    expect(dashboard.primary?.id).toBe("opp-latest");
  });
});
