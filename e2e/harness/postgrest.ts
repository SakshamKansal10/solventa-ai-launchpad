import type { Claims, PGliteTx, TestDb } from "./db";

/**
 * A translation layer from the subset of the PostgREST HTTP API that
 * supabase-js uses in this app into SQL against the test database. It is
 * deliberately small — columns, JSON paths, embedded resources, the common
 * filters, `or`, ordering, limits, counts, insert / upsert / update / delete,
 * and the single-object media type — and it fails loudly (400) on anything
 * else, so an unsupported query shows up in a test rather than passing
 * silently.
 */

export interface RestRequest {
  method: string;
  table: string;
  query: URLSearchParams;
  headers: Record<string, string | undefined>;
  body: unknown;
}

export interface RestResponse {
  status: number;
  headers: Record<string, string>;
  body: string | null;
}

const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;
const q = (ident: string): string => {
  if (!IDENT.test(ident)) throw new RestError(400, "PGRST100", `Invalid identifier: ${ident}`);
  return `"${ident}"`;
};

class RestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: string | null = null,
    readonly hint: string | null = null,
  ) {
    super(message);
  }
}

// ── select parsing ─────────────────────────────────────────────────────────

type JsonStep = { op: "->" | "->>"; key: string };
type SelectItem =
  | { kind: "star" }
  | { kind: "col"; name: string; alias?: string; path: JsonStep[] }
  | { kind: "embed"; name: string; alias?: string; children: SelectItem[] };

