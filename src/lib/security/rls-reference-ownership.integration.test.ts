import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { TestDb } from "../../../e2e/harness/db";

/**
 * Cross-tenant references through the public API (migration 0013).
 *
 * Every statement in the attack cases runs as the `authenticated` role with the
 * attacker's own JWT `sub` — exactly what anyone with a session can do against the
 * Supabase REST API with the public anon key, bypassing the app's own checks. RLS
 * is the only guard on that path. Real Postgres (PGlite) with the repo's
 * migrations; foreign-key checks bypass RLS here just as they do on Supabase.
 */

interface Founder {
  user: string;
  opp: string;
  opp2: string;
  roadmap: string;
  phase: string;
  week: string;
  task: string;
  assumption: string;
  legacy: string;
}

async function one<T = { id: string }>(db: TestDb, sql: string, params: unknown[]): Promise<T> {
  const rows = await db.admin<T>(sql, params);
  return rows[0];
}

/** Seeds a complete founder as the superuser (RLS bypassed): two opportunities,
 * a roadmap with a phase, a week and a mission, one assumption, one legacy note. */
async function seedFounder(db: TestDb, email: string, withProof: boolean): Promise<Founder> {
  const { id: user } = await one(db, "insert into auth.users (email) values ($1) returning id", [
    email,
  ]);
  const { id: dna } = await one(
    db,
    "insert into public.business_dna (user_id, onboarding_answers, normalized_signals) values ($1, '{}', '{}') returning id",
    [user],
  );
  const opp = async () =>
    (
      await one(
        db,
        `insert into public.opportunities (user_id, business_dna_id, title, one_liner, fit_score, score_breakdown, candidate)
         values ($1, $2, 'Direction', 'One line', 70, '{}', '{}') returning id`,
        [user, dna],
      )
    ).id;
  const o1 = await opp();
  const o2 = await opp();
  const { id: roadmap } = await one(
    db,
    "insert into public.roadmaps (user_id, opportunity_id) values ($1, $2) returning id",
    [user, o1],
  );
  const { id: phase } = await one(
    db,
    "insert into public.roadmap_phases (roadmap_id, user_id, order_index, key, title) values ($1, $2, 0, 'p1', 'Phase') returning id",
    [roadmap, user],
  );
  const { id: week } = await one(
    db,
    "insert into public.roadmap_weeks (phase_id, user_id, order_index, week_number, title, objective) values ($1, $2, 0, 1, 'Week', 'Goal') returning id",
    [phase, user],
  );
  const { id: task } = await one(
    db,
    "insert into public.roadmap_tasks (phase_id, user_id, order_index, what, why, how, done_when, week_id) values ($1, $2, 0, 'w', 'w', 'h', 'd', $3) returning id",
    [phase, user, week],
  );
  const { id: legacy } = await one(
    db,
    "insert into public.founder_evidence (user_id, opportunity_id, category, content) values ($1, $2, 'problem', 'note') returning id",
    [user, o1],
  );
  let assumption = "";
  if (withProof) {
    assumption = (
      await one(
        db,
        "insert into public.proof_assumptions (user_id, opportunity_id, position, title, category) values ($1, $2, 0, 'People feel this', 'problem') returning id",
        [user, o1],
      )
    ).id;
  }
  return { user, opp: o1, opp2: o2, roadmap, phase, week, task, assumption, legacy };
}

const RLS = /row-level security/i;

