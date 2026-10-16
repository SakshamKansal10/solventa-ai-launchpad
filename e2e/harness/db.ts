import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";

/**
 * A real Postgres (PGlite, in-process WASM) with the repo's own migrations
 * applied, standing in for Supabase's database in tests. Defaults, unique
 * indexes, CHECK constraints, triggers and row-level-security policies all
 * behave exactly as production Postgres does — which is the point: E2E and
 * integration tests exercise the migration SQL itself, and nothing here ever
 * touches the real project.
 *
 * Supabase-specific pieces the migrations lean on (the `auth` and `storage`
 * schemas, `auth.uid()`, the API roles, default grants) are stubbed below.
 */

const MIGRATIONS_DIR = path.resolve(process.cwd(), "supabase/migrations");

const SUPABASE_STUBS = /* sql */ `
create schema if not exists auth;
create schema if not exists storage;

do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  encrypted_password text,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  email_confirmed_at timestamptz default now(),
  last_sign_in_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
create or replace function auth.role() returns text language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon')
$$;
create or replace function auth.jwt() returns jsonb language sql stable as $$
  select jsonb_build_object('sub', auth.uid(), 'role', auth.role())
$$;

create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[],
  created_at timestamptz not null default now()
);
create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text not null,
  owner uuid,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bucket_id, name)
);
alter table storage.objects enable row level security;
create or replace function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name, '/'))[1:greatest(array_length(string_to_array(name, '/'), 1) - 1, 0)]
$$;

grant usage on schema public, auth, storage to anon, authenticated, service_role;
grant execute on all functions in schema auth, storage to anon, authenticated, service_role;
grant select, insert, update, delete on storage.objects to anon, authenticated, service_role;
grant select on storage.buckets to anon, authenticated, service_role;
grant select on auth.users to service_role;

alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
`;

export type DbRole = "anon" | "authenticated" | "service_role";

export interface Claims {
  role: DbRole;
  sub?: string;
}

export function migrationFiles(upTo?: number): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^\d{4}_.+\.sql$/.test(f))
    .sort()
    .filter((f) => upTo === undefined || Number(f.slice(0, 4)) <= upTo);
}

/** Postgres' "duplicate_*" family (SQLSTATE 42P06/42P07/42701/42710/42723/42P04):
 * the object a statement tried to create is already there. */
function isAlreadyExistsError(err: unknown): boolean {
  const code = (err as { code?: string } | null)?.code ?? "";
  if (["42P06", "42P07", "42701", "42710", "42723", "42P04"].includes(code)) return true;
  return /already exists/i.test((err as Error | null)?.message ?? "");
}

export class TestDb {
  private constructor(readonly pg: PGlite) {}

  /** `migrateUpTo` lets a test simulate a database that has not had the newest
   * migration applied yet (the app must degrade gracefully, not crash). */
  static async create(opts: { migrateUpTo?: number; dataDir?: string } = {}): Promise<TestDb> {
    // With `dataDir` the database lives on disk and survives restarts (the local
    // comparison server); without it, it is in-memory and disposable (tests).
    const pg = opts.dataDir ? new PGlite(opts.dataDir) : new PGlite();
    await pg.waitReady;
    const db = new TestDb(pg);

    let isFreshDb = true;
    if (opts.dataDir) {
      const existing = await pg.query<{ r: string | null }>(
        "select to_regclass('public.profiles')::text as r",
      );
      isFreshDb = !existing.rows[0]?.r;
    }
    if (isFreshDb) await pg.exec(SUPABASE_STUBS);

    // A ledger of which migration files have actually run, so an on-disk database
    // (which survives restarts) picks up migrations added to the repo AFTER it was
    // first created, instead of silently staying on whatever schema it started with.
    await pg.exec(
      "create table if not exists public._e2e_migrations_applied (filename text primary key, applied_at timestamptz not null default now())",
    );
    const applied = new Set(
      (
        await pg.query<{ filename: string }>("select filename from public._e2e_migrations_applied")
      ).rows.map((r) => r.filename),
    );

    for (const file of migrationFiles(opts.migrateUpTo)) {
      if (applied.has(file)) continue;
      const sql = readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
      try {
        await pg.exec(sql);
      } catch (err) {
        // A database that predates this ledger already ran its older migrations
        // without recording them. Postgres reporting one of their objects as
        // already existing IS the proof this file already ran — record it and
        // move on rather than treating it as a real failure.
        if (!isFreshDb && isAlreadyExistsError(err)) {
          await pg.query("insert into public._e2e_migrations_applied (filename) values ($1)", [
            file,
          ]);
          continue;
        }
        throw new Error(`Migration ${file} failed on the test database: ${(err as Error).message}`);
      }
      await pg.query("insert into public._e2e_migrations_applied (filename) values ($1)", [file]);
    }
    return db;
  }

  /** Runs `fn` inside a transaction as the given API role — RLS applies. */
  async as<T>(claims: Claims, fn: (tx: PGliteTx) => Promise<T>): Promise<T> {
    return this.pg.transaction(async (tx) => {
      await tx.exec(`set local role ${claims.role}`);
      await tx.query(
        "select set_config('request.jwt.claim.sub', $1, true), set_config('request.jwt.claim.role', $2, true)",
        [claims.sub ?? "", claims.role],
      );
      return fn(tx as unknown as PGliteTx);
    });
  }

  /** Superuser (RLS bypassed): seeding and assertions only, never the app path. */
  async admin<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    if (params.length === 0) {
      // No parameters: allow several statements in one call (reset scripts).
      const results = await this.pg.exec(sql);
      return (results[results.length - 1]?.rows ?? []) as T[];
    }
    const res = await this.pg.query<T>(sql, params);
    return res.rows;
  }

  async close() {
    await this.pg.close();
  }
}

export interface PGliteTx {
  query<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<{ rows: T[]; affectedRows?: number }>;
  exec(sql: string): Promise<unknown>;
}