function splitTopLevel(input: string, sep = ","): string[] {
  const out: string[] = [];
  let depth = 0;
  let quoted = false;
  let cur = "";
  for (const ch of input) {
    if (ch === '"') quoted = !quoted;
    if (!quoted) {
      if (ch === "(") depth++;
      if (ch === ")") depth--;
      if (ch === sep && depth === 0) {
        out.push(cur);
        cur = "";
        continue;
      }
    }
    cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out.map((s) => s.trim()).filter(Boolean);
}

function parseColumnExpr(expr: string): { name: string; path: JsonStep[] } {
  const parts = expr.split(/(->>|->)/);
  const name = parts[0];
  const path: JsonStep[] = [];
  for (let i = 1; i < parts.length; i += 2) {
    path.push({ op: parts[i] as "->" | "->>", key: parts[i + 1] });
  }
  return { name, path };
}

function parseSelect(select: string): SelectItem[] {
  return splitTopLevel(select).map((raw): SelectItem => {
    if (raw === "*") return { kind: "star" };
    let alias: string | undefined;
    let expr = raw;
    // `alias:expr` — but not the `::cast` operator.
    const aliasMatch = /^([A-Za-z_][A-Za-z0-9_]*):(?!:)(.+)$/.exec(raw);
    if (aliasMatch) {
      alias = aliasMatch[1];
      expr = aliasMatch[2];
    }
    const embed = /^([A-Za-z_][A-Za-z0-9_]*)(?:![A-Za-z0-9_]+)*\((.*)\)$/.exec(expr);
    if (embed) {
      return { kind: "embed", name: embed[1], alias, children: parseSelect(embed[2]) };
    }
    const { name, path } = parseColumnExpr(expr);
    return { kind: "col", name, alias, path };
  });
}

// ── relationships ──────────────────────────────────────────────────────────

interface Fk {
  child: string;
  parent: string;
  childCol: string;
  parentCol: string;
}

async function loadForeignKeys(tx: PGliteTx): Promise<Fk[]> {
  const { rows } = await tx.query<{
    child: string;
    parent: string;
    child_cols: string[];
    parent_cols: string[];
  }>(`
    select
      cc.relname as child, pc.relname as parent,
      (select array_agg(a.attname order by k.ord) from unnest(con.conkey) with ordinality k(attnum, ord)
         join pg_attribute a on a.attrelid = con.conrelid and a.attnum = k.attnum) as child_cols,
      (select array_agg(a.attname order by k.ord) from unnest(con.confkey) with ordinality k(attnum, ord)
         join pg_attribute a on a.attrelid = con.confrelid and a.attnum = k.attnum) as parent_cols
    from pg_constraint con
    join pg_class cc on cc.oid = con.conrelid
    join pg_class pc on pc.oid = con.confrelid
    join pg_namespace ns on ns.oid = cc.relnamespace
    where con.contype = 'f' and ns.nspname = 'public'`);
  return rows
    .filter((r) => r.child_cols.length === 1)
    .map((r) => ({
      child: r.child,
      parent: r.parent,
      childCol: r.child_cols[0],
      parentCol: r.parent_cols[0],
    }));
}

// ── SQL building ───────────────────────────────────────────────────────────

class Params {
  readonly values: unknown[] = [];
  add(v: unknown): string {
    this.values.push(v);
    return `$${this.values.length}`;
  }
}

function columnRef(alias: string, name: string, path: JsonStep[], asText = false): string {
  let sql = `${alias}.${q(name)}`;
  path.forEach((step, i) => {
    const last = i === path.length - 1;
    const op = last && asText ? "->>" : step.op;
    sql += `${op}'${step.key.replace(/'/g, "''")}'`;
  });
  return path.length > 0 ? `(${sql})` : sql;
}

let aliasCounter = 0;
const freshAlias = () => `e${++aliasCounter}`;

function buildColumns(table: string, alias: string, items: SelectItem[], fks: Fk[]): string {
  const cols: string[] = [];
  for (const item of items) {
    if (item.kind === "star") {
      cols.push(`${alias}.*`);
    } else if (item.kind === "col") {
      const out =
        item.alias ?? (item.path.length > 0 ? item.path[item.path.length - 1].key : item.name);
      cols.push(`${columnRef(alias, item.name, item.path)} as ${q(out)}`);
    } else {
      cols.push(`${buildEmbed(table, alias, item, fks)} as ${q(item.alias ?? item.name)}`);
    }
  }
  return cols.length > 0 ? cols.join(", ") : `${alias}.*`;
}

function buildEmbed(
  table: string,
  alias: string,
  item: Extract<SelectItem, { kind: "embed" }>,
  fks: Fk[],
): string {
  const inner = freshAlias();
  const outer = freshAlias();
  const many = fks.find((f) => f.child === item.name && f.parent === table);
  if (many) {
    const cols = buildColumns(item.name, inner, item.children, fks);
    return `coalesce((select json_agg(to_json(${outer})) from (select ${cols} from ${q(item.name)} ${inner} where ${inner}.${q(many.childCol)} = ${alias}.${q(many.parentCol)}) ${outer}), '[]'::json)`;
  }
  const one = fks.find((f) => f.child === table && f.parent === item.name);
  if (one) {
    const cols = buildColumns(item.name, inner, item.children, fks);
    return `(select to_json(${outer}) from (select ${cols} from ${q(item.name)} ${inner} where ${inner}.${q(one.parentCol)} = ${alias}.${q(one.childCol)}) ${outer})`;
  }
  throw new RestError(
    400,
    "PGRST200",
    `Could not find a relationship between '${table}' and '${item.name}' in the schema cache`,
  );
}

const OPERATORS: Record<string, string> = {
  eq: "=",
  neq: "<>",
  gt: ">",
  gte: ">=",
  lt: "<",
  lte: "<=",
  like: "like",
  ilike: "ilike",
};

function parseList(raw: string): string[] {
  const inner = raw.replace(/^\(/, "").replace(/\)$/, "");
  return splitTopLevel(inner).map((s) => s.replace(/^"(.*)"$/, "$1"));
}

function condition(
  alias: string,
  left: string,
  op: string,
  value: string,
  params: Params,
  negate = false,
): string {
  const { name, path } = parseColumnExpr(left);
  const isJson = path.length > 0;
  const ref = columnRef(alias, name, path, isJson && !["cs", "cd"].includes(op));
  let sql: string;
  if (op === "is") {
    const v = value.toLowerCase();
    if (v === "null") sql = `${ref} is null`;
    else if (v === "true") sql = `${ref} is true`;
    else if (v === "false") sql = `${ref} is false`;
    else throw new RestError(400, "PGRST100", `Unsupported IS value: ${value}`);
  } else if (op === "in") {
    sql = `${ref}::text = any(${params.add(parseList(value))}::text[])`;
  } else if (op === "cs") {
    sql = `${ref} @> ${params.add(value)}::jsonb`;
  } else if (op in OPERATORS) {
    const val = op === "like" || op === "ilike" ? value.replace(/\*/g, "%") : value;
    sql = `${ref} ${OPERATORS[op]} ${params.add(val)}`;
  } else {
    throw new RestError(400, "PGRST100", `Unsupported operator: ${op}`);
  }
  return negate ? `not (${sql})` : sql;
}

function parseLogic(alias: string, expr: string, params: Params, joiner: "and" | "or"): string {
  const inner = expr.replace(/^\(/, "").replace(/\)$/, "");
  const parts = splitTopLevel(inner).map((part) => {
    const nested = /^(and|or)\((.*)\)$/.exec(part);
    if (nested) return parseLogic(alias, `(${nested[2]})`, params, nested[1] as "and" | "or");
    const m = /^(.+?)\.(not\.)?([a-z]+)\.(.*)$/.exec(part);
    if (!m) throw new RestError(400, "PGRST100", `Cannot parse filter: ${part}`);
    return `(${condition(alias, m[1], m[3], m[4], params, Boolean(m[2]))})`;
  });
  return `(${parts.join(` ${joiner} `)})`;
}

const RESERVED = new Set([
  "select",
  "order",
  "limit",
  "offset",
  "on_conflict",
  "columns",
  "and",
  "or",
]);

function buildWhere(alias: string, query: URLSearchParams, params: Params): string {
  const clauses: string[] = [];
  for (const [key, value] of query.entries()) {
    if (key === "or" || key === "and") {
      clauses.push(parseLogic(alias, value, params, key));
      continue;
    }
    if (RESERVED.has(key)) continue;
    const m = /^(not\.)?([a-z]+)\.(.*)$/s.exec(value);
    if (!m) throw new RestError(400, "PGRST100", `Cannot parse filter value: ${key}=${value}`);
    clauses.push(condition(alias, key, m[2], m[3], params, Boolean(m[1])));
  }
  return clauses.length > 0 ? `where ${clauses.join(" and ")}` : "";
}

function buildOrder(alias: string, query: URLSearchParams): string {
  const raw = query.get("order");
  if (!raw) return "";
  const parts = splitTopLevel(raw).map((term) => {
    const [expr, ...mods] = term.split(".");
    const { name, path } = parseColumnExpr(expr);
    let sql = columnRef(alias, name, path, path.length > 0);
    for (const mod of mods) {
      if (mod === "asc") sql += " asc";
      else if (mod === "desc") sql += " desc";
      else if (mod === "nullsfirst") sql += " nulls first";
      else if (mod === "nullslast") sql += " nulls last";
    }
    return sql;
  });
  return `order by ${parts.join(", ")}`;
}

function preferences(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (header ?? "").split(",")) {
    const [k, v] = part.trim().split("=");
    if (k) out[k] = v ?? "true";
  }
  return out;
}

