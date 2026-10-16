import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { TestDb } from "../../../e2e/harness/db";

/**
 * The production migration files in supabase/production, run against a database
 * shaped like production on 2026-10-05: the repo's 0001-0008 plus the teacher's
 * different 0009 (avatar upload), with no opportunity_index and none of 0010-0013
 * (confirmed by read-only probes). Real Postgres (PGlite); nothing touches production.
 */
const PROD = path.resolve(process.cwd(), "supabase/production");
const MIGRATIONS = path.resolve(process.cwd(), "supabase/migrations");
const read = (dir: string, file: string) => readFileSync(path.join(dir, file), "utf8");
const APPLY = read(PROD, "apply-production-final.sql");
const PREFLIGHT = read(PROD, "preflight-production-final.sql");
const ROLLBACK = read(PROD, "rollback-production-final.sql");

/** origin/main: supabase/migrations/0009_avatar_upload.sql (the production 0009). */
const TEACHER_0009_AVATAR = `
alter table public.profiles add column if not exists avatar_url text;
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true)
on conflict (id) do nothing;
drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read" on storage.objects for select using (bucket_id = 'avatars');
drop policy if exists "avatars_owner_insert" on storage.objects;
create policy "avatars_owner_insert" on storage.objects for insert with check (
  bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "avatars_owner_update" on storage.objects;
create policy "avatars_owner_update" on storage.objects for update using (
  bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "avatars_owner_delete" on storage.objects;
create policy "avatars_owner_delete" on storage.objects for delete using (
  bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
`;

async function productionShaped(): Promise<{ db: TestDb; legacyNote: string }> {
  const db = await TestDb.create({ migrateUpTo: 8 });
  await db.admin(TEACHER_0009_AVATAR);
  // One founder with a legacy Evidence Vault note, so the copy step has work to do.
  const [u] = await db.admin<{ id: string }>(
    "insert into auth.users (email) values ('founder@example.test') returning id",
    [],
  );
  const [dna] = await db.admin<{ id: string }>(
    "insert into public.business_dna (user_id, onboarding_answers, normalized_signals) values ($1, '{}', '{}') returning id",
    [u.id],
  );
  const [opp] = await db.admin<{ id: string }>(
    `insert into public.opportunities (user_id, business_dna_id, title, one_liner, fit_score, score_breakdown, candidate)
     values ($1, $2, 'Direction', 'One line', 70, '{}', '{}') returning id`,
    [u.id, dna.id],
  );
  const [note] = await db.admin<{ id: string }>(
    "insert into public.founder_evidence (user_id, opportunity_id, category, entry_type, content, key_quote) values ($1, $2, 'problem', 'interview', 'They lose patients', 'Nobody follows up') returning id",
    [u.id, opp.id],
  );
  return { db, legacyNote: note.id };
}

/** A fingerprint of the schema objects this bundle could touch. */
async function schemaState(db: TestDb) {
  const [s] = await db.admin<Record<string, unknown>>(`
    select
      (select count(*) from information_schema.columns
        where table_schema = 'public' and table_name = 'opportunities' and column_name = 'opportunity_index')::int as opportunity_index,
      (select count(*) from information_schema.tables where table_schema = 'public'
        and table_name in ('consultation_drafts', 'content_translations', 'proof_assumptions', 'proof_evidence', 'opportunity_economics'))::int as new_tables,
      (select count(*) from information_schema.columns where table_schema = 'public'
        and (table_name, column_name) in (('profiles', 'active_opportunity_id'), ('roadmap_weeks', 'generation_status'), ('roadmap_tasks', 'steps'), ('roadmaps', 'build_error')))::int as new_columns,
      (select count(*) from pg_policies where policyname like '%\\_refs\\_owned')::int as refs_owned_policies,
      (select count(*) from pg_policies where schemaname = 'storage' and policyname in ('avatars_insert_own', 'proof_files_select_own'))::int as new_storage_policies,
      (select count(*) from pg_policies where schemaname = 'storage' and policyname = 'avatars_public_read')::int as avatars_public_read,
      (select count(*) from storage.buckets where id = 'proof-files')::int as proof_files_bucket,
      (select pg_get_constraintdef(oid) from pg_constraint where conname = 'roadmaps_status_check') as roadmaps_status_check,
      (select convalidated from pg_constraint where conname = 'roadmaps_status_check') as status_check_validated
  `);
  return s;
}

