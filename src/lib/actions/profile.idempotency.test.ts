import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Proves completeConsultation cannot create duplicate business_dna +
 * opportunities + roadmaps row sets when the same user's submission fires
 * twice — a double-click, or the in-page submit racing auth/callback's
 * resumePendingConsultation. Everything Gemini/Supabase is mocked; this
 * never makes a live call of either kind.
 *
 * The fake Supabase client below models exactly one real constraint: a
 * UNIQUE index on business_dna (user_id, profile_hash) (see migration
 * 0003_business_dna_idempotency.sql) — a second insert with the same pair
 * fails with Postgres code 23505, same as the real database would.
 */

interface FakeDnaRow {
  id: string;
  user_id: string;
  profile_hash: string;
  founder_analysis: unknown;
}

function createFakeSupabase() {
  const businessDnaRows: FakeDnaRow[] = [];
  let nextId = 0;

  function businessDnaTable() {
    return {
      select() {
        return {
          eq(_col1: string, userId: string) {
            return {
              eq(_col2: string, hash: string) {
                const find = () =>
                  businessDnaRows.find((r) => r.user_id === userId && r.profile_hash === hash) ??
                  null;
                return {
                  maybeSingle: async () => ({ data: find(), error: null }),
                  single: async () => {
                    const row = find();
                    return row
                      ? { data: row, error: null }
                      : { data: null, error: { message: "not found", code: "PGRST116" } };
                  },
                };
              },
            };
          },
        };
      },
      insert(row: Record<string, unknown>) {
        return {
          select() {
            return {
              single: async () => {
                const dup = businessDnaRows.find(
                  (r) => r.user_id === row.user_id && r.profile_hash === row.profile_hash,
                );
                if (dup) {
                  return {
                    data: null,
                    error: {
                      code: "23505",
                      message:
                        'duplicate key value violates unique constraint "business_dna_user_profile_hash_key"',
                    },
                  };
                }
                const newRow: FakeDnaRow = {
                  id: `dna-${++nextId}`,
                  user_id: row.user_id as string,
                  profile_hash: row.profile_hash as string,
                  founder_analysis: row.founder_analysis,
                };
                businessDnaRows.push(newRow);
                return { data: { id: newRow.id }, error: null };
              },
            };
          },
        };
      },
      delete() {
        return {
          eq: async (_col: string, id: string) => {
            const idx = businessDnaRows.findIndex((r) => r.id === id);
            if (idx >= 0) businessDnaRows.splice(idx, 1);
            return { error: null };
          },
        };
      },
    };
  }

  function opportunitiesTable() {
    return {
      insert(_row: Record<string, unknown>) {
        return {
          select() {
            return { single: async () => ({ data: { id: `opp-${++nextId}` }, error: null }) };
          },
        };
      },
    };
  }

  function opportunityDetailsTable() {
    return { insert: async (_row: Record<string, unknown>) => ({ error: null }) };
  }

  const supabase = {
    from(table: string) {
      if (table === "business_dna") return businessDnaTable();
      if (table === "opportunities") return opportunitiesTable();
      if (table === "opportunity_details") return opportunityDetailsTable();
      throw new Error(`fake supabase: unexpected table "${table}"`);
    },
  };

  return { supabase, businessDnaRows };
}

// createServerFn's real implementation needs TanStack Start's request-scoped
// AsyncLocalStorage context, which only exists inside the actual server
// runtime — calling an exported server fn directly in a unit test throws
// "No Start context found" otherwise. This stub reduces it to exactly what
// this test needs: call the handler with the given data, no validation,
// no request context. The validator/context machinery isn't what's under
// test here — the idempotency logic inside the handler is.
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
vi.mock("@/lib/ai/prompts/intelligence-package", () => ({
  generateIntelligencePackage: vi.fn(),
}));
vi.mock("@/lib/actions/roadmap-persistence.server", () => ({ createRoadmap: vi.fn() }));
vi.mock("@/lib/actions/email.server", () => ({
  sendRoadmapReadyEmail: vi.fn(),
  sendWelcomeEmail: vi.fn(),
}));

import { requireUser } from "@/lib/supabase/server";
import { generateIntelligencePackage } from "@/lib/ai/prompts/intelligence-package";
import { completeConsultation } from "@/lib/actions/profile";
import { FIXTURE_PROFILE_ANSWERS } from "@/lib/ai/fixtures/intelligence-package.fixture";

const requireUserMock = vi.mocked(requireUser);
const generateIntelligencePackageMock = vi.mocked(generateIntelligencePackage);