// ── error mapping ──────────────────────────────────────────────────────────

function mapPgError(err: unknown): RestError {
  if (err instanceof RestError) return err;
  const e = err as { code?: string; message?: string; detail?: string; hint?: string };
  const code = e.code ?? "XX000";
  const message = e.message ?? String(err);
  if (code === "42P01") {
    const table = /relation "?(?:public\.)?([^"]+)"? does not exist/.exec(message)?.[1] ?? "?";
    return new RestError(
      404,
      "PGRST205",
      `Could not find the table 'public.${table}' in the schema cache`,
    );
  }
  if (code === "42703") return new RestError(400, "42703", message);
  if (code === "23505" || code === "23503")
    return new RestError(409, code, message, e.detail ?? null);
  if (code === "42501") return new RestError(403, code, message);
  if (/^(23|22|42)/.test(code))
    return new RestError(400, code, message, e.detail ?? null, e.hint ?? null);
  return new RestError(500, code, message, e.detail ?? null);
}

// ── the handler ────────────────────────────────────────────────────────────

export async function handleRest(
  db: TestDb,
  req: RestRequest,
  claims: Claims,
): Promise<RestResponse> {
  try {
    return await db.as(claims, async (tx) => run(tx, req));
  } catch (err) {
    const e = mapPgError(err);
    if (process.env.E2E_LOG_DB_ERRORS)
      console.error("[fake-supabase]", req.method, req.table, e.code, e.message);
    return {
      status: e.status,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: e.code, details: e.details, hint: e.hint, message: e.message }),
    };
  }
}