describe("production migration bundle (apply-production-final.sql)", () => {
  it("embeds the opportunity_index column and migrations 0010-0013 verbatim, in order, inside one transaction", () => {
    const body = APPLY.replace(/^--.*$/gm, "");
    expect(body.trim().startsWith("begin;")).toBe(true);
    expect(body.trim().endsWith("commit;")).toBe(true);
    const at = (s: string) => {
      const i = APPLY.indexOf(s);
      expect(i, s.slice(0, 60)).toBeGreaterThan(-1);
      return i;
    };
    const order = [
      at("alter table public.opportunities add column if not exists opportunity_index int;"),
      at(read(MIGRATIONS, "0010_founder_os.sql").trim()),
      at(read(MIGRATIONS, "0011_opportunity_economics.sql").trim()),
      at(read(MIGRATIONS, "0012_evidence_title_types.sql").trim()),
      at(read(MIGRATIONS, "0013_reference_ownership_rls.sql").trim()),
    ];
    expect([...order].sort((x, y) => x - y)).toEqual(order);
    // Nothing that cannot run inside a transaction.
    expect(body).not.toMatch(/\bconcurrently\b|\bvacuum\b|alter\s+system|add\s+value/i);
  });

  it("preflight is read-only: it runs on production's shape and changes nothing", async () => {
    const { db } = await productionShaped();
    try {
      const before = await schemaState(db);
      await db.admin(PREFLIGHT);
      expect(await schemaState(db)).toEqual(before);
      expect(PREFLIGHT.replace(/--.*$/gm, "")).not.toMatch(
        /\b(insert|update|delete|alter|create|drop|truncate|grant|revoke)\b/i,
      );
    } finally {
      await db.close();
    }
  }, 180_000);

  it("is atomic: an error before COMMIT leaves production exactly as it was", async () => {
    const { db } = await productionShaped();
    try {
      const before = await schemaState(db);
      const failing = APPLY.replace(/commit;\s*$/, "select 1 / 0;\ncommit;\n");
      await expect(db.admin(failing)).rejects.toThrow(/division by zero/);
      await db.admin("rollback");
      expect(await schemaState(db)).toEqual(before);
    } finally {
      await db.close();
    }
  }, 180_000);

  it("applies cleanly, copies legacy notes once, is idempotent, rolls back, and re-applies", async () => {
    const { db, legacyNote } = await productionShaped();
    try {
      await db.admin(APPLY);
      const applied = await schemaState(db);
      expect(applied).toMatchObject({
        opportunity_index: 1,
        new_tables: 5,
        new_columns: 4,
        refs_owned_policies: 8,
        new_storage_policies: 2,
        avatars_public_read: 1,
        proof_files_bucket: 1,
        status_check_validated: true,
      });
      expect(String(applied.roadmaps_status_check)).toMatch(/building/);
      const [avatars] = await db.admin<{ file_size_limit: number; public: boolean }>(
        "select file_size_limit, public from storage.buckets where id = 'avatars'",
      );
      expect(avatars).toMatchObject({ file_size_limit: 5242880, public: true });

      // Second run: no error, and the legacy note is still copied exactly once.
      await db.admin(APPLY);
      const copies = await db.admin<{ n: number }>(
        "select count(*)::int as n from public.proof_evidence where legacy_evidence_id = $1",
        [legacyNote],
      );
      expect(copies[0].n).toBe(1);

      // A roadmap in a new status must not make the rollback fail.
      const [{ id: opp }] = await db.admin<{ id: string }>(
        "select id from public.opportunities limit 1",
      );
      const [{ user_id }] = await db.admin<{ user_id: string }>(
        "select user_id from public.opportunities where id = $1",
        [opp],
      );
      await db.admin(
        "insert into public.roadmaps (user_id, opportunity_id, status) values ($1, $2, 'completed')",
        [user_id, opp],
      );

      await db.admin(ROLLBACK);
      const rolledBack = await schemaState(db);
      expect(rolledBack).toMatchObject({
        opportunity_index: 1, // kept on purpose
        new_tables: 0,
        new_columns: 0,
        refs_owned_policies: 0,
        new_storage_policies: 0,
        avatars_public_read: 1, // pre-existing, kept
        status_check_validated: false, // restored NOT VALID
      });
      expect(String(rolledBack.roadmaps_status_check)).not.toMatch(/building/);
      const kept = await db.admin<{ status: string }>(
        "select status from public.roadmaps where opportunity_id = $1",
        [opp],
      );
      expect(kept[0].status).toBe("completed"); // no row rewritten
      const [avatarsAfter] = await db.admin<{ file_size_limit: number | null }>(
        "select file_size_limit from storage.buckets where id = 'avatars'",
      );
      expect(avatarsAfter.file_size_limit).toBeNull();

      // And it can be applied again afterwards.
      await db.admin("update public.roadmaps set status = 'active' where status = 'completed'");
      await db.admin(APPLY);
      expect(await schemaState(db)).toMatchObject({ new_tables: 5, refs_owned_policies: 8 });
    } finally {
      await db.close();
    }
  }, 240_000);
});