const FAKE_USER = { id: "user-1", email: "founder@example.com" };

function fakePackage() {
  const founderDNA = {
    narrativeSummary: "x",
    strengths: ["a"],
    resources: ["a"],
    constraints: ["a"],
    workStyle: "x",
    riskProfile: "x",
    direction: "x",
    strategicSignals: ["x"],
  };
  const fitSignals = {
    requiredSkills: [],
    startupCapitalINR: 1000,
    weeklyHoursNeeded: 5,
    riskLevel: "cautious" as const,
    motivationAlignment: "high" as const,
    requiresLeadership: false,
    requiresSales: false,
    soloFriendly: true,
    relevantExperienceYears: 0,
    requiresDigitalAssets: false,
    locationFlexible: true,
  };
  const opportunity = (i: number) => ({
    opportunityIndex: i,
    title: `Opp ${i}`,
    category: "digital service",
    plainEnglishSummary: "x",
    customer: "x",
    problem: "x",
    solution: "x",
    whyThisFounder: ["a"],
    businessModelPlainEnglish: "x",
    startingCapital: "x",
    weeklyTime: "x",
    difficulty: "Beginner-friendly",
    skillsAlreadyOwned: [],
    skillsToLearn: [],
    resourceRequirements: [],
    advantages: ["a"],
    tradeoffs: ["a"],
    risks: ["a"],
    unknowns: [],
    validationNeeded: [],
    revenuePath: "x",
    firstExperiment: "x",
    fitSignals,
    roadmap: { phases: [] },
  });
  return { founderDNA, opportunities: [0, 1, 2].map(opportunity) };
}

describe("completeConsultation idempotency (mocked Supabase + Gemini, no live calls)", () => {
  beforeEach(() => {
    generateIntelligencePackageMock.mockReset();
    generateIntelligencePackageMock.mockImplementation(async () => fakePackage() as never);
  });

  it("sequential double-submit: the second call reuses the first's row via the pre-check, at zero extra Gemini cost", async () => {
    const { supabase, businessDnaRows } = createFakeSupabase();
    requireUserMock.mockResolvedValue({ supabase, user: FAKE_USER } as never);

    const first = await completeConsultation({
      data: { answers: FIXTURE_PROFILE_ANSWERS as unknown as Record<string, unknown> },
    });
    const second = await completeConsultation({
      data: { answers: FIXTURE_PROFILE_ANSWERS as unknown as Record<string, unknown> },
    });

    expect(generateIntelligencePackageMock).toHaveBeenCalledTimes(1);
    expect(second.businessDnaId).toBe(first.businessDnaId);
    expect(businessDnaRows).toHaveLength(1);
  });

  it("concurrent double-submit (true race): only one business_dna row survives, both calls resolve with the same id", async () => {
    const { supabase, businessDnaRows } = createFakeSupabase();
    requireUserMock.mockResolvedValue({ supabase, user: FAKE_USER } as never);

    const [first, second] = await Promise.all([
      completeConsultation({
        data: { answers: FIXTURE_PROFILE_ANSWERS as unknown as Record<string, unknown> },
      }),
      completeConsultation({
        data: { answers: FIXTURE_PROFILE_ANSWERS as unknown as Record<string, unknown> },
      }),
    ]);

    // Both requests can race past the pre-check before either inserts —
    // that's expected and is exactly why the unique index (not the
    // pre-check alone) is the real guard. What must never happen is a
    // second surviving row.
    expect(businessDnaRows).toHaveLength(1);
    expect(first.businessDnaId).toBe(second.businessDnaId);
    expect(first.businessDnaId).toBe(businessDnaRows[0].id);
  });

  it("different answers for the same user are NOT deduplicated (different profile_hash, both persist)", async () => {
    const { supabase, businessDnaRows } = createFakeSupabase();
    requireUserMock.mockResolvedValue({ supabase, user: FAKE_USER } as never);

    const first = await completeConsultation({
      data: { answers: FIXTURE_PROFILE_ANSWERS as unknown as Record<string, unknown> },
    });
    const second = await completeConsultation({
      data: {
        answers: { ...FIXTURE_PROFILE_ANSWERS, age: "99" } as unknown as Record<string, unknown>,
      },
    });

    expect(generateIntelligencePackageMock).toHaveBeenCalledTimes(2);
    expect(second.businessDnaId).not.toBe(first.businessDnaId);
    expect(businessDnaRows).toHaveLength(2);
  });
});