async function run(tx: PGliteTx, req: RestRequest): Promise<RestResponse> {
  const table = q(req.table);
  const prefer = preferences(req.headers["prefer"]);
  const wantsSingle = /application\/vnd\.pgrst\.object\+json/.test(req.headers["accept"] ?? "");
  const fks = await loadForeignKeys(tx);
  const params = new Params();
  const selectParam = req.query.get("select") ?? "*";
  const items = parseSelect(selectParam);
  const json = { "content-type": "application/json" };

  const finish = (
    rows: unknown[],
    status: number,
    extra: Record<string, string> = {},
  ): RestResponse => {
    if (wantsSingle) {
      if (rows.length !== 1) {
        throw new RestError(
          406,
          "PGRST116",
          "JSON object requested, multiple (or no) rows returned",
          `The result contains ${rows.length} rows`,
        );
      }
      return { status, headers: { ...json, ...extra }, body: JSON.stringify(rows[0]) };
    }
    return { status, headers: { ...json, ...extra }, body: JSON.stringify(rows) };
  };

  if (req.method === "GET" || req.method === "HEAD") {
    const where = buildWhere("t", req.query, params);
    const order = buildOrder("t", req.query);
    const limit = req.query.get("limit") ? `limit ${Number(req.query.get("limit"))}` : "";
    const offset = req.query.get("offset") ? `offset ${Number(req.query.get("offset"))}` : "";
    const cols = buildColumns(req.table, "t", items, fks);
    const res = await tx.query<{ data: unknown[] }>(
      `select coalesce(json_agg(to_json(r)), '[]'::json) as data from (select ${cols} from ${table} t ${where} ${order} ${limit} ${offset}) r`,
      params.values,
    );
    const rows = res.rows[0].data as unknown[];
    const extra: Record<string, string> = {};
    if (prefer["count"]) {
      const c = await tx.query<{ n: string | number }>(
        `select count(*) as n from ${table} t ${where}`,
        params.values,
      );
      const total = Number(c.rows[0].n);
      extra["content-range"] = `${rows.length > 0 ? `0-${rows.length - 1}` : "*"}/${total}`;
    }
    if (req.method === "HEAD") return { status: 200, headers: extra, body: null };
    return finish(rows, 200, extra);
  }

  const returning = prefer["return"] === "representation";
  const asCte = (write: string, ret = "*") => {
    const cols = buildColumns(req.table, "t", items, fks);
    return `with w as (${write} returning ${ret}) select coalesce(json_agg(to_json(r)), '[]'::json) as data from (select ${cols} from w t) r`;
  };

  if (req.method === "POST") {
    const rowsIn = Array.isArray(req.body) ? req.body : [req.body];
    if (rowsIn.length === 0) return finish([], 201);
    const keys = [...new Set(rowsIn.flatMap((r) => Object.keys(r as object)))];
    if (keys.length === 0) throw new RestError(400, "PGRST102", "Empty or invalid json");
    const cols = keys.map(q).join(", ");
    const payload = params.add(JSON.stringify(rowsIn));
    let write = `insert into ${table} (${cols}) select ${cols} from json_populate_recordset(null::${table}, ${payload}::json)`;
    const resolution = prefer["resolution"];
    if (resolution) {
      const conflict = req.query.get("on_conflict");
      const target = conflict
        ? `(${conflict
            .split(",")
            .map((c) => q(c.trim()))
            .join(", ")})`
        : "";
      if (resolution === "ignore-duplicates") {
        write += ` on conflict ${target} do nothing`;
      } else {
        const conflictCols = new Set((conflict ?? "").split(",").map((c) => c.trim()));
        const sets = keys
          .filter((k) => !conflictCols.has(k))
          .map((k) => `${q(k)} = excluded.${q(k)}`);
        write +=
          sets.length > 0
            ? ` on conflict ${target} do update set ${sets.join(", ")}`
            : ` on conflict ${target} do nothing`;
      }
    }
    const res = await tx.query<{ data: unknown[] }>(asCte(write), params.values);
    const rows = res.rows[0].data as unknown[];
    return returning ? finish(rows, 201) : { status: 201, headers: {}, body: null };
  }

  if (req.method === "PATCH") {
    const patch = (req.body ?? {}) as Record<string, unknown>;
    const keys = Object.keys(patch);
    if (keys.length === 0)
      return returning ? finish([], 200) : { status: 204, headers: {}, body: null };
    const payload = params.add(JSON.stringify(patch));
    const sets = keys.map((k) => `${q(k)} = p.${q(k)}`).join(", ");
    const where = buildWhere("t", req.query, params);
    const write = `update ${table} t set ${sets} from json_populate_record(null::${table}, ${payload}::json) p ${where}`;
    const res = await tx.query<{ data: unknown[] }>(asCte(write, "t.*"), params.values);
    const rows = res.rows[0].data as unknown[];
    if (wantsSingle) return finish(rows, 200);
    return returning ? finish(rows, 200) : { status: 204, headers: {}, body: null };
  }

  if (req.method === "DELETE") {
    const where = buildWhere("t", req.query, params);
    const write = `delete from ${table} t ${where}`;
    const res = await tx.query<{ data: unknown[] }>(asCte(write), params.values);
    const rows = res.rows[0].data as unknown[];
    return returning ? finish(rows, 200) : { status: 204, headers: {}, body: null };
  }

  throw new RestError(405, "PGRST117", `Unsupported method ${req.method}`);
}
