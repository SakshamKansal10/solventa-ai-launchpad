import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import fs from "node:fs";
import path from "node:path";

import { TestDb, type Claims } from "./db";
import { FakeGemini, type GeminiConfig } from "./fake-gemini";
import { handleRest } from "./postgrest";

/**
 * One local HTTP server that impersonates, for tests only:
 *   /rest/v1     PostgREST      (see postgrest.ts — backed by a real Postgres)
 *   /auth/v1     GoTrue         (password, OTP, PKCE/OAuth, refresh, logout)
 *   /storage/v1  Storage        (upload / public / signed URL / remove, RLS-checked)
 *   /gemini      Gemini         (see fake-gemini.ts)
 *   /__admin     test control   (reset, SQL, create user, tune Gemini)
 * Nothing here can reach the real Supabase project: the app is pointed at this
 * server through its environment, and the harness refuses to start otherwise.
 */

const ONE_PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

const b64url = (input: string | Buffer) => Buffer.from(input).toString("base64url");

export interface FakeSession {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  expires_in: number;
  expires_at: number;
  user: Record<string, unknown>;
}

interface UserRow {
  id: string;
  email: string;
  raw_user_meta_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface FakeStack {
  port: number;
  url: string;
  anonKey: string;
  db: TestDb;
  gemini: FakeGemini;
  /** Cookie a browser needs to be signed in as `session.user`. */
  cookieFor(session: FakeSession): { name: string; value: string };
  createUser(input: {
    email: string;
    password?: string;
    fullName?: string;
    id?: string;
  }): Promise<{ user: UserRow; session: FakeSession }>;
  reset(): Promise<void>;
  close(): Promise<void>;
}

function jwt(payload: Record<string, unknown>): string {
  return `${b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }))}.${b64url(JSON.stringify(payload))}.${b64url("fake-signature")}`;
}

function decodeJwt(token: string | undefined): Record<string, unknown> | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as Record<
      string,
      unknown
    >;
  } catch {
    return null;
  }
}

/** Extracts the uploaded file from a multipart/form-data body (the part that
 * carries a filename, or the first part with its own content type). */
function parseMultipart(raw: Buffer, header: string): { data: Buffer; contentType: string } | null {
  const boundary = /boundary=([^;]+)/i.exec(header)?.[1]?.replace(/^"|"$/g, "");
  if (!boundary) return null;
  const delimiter = Buffer.from("--" + boundary);
  const CRLF = "\r\n";
  let cursor = raw.indexOf(delimiter);
  while (cursor !== -1) {
    const next = raw.indexOf(delimiter, cursor + delimiter.length);
    if (next === -1) break;
    const part = raw.subarray(cursor + delimiter.length, next);
    const split = part.indexOf(Buffer.from(CRLF + CRLF));
    if (split !== -1) {
      const head = part.subarray(0, split).toString("utf8");
      const isFile = /filename=/i.test(head) || /content-type:/i.test(head);
      if (isFile) {
        let data = part.subarray(split + 4);
        if (data.subarray(data.length - 2).toString() === CRLF)
          data = data.subarray(0, data.length - 2);
        const type =
          /content-type:\s*([^\r\n;]+)/i.exec(head)?.[1]?.trim() ?? "application/octet-stream";
        return { data, contentType: type };
      }
    }
    cursor = next;
  }
  return null;
}

interface StoredBlob {
  data: Buffer;
  contentType: string;
}

/** Uploaded files: in memory for tests, on disk (next to the database) for the
 * local comparison server so photos survive a restart. */