describe("reference-ownership RLS (0013)", () => {
  let db: TestDb;
  let a: Founder;
  let b: Founder;

  beforeAll(async () => {
    db = await TestDb.create();
    a = await seedFounder(db, "a@example.test", true);
    b = await seedFounder(db, "b@example.test", true);
  }, 180_000);
  afterAll(async () => {
    await db?.close();
  });

  /** Runs one statement as founder A through the API role (RLS applies). */
  const asA = (sql: string, params: unknown[] = []) =>
    db.as({ role: "authenticated", sub: a.user }, (tx) => tx.query(sql, params));

  describe("A cannot create or re-point rows at B's records", () => {
    const attacks: [string, () => [string, unknown[]]][] = [
      [
        "assumption on B's opportunity",
        () => [
          "insert into public.proof_assumptions (user_id, opportunity_id, position, title, category) values ($1, $2, 1, 't', 'problem')",
          [a.user, b.opp],
        ],
      ],
      [
        "evidence on B's opportunity",
        () => [
          "insert into public.proof_evidence (user_id, opportunity_id, evidence_type, summary) values ($1, $2, 'interview', 's')",
          [a.user, b.opp],
        ],
      ],
      [
        "evidence attached to B's assumption",
        () => [
          "insert into public.proof_evidence (user_id, opportunity_id, assumption_id, evidence_type, summary) values ($1, $2, $3, 'interview', 's')",
          [a.user, a.opp, b.assumption],
        ],
      ],
      [
        "evidence linked to B's mission",
        () => [
          "insert into public.proof_evidence (user_id, opportunity_id, assumption_id, task_id, evidence_type, summary) values ($1, $2, $3, $4, 'interview', 's')",
          [a.user, a.opp, a.assumption, b.task],
        ],
      ],
      [
        "evidence linked to B's week",
        () => [
          "insert into public.proof_evidence (user_id, opportunity_id, assumption_id, week_id, evidence_type, summary) values ($1, $2, $3, $4, 'interview', 's')",
          [a.user, a.opp, a.assumption, b.week],
        ],
      ],
      [
        "evidence claiming B's legacy note",
        () => [
          "insert into public.proof_evidence (user_id, opportunity_id, legacy_evidence_id, evidence_type, summary) values ($1, $2, $3, 'other', 's')",
          [a.user, a.opp, b.legacy],
        ],
      ],
      [
        "economics on B's opportunity",
        () => [
          "insert into public.opportunity_economics (user_id, opportunity_id) values ($1, $2)",
          [a.user, b.opp2],
        ],
      ],
      [
        "a roadmap for B's opportunity",
        () => [
          "insert into public.roadmaps (user_id, opportunity_id) values ($1, $2)",
          [a.user, b.opp2],
        ],
      ],
      [
        "a phase inside B's roadmap",
        () => [
          "insert into public.roadmap_phases (roadmap_id, user_id, order_index, key, title) values ($1, $2, 9, 'k', 't')",
          [b.roadmap, a.user],
        ],
      ],
      [
        "a week inside B's phase",
        () => [
          "insert into public.roadmap_weeks (phase_id, user_id, order_index, week_number, title, objective) values ($1, $2, 9, 9, 't', 'o')",
          [b.phase, a.user],
        ],
      ],
      [
        "a week numbered into B's roadmap",
        () => [
          "insert into public.roadmap_weeks (phase_id, user_id, order_index, week_number, title, objective, roadmap_id, global_number) values ($1, $2, 9, 9, 't', 'o', $3, 9)",
          [a.phase, a.user, b.roadmap],
        ],
      ],
      [
        "a mission inside B's week",
        () => [
          "insert into public.roadmap_tasks (phase_id, user_id, order_index, what, why, how, done_when, week_id) values ($1, $2, 9, 'w', 'w', 'h', 'd', $3)",
          [a.phase, a.user, b.week],
        ],
      ],
      [
        "own profile pointed at B's opportunity",
        () => [
          "update public.profiles set active_opportunity_id = $1 where id = $2",
          [b.opp, a.user],
        ],
      ],
    ];

    for (const [name, build] of attacks) {
      it(`rejects: ${name}`, async () => {
        const [sql, params] = build();
        await expect(asA(sql, params)).rejects.toThrow(RLS);
      });
    }

    it("rejects re-pointing A's own economics row at B's opportunity", async () => {
      await asA(
        "insert into public.opportunity_economics (user_id, opportunity_id) values ($1, $2)",
        [a.user, a.opp2],
      );
      await expect(
        asA(
          "update public.opportunity_economics set opportunity_id = $1 where opportunity_id = $2",
          [b.opp, a.opp2],
        ),
      ).rejects.toThrow(RLS);
    });

    it("rejects evidence whose assumption belongs to a different opportunity of A's", async () => {
      await expect(
        asA(
          "insert into public.proof_evidence (user_id, opportunity_id, assumption_id, evidence_type, summary) values ($1, $2, $3, 'interview', 's')",
          [a.user, a.opp2, a.assumption],
        ),
      ).rejects.toThrow(RLS);
    });

    it("left nothing behind: B's slots are still free and B can use them", async () => {
      const leaked = await db.admin<{ n: number }>(
        `select (select count(*) from public.proof_assumptions where opportunity_id = $1 and user_id = $2)
              + (select count(*) from public.opportunity_economics where opportunity_id = $3 and user_id = $2)
              + (select count(*) from public.roadmaps where opportunity_id = $3 and user_id = $2) as n`,
        [b.opp, a.user, b.opp2],
      );
      expect(Number(leaked[0].n)).toBe(0);
      await db.as({ role: "authenticated", sub: b.user }, async (tx) => {
        await tx.query(
          "insert into public.opportunity_economics (user_id, opportunity_id) values ($1, $2)",
          [b.user, b.opp2],
        );
        await tx.query("insert into public.roadmaps (user_id, opportunity_id) values ($1, $2)", [
          b.user,
          b.opp2,
        ]);
      });
    });
  });

  describe("A's own references keep working exactly as the app writes them", () => {
    it("own assumption, evidence (with mission, week and legacy note), economics, roadmap chain and pointer", async () => {
      await db.as({ role: "authenticated", sub: a.user }, async (tx) => {
        await tx.query(
          "insert into public.proof_assumptions (user_id, opportunity_id, position, title, category) values ($1, $2, 1, 'Will pay', 'willingness_to_pay')",
          [a.user, a.opp],
        );
        await tx.query(
          `insert into public.proof_evidence (user_id, opportunity_id, assumption_id, task_id, week_id, legacy_evidence_id, evidence_type, summary)
           values ($1, $2, $3, $4, $5, $6, 'interview', 'They lose patients.')`,
          [a.user, a.opp, a.assumption, a.task, a.week, a.legacy],
        );
        await tx.query(
          "insert into public.opportunity_economics (user_id, opportunity_id, price_per_customer) values ($1, $2, 100) on conflict (opportunity_id) do update set price_per_customer = 120",
          [a.user, a.opp],
        );
        const { rows } = await tx.query<{ id: string }>(
          "insert into public.roadmaps (user_id, opportunity_id) values ($1, $2) returning id",
          [a.user, a.opp2],
        );
        const roadmap = rows[0].id;
        const phase = (
          await tx.query<{ id: string }>(
            "insert into public.roadmap_phases (roadmap_id, user_id, order_index, key, title) values ($1, $2, 0, 'p', 't') returning id",
            [roadmap, a.user],
          )
        ).rows[0].id;
        const week = (
          await tx.query<{ id: string }>(
            "insert into public.roadmap_weeks (phase_id, user_id, order_index, week_number, title, objective, roadmap_id, global_number) values ($1, $2, 0, 1, 't', 'o', $3, 1) returning id",
            [phase, a.user, roadmap],
          )
        ).rows[0].id;
        await tx.query(
          "insert into public.roadmap_tasks (phase_id, user_id, order_index, what, why, how, done_when, week_id) values ($1, $2, 0, 'w', 'w', 'h', 'd', $3)",
          [phase, a.user, week],
        );
        await tx.query(
          "update public.profiles set active_opportunity_id = $1, locale = 'hi' where id = $2",
          [a.opp, a.user],
        );
        await tx.query("update public.roadmaps set status = 'completed' where id = $1", [roadmap]);
      });
    });

    it("reads and deletes are unchanged: A sees and removes only A's rows", async () => {
      await db.as({ role: "authenticated", sub: a.user }, async (tx) => {
        const mine = await tx.query<{ n: number }>(
          "select count(*)::int as n from public.proof_evidence",
        );
        expect(mine.rows[0].n).toBeGreaterThan(0);
        const theirs = await tx.query("select id from public.opportunities where id = $1", [b.opp]);
        expect(theirs.rows).toHaveLength(0);
        const removed = await tx.query("delete from public.proof_evidence where user_id = $1", [
          a.user,
        ]);
        expect(removed.affectedRows).toBeGreaterThan(0);
      });
    });
  });
});

describe("control: the same API calls WITHOUT 0013 (why it exists)", () => {
  it("lets A squat B's assumption slot, after which B's own write is refused", async () => {
    const db = await TestDb.create({ migrateUpTo: 12 });
    try {
      const a = await seedFounder(db, "a@example.test", false);
      const b = await seedFounder(db, "b@example.test", false);
      // A, through the API role, writes an assumption onto B's opportunity: accepted.
      await db.as({ role: "authenticated", sub: a.user }, (tx) =>
        tx.query(
          "insert into public.proof_assumptions (user_id, opportunity_id, position, title, category) values ($1, $2, 0, 'squat', 'other')",
          [a.user, b.opp],
        ),
      );
      // B can't see it (owner policy), but B's own first assumption now collides with it.
      await expect(
        db.as({ role: "authenticated", sub: b.user }, (tx) =>
          tx.query(
            "insert into public.proof_assumptions (user_id, opportunity_id, position, title, category) values ($1, $2, 0, 'mine', 'problem')",
            [b.user, b.opp],
          ),
        ),
      ).rejects.toThrow(/duplicate key/i);
    } finally {
      await db.close();
    }
  }, 180_000);
});