function makeBlobStore(dir?: string) {
  if (!dir) {
    const map = new Map<string, StoredBlob>();
    return {
      get: (k: string) => map.get(k),
      set: (k: string, v: StoredBlob) => void map.set(k, v),
      delete: (k: string) => void map.delete(k),
      clear: () => map.clear(),
    };
  }
  fs.mkdirSync(dir, { recursive: true });
  const file = (k: string) => path.join(dir, encodeURIComponent(k));
  return {
    get: (k: string): StoredBlob | undefined => {
      try {
        return {
          data: fs.readFileSync(file(k)),
          contentType: fs.readFileSync(file(k) + ".type", "utf8"),
        };
      } catch {
        return undefined;
      }
    },
    set: (k: string, v: StoredBlob) => {
      fs.writeFileSync(file(k), v.data);
      fs.writeFileSync(file(k) + ".type", v.contentType);
    },
    delete: (k: string) => {
      fs.rmSync(file(k), { force: true });
      fs.rmSync(file(k) + ".type", { force: true });
    },
    clear: () => {
      for (const f of fs.readdirSync(dir)) fs.rmSync(path.join(dir, f), { force: true });
    },
  };
}

async function readBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks);
}

export async function startFakeStack(
  opts: { port?: number; migrateUpTo?: number; dataDir?: string } = {},
): Promise<FakeStack> {
  const db = await TestDb.create({ migrateUpTo: opts.migrateUpTo, dataDir: opts.dataDir });
  const gemini = new FakeGemini();
  const blobs = makeBlobStore(opts.dataDir ? path.join(opts.dataDir, "..", "blobs") : undefined);
  const refreshTokens = new Map<string, string>();
  const revoked = new Set<string>();
  const oauthCodes = new Map<string, string>();
  const stats = { rest: 0, auth: 0, storage: 0, gemini: 0 };

  let origin = "";
  const ANON_KEY = jwt({ role: "anon", iss: "supabase-test", exp: 4_102_444_800 });

  const publicUser = (u: UserRow) => ({
    id: u.id,
    aud: "authenticated",
    role: "authenticated",
    email: u.email,
    email_confirmed_at: u.created_at,
    phone: "",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: u.raw_user_meta_data,
    identities: [],
    created_at: u.created_at,
    updated_at: u.updated_at,
  });

  const makeSession = (u: UserRow): FakeSession => {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 3600;
    const access = jwt({
      iss: `${origin}/auth/v1`,
      aud: "authenticated",
      sub: u.id,
      email: u.email,
      role: "authenticated",
      aal: "aal1",
      session_id: randomUUID(),
      user_metadata: u.raw_user_meta_data,
      app_metadata: { provider: "email", providers: ["email"] },
      iat: now,
      exp,
      jti: randomUUID(),
    });
    const refresh = randomUUID();
    refreshTokens.set(refresh, u.id);
    return {
      access_token: access,
      refresh_token: refresh,
      token_type: "bearer",
      expires_in: 3600,
      expires_at: exp,
      user: publicUser(u),
    };
  };

  const findUser = async (where: string, value: string): Promise<UserRow | null> => {
    const rows = await db.admin<UserRow>(
      `select id, email, raw_user_meta_data, created_at::text as created_at, updated_at::text as updated_at from auth.users where ${where} = $1`,
      [value],
    );
    return rows[0] ?? null;
  };

  async function createUser(input: {
    email: string;
    password?: string;
    fullName?: string;
    id?: string;
  }) {
    const meta = input.fullName ? { full_name: input.fullName } : {};
    const rows = await db.admin<UserRow>(
      `insert into auth.users (id, email, encrypted_password, raw_user_meta_data)
       values (coalesce($1::uuid, gen_random_uuid()), $2, $3, $4::jsonb)
       returning id, email, raw_user_meta_data, created_at::text as created_at, updated_at::text as updated_at`,
      [
        input.id ?? null,
        input.email.toLowerCase(),
        `plain:${input.password ?? ""}`,
        JSON.stringify(meta),
      ],
    );
    return { user: rows[0], session: makeSession(rows[0]) };
  }

  function claimsFrom(req: IncomingMessage): Claims {
    const bearer = /^Bearer (.+)$/i.exec(String(req.headers["authorization"] ?? ""))?.[1];
    const payload = decodeJwt(bearer);
    if (
      payload &&
      payload.role === "authenticated" &&
      typeof payload.sub === "string" &&
      !revoked.has(bearer!)
    ) {
      const exp = Number(payload.exp ?? 0);
      if (exp * 1000 > Date.now()) return { role: "authenticated", sub: payload.sub };
    }
    return { role: "anon" };
  }

  const send = (
    res: ServerResponse,
    status: number,
    body: unknown,
    headers: Record<string, string> = {},
  ) => {
    const isBuffer = Buffer.isBuffer(body);
    const payload =
      body === null ? "" : isBuffer ? body : typeof body === "string" ? body : JSON.stringify(body);
    res.writeHead(status, {
      ...(isBuffer || typeof body === "string" ? {} : { "content-type": "application/json" }),
      ...headers,
    });
    res.end(payload);
  };

  async function handleAuth(
    req: IncomingMessage,
    res: ServerResponse,
    url: URL,
    body: Record<string, unknown>,
  ) {
    stats.auth++;
    const route = url.pathname.replace(/^\/auth\/v1/, "");
    const grant = url.searchParams.get("grant_type");

    if (route === "/token" && grant === "password") {
      const user = await findUser("email", String(body.email ?? "").toLowerCase());
      const stored = user
        ? (
            await db.admin<{ encrypted_password: string }>(
              "select encrypted_password from auth.users where id = $1",
              [user.id],
            )
          )[0]
        : null;
      if (!user || stored?.encrypted_password !== `plain:${String(body.password ?? "")}`) {
        return send(res, 400, {
          code: 400,
          error_code: "invalid_credentials",
          msg: "Invalid login credentials",
        });
      }
      return send(res, 200, makeSession(user));
    }
    if (route === "/token" && grant === "refresh_token") {
      const userId = refreshTokens.get(String(body.refresh_token ?? ""));
      const user = userId ? await findUser("id::text", userId) : null;
      if (!user)
        return send(res, 400, {
          code: 400,
          error_code: "refresh_token_not_found",
          msg: "Invalid Refresh Token",
        });
      refreshTokens.delete(String(body.refresh_token));
      return send(res, 200, makeSession(user));
    }
    if (route === "/token" && grant === "pkce") {
      const userId = oauthCodes.get(String(body.auth_code ?? ""));
      const user = userId ? await findUser("id::text", userId) : null;
      if (!user)
        return send(res, 400, {
          code: 400,
          error_code: "bad_code_verifier",
          msg: "invalid flow state",
        });
      oauthCodes.delete(String(body.auth_code));
      return send(res, 200, makeSession(user));
    }
    if (route === "/signup") {
      const email = String(body.email ?? "").toLowerCase();
      if (await findUser("email", email)) {
        return send(res, 422, {
          code: 422,
          error_code: "user_already_exists",
          msg: "User already registered",
        });
      }
      const data = (body.data ?? {}) as Record<string, unknown>;
      const { session } = await createUser({
        email,
        password: String(body.password ?? ""),
        fullName: typeof data.full_name === "string" ? data.full_name : undefined,
      });
      return send(res, 200, session);
    }
    if (route === "/otp") {
      const email = String(body.email ?? "").toLowerCase();
      const existing = await findUser("email", email);
      if (!existing && body.create_user === false) {
        return send(res, 400, {
          code: 400,
          error_code: "otp_disabled",
          msg: "Signups not allowed for otp",
        });
      }
      if (!existing) {
        const data = (body.data ?? {}) as { full_name?: unknown };
        await createUser({
          email,
          fullName: typeof data.full_name === "string" ? data.full_name : undefined,
        });
      }
      return send(res, 200, {});
    }
    if (route === "/verify") {
      const user = await findUser("email", String(body.email ?? "").toLowerCase());
      if (!user || String(body.token) !== "123456") {
        return send(res, 403, {
          code: 403,
          error_code: "otp_expired",
          msg: "Token has expired or is invalid",
        });
      }
      return send(res, 200, makeSession(user));
    }
    if (route === "/user" && req.method === "GET") {
      const bearer = /^Bearer (.+)$/i.exec(String(req.headers["authorization"] ?? ""))?.[1];
      const payload = decodeJwt(bearer);
      if (!payload || revoked.has(bearer!) || Number(payload.exp ?? 0) * 1000 <= Date.now()) {
        return send(res, 401, {
          code: 401,
          error_code: "bad_jwt",
          msg: "invalid JWT: unable to parse or verify signature, token is expired",
        });
      }
      const user = await findUser("id::text", String(payload.sub));
      if (!user)
        return send(res, 401, {
          code: 401,
          error_code: "user_not_found",
          msg: "User from sub claim in JWT does not exist",
        });
      return send(res, 200, publicUser(user));
    }
    if (route === "/logout") {
      const bearer = /^Bearer (.+)$/i.exec(String(req.headers["authorization"] ?? ""))?.[1];
      if (bearer) revoked.add(bearer);
      return send(res, 204, null);
    }
    if (route === "/authorize") {
      // Simulates the round trip through Google: a fixed Google account is
      // created on first use, and the browser is sent straight back to the
      // app's callback with a one-time code (which /token?grant_type=pkce then
      // exchanges) — the same shape as the real provider flow.
      const email = "google.tester@example.com";
      const user =
        (await findUser("email", email)) ??
        (await (async () => {
          const created = await createUser({ email, fullName: "Google Tester" });
          await db.admin(
            "update auth.users set raw_user_meta_data = raw_user_meta_data || $1::jsonb where id = $2",
            [
              JSON.stringify({ avatar_url: `${origin}/__assets/google-avatar.png` }),
              created.user.id,
            ],
          );
          return findUser("id::text", created.user.id);
        })());
      const code = randomUUID();
      oauthCodes.set(code, user!.id);
      const redirect = url.searchParams.get("redirect_to") ?? origin;
      const target = new URL(redirect);
      target.searchParams.set("code", code);
      res.writeHead(302, { location: target.toString() });
      return res.end();
    }
    return send(res, 404, {
      code: 404,
      error_code: "not_found",
      msg: `Fake GoTrue has no route ${req.method} ${route}`,
    });
  }

  async function handleStorage(req: IncomingMessage, res: ServerResponse, url: URL, raw: Buffer) {
    stats.storage++;
    const claims = claimsFrom(req);
    const route = url.pathname.replace(/^\/storage\/v1\/object/, "");
    const bucketOf = (p: string) => {
      const [, bucket, ...rest] = p.split("/");
      return { bucket, name: decodeURIComponent(rest.join("/")) };
    };

    // Public read
    if (req.method === "GET" && route.startsWith("/public/")) {
      const { bucket, name } = bucketOf(route.replace("/public", ""));
      const b = await db.admin<{ public: boolean }>(
        "select public from storage.buckets where id = $1",
        [bucket],
      );
      const blob = blobs.get(`${bucket}/${name}`);
      if (!b[0]?.public || !blob)
        return send(res, 404, {
          statusCode: "404",
          error: "not_found",
          message: "Object not found",
        });
      return send(res, 200, blob.data, {
        "content-type": blob.contentType,
        "cache-control": "max-age=3600",
      });
    }
    // Signed URL read
    if (req.method === "GET" && route.startsWith("/sign/")) {
      const { bucket, name } = bucketOf(route.replace("/sign", ""));
      const blob = blobs.get(`${bucket}/${name}`);
      if (!blob || !url.searchParams.get("token"))
        return send(res, 404, {
          statusCode: "404",
          error: "not_found",
          message: "Object not found",
        });
      return send(res, 200, blob.data, { "content-type": blob.contentType });
    }
    // Create a signed URL (checked against the caller's SELECT policy)
    if (req.method === "POST" && route.startsWith("/sign/")) {
      const { bucket, name } = bucketOf(route.replace("/sign", ""));
      const visible = await db.as(
        claims,
        async (tx) =>
          (
            await tx.query("select 1 from storage.objects where bucket_id = $1 and name = $2", [
              bucket,
              name,
            ])
          ).rows.length,
      );
      if (!visible)
        return send(res, 400, {
          statusCode: "404",
          error: "not_found",
          message: "Object not found",
        });
      return send(res, 200, { signedURL: `/object/sign/${bucket}/${name}?token=${randomUUID()}` });
    }
    // Remove
    if (req.method === "DELETE") {
      const { bucket } = bucketOf(route);
      const prefixes = ((JSON.parse(raw.toString("utf8") || "{}") as { prefixes?: string[] })
        .prefixes ?? []) as string[];
      const removed: unknown[] = [];
      for (const name of prefixes) {
        const rows = await db.as(
          claims,
          async (tx) =>
            (
              await tx.query(
                "delete from storage.objects where bucket_id = $1 and name = $2 returning name",
                [bucket, name],
              )
            ).rows,
        );
        if (rows.length > 0) {
          blobs.delete(`${bucket}/${name}`);
          removed.push({ name, bucket_id: bucket });
        }
      }
      return send(res, 200, removed);
    }
    // Upload
    if ((req.method === "POST" || req.method === "PUT") && !route.startsWith("/sign/")) {
      const { bucket, name } = bucketOf(route);
      // supabase-js sends a browser File/Blob as multipart/form-data and raw bytes
      // otherwise; the object's own type and bytes are what the bucket rules apply to.
      let body = raw;
      let contentType = String(req.headers["content-type"] ?? "application/octet-stream").split(
        ";",
      )[0];
      if (contentType === "multipart/form-data") {
        const part = parseMultipart(raw, String(req.headers["content-type"]));
        if (part) {
          body = part.data;
          contentType = part.contentType;
        }
      }
      const limits = (
        await db.admin<{ file_size_limit: string | null; allowed_mime_types: string[] | null }>(
          "select file_size_limit::text, allowed_mime_types from storage.buckets where id = $1",
          [bucket],
        )
      )[0];
      if (!limits)
        return send(res, 404, {
          statusCode: "404",
          error: "Bucket not found",
          message: "Bucket not found",
        });
      if (limits.file_size_limit && body.length > Number(limits.file_size_limit)) {
        return send(res, 413, {
          statusCode: "413",
          error: "Payload too large",
          message: "The object exceeded the maximum allowed size",
        });
      }
      if (limits.allowed_mime_types && !limits.allowed_mime_types.includes(contentType)) {
        return send(res, 415, {
          statusCode: "415",
          error: "invalid_mime_type",
          message: `mime type ${contentType} is not supported`,
        });
      }
      try {
        await db.as(claims, async (tx) => {
          await tx.query(
            "insert into storage.objects (bucket_id, name, owner, metadata) values ($1, $2, $3, $4::jsonb)",
            [
              bucket,
              name,
              claims.sub ?? null,
              JSON.stringify({ size: body.length, mimetype: contentType }),
            ],
          );
        });
      } catch (err) {
        const e = err as { code?: string; message?: string };
        if (e.code === "23505")
          return send(res, 409, {
            statusCode: "409",
            error: "Duplicate",
            message: "The resource already exists",
          });
        return send(res, 403, {
          statusCode: "403",
          error: "Unauthorized",
          message: "new row violates row-level security policy",
        });
      }
      blobs.set(`${bucket}/${name}`, { data: body, contentType });
      return send(res, 200, { Key: `${bucket}/${name}`, Id: randomUUID() });
    }
    return send(res, 404, {
      statusCode: "404",
      error: "not_found",
      message: `Fake Storage has no route ${req.method} ${route}`,
    });
  }

  async function reset() {
    await db.admin(`
      do $$ declare t text; begin
        for t in select tablename from pg_tables where schemaname = 'public' loop
          execute format('truncate table public.%I restart identity cascade', t);
        end loop;
      end $$;
      truncate table storage.objects;
      delete from auth.users;`);
    blobs.clear();
    refreshTokens.clear();
    revoked.clear();
    oauthCodes.clear();
    gemini.reset();
    stats.rest = stats.auth = stats.storage = stats.gemini = 0;
  }

  const server: Server = createServer((req, res) => {
    void (async () => {
      const url = new URL(req.url ?? "/", origin || "http://localhost");
      const reqOrigin = String(req.headers["origin"] ?? "");
      const cors: Record<string, string> = {
        "access-control-allow-origin": reqOrigin || "*",
        "access-control-allow-credentials": "true",
        "access-control-allow-headers": String(
          req.headers["access-control-request-headers"] ?? "*",
        ),
        "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,HEAD,OPTIONS",
        "access-control-expose-headers": "content-range,content-type",
        vary: "origin",
      };
      const origWriteHead = res.writeHead.bind(res);
      res.writeHead = ((status: number, headers?: Record<string, string>) =>
        origWriteHead(status, { ...cors, ...(headers ?? {}) })) as typeof res.writeHead;

      if (req.method === "OPTIONS") {
        res.writeHead(204);
        return res.end();
      }
      try {
        const raw = await readBody(req);
        const json = () => (raw.length > 0 ? (JSON.parse(raw.toString("utf8")) as unknown) : {});

        if (url.pathname.startsWith("/rest/v1/")) {
          stats.rest++;
          const table = url.pathname.replace("/rest/v1/", "").split("/")[0];
          const headers: Record<string, string | undefined> = {};
          for (const [k, v] of Object.entries(req.headers))
            headers[k] = Array.isArray(v) ? v.join(",") : v;
          const out = await handleRest(
            db,
            { method: req.method ?? "GET", table, query: url.searchParams, headers, body: json() },
            claimsFrom(req),
          );
          return send(res, out.status, out.body ?? null, out.headers);
        }
        if (url.pathname.startsWith("/auth/v1/"))
          return await handleAuth(req, res, url, json() as Record<string, unknown>);
        if (url.pathname.startsWith("/storage/v1/object"))
          return await handleStorage(req, res, url, raw);

        if (url.pathname.startsWith("/gemini/")) {
          stats.gemini++;
          const out = await gemini.handle(json() as never);
          return send(res, out.status, out.json);
        }
        if (url.pathname === "/__assets/google-avatar.png")
          return send(res, 200, ONE_PIXEL_PNG, { "content-type": "image/png" });

        // ── test control ────────────────────────────────────────────────
        if (url.pathname === "/__admin/health") return send(res, 200, { ok: true, stats });
        if (url.pathname === "/__admin/reset" && req.method === "POST") {
          await reset();
          return send(res, 200, { ok: true });
        }
        if (url.pathname === "/__admin/sql" && req.method === "POST") {
          const { sql, params } = json() as { sql: string; params?: unknown[] };
          return send(res, 200, await db.admin(sql, params ?? []));
        }
        if (url.pathname === "/__admin/user" && req.method === "POST") {
          const { email, password, fullName, id } = json() as {
            email: string;
            password?: string;
            fullName?: string;
            id?: string;
          };
          const made = await createUser({ email, password, fullName, id });
          return send(res, 200, { user: made.user, session: made.session });
        }
        if (url.pathname === "/__admin/gemini") {
          if (req.method === "POST") {
            gemini.configure(json() as GeminiConfig);
            return send(res, 200, { ok: true });
          }
          return send(res, 200, gemini.calls);
        }
        return send(res, 404, { message: `Fake stack has no route ${req.method} ${url.pathname}` });
      } catch (err) {
        console.error("[fake-stack] unhandled error:", err);
        return send(res, 500, { message: (err as Error).message });
      }
    })();
  });

  await new Promise<void>((resolve) => server.listen(opts.port ?? 0, "127.0.0.1", resolve));
  const port = (server.address() as AddressInfo).port;
  origin = `http://127.0.0.1:${port}`;

  return {
    port,
    url: origin,
    anonKey: ANON_KEY,
    db,
    gemini,
    cookieFor(session) {
      const host = new URL(origin).hostname.split(".")[0];
      return { name: `sb-${host}-auth-token`, value: `base64-${b64url(JSON.stringify(session))}` };
    },
    createUser,
    reset,
    async close() {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await db.close();
    },
  };
}
