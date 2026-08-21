import { z } from "zod";

/** Each var is validated independently — a missing/invalid var only breaks
 * the feature that actually reads it (e.g. a missing GEMINI_API_KEY must
 * never break Supabase sign-in, which reads SUPABASE_URL/SUPABASE_ANON_KEY). */
const fieldSchemas = {
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),
  /** The single model every Gemini call in the app uses — never hardcode a
   * model name in a prompt file. Defaults to a stable Flash-class model
   * confirmed available on this project's free tier. */
  GEMINI_MODEL: z.string().min(1).default("gemini-3.6-flash"),
  SUPABASE_URL: z.string().url("SUPABASE_URL must be a valid URL"),
  SUPABASE_ANON_KEY: z.string().min(1, "SUPABASE_ANON_KEY is required"),
  RESEND_API_KEY: z.string().min(1).optional(),
  /** Comma-separated allowlist gating /review — a real, signed-in Supabase
   * account whose email is NOT in this list gets bounced away exactly like
   * an unauthenticated /dashboard request. Empty/unset means /review is
   * unreachable by anyone, which is the safe default. */
  REVIEWER_EMAILS: z.string().optional(),
  /** TEMPORARY review-only mechanism — see src/lib/review-bypass.server.ts.
   * Must be the literal string "true" AND both REVIEW_USER_EMAIL and
   * REVIEW_USER_PASSWORD must also be set, or the bypass does nothing.
   * Never set this in the real production deployment's secrets. */
  REVIEW_BYPASS_AUTH: z.string().optional(),
  /** Credentials for the ONE isolated, dedicated Supabase Auth account the
   * bypass signs unauthenticated requests in as. Never a real user. */
  REVIEW_USER_EMAIL: z.string().optional(),
  REVIEW_USER_PASSWORD: z.string().optional(),
} as const;

type FieldSchemas = typeof fieldSchemas;

const cache = new Map<keyof FieldSchemas, unknown>();

function readField<K extends keyof FieldSchemas>(
  key: K,
): z.infer<FieldSchemas[K]> {
  if (cache.has(key)) return cache.get(key) as z.infer<FieldSchemas[K]>;
  const parsed = fieldSchemas[key].safeParse(process.env[key]);
  if (!parsed.success) {
    throw new Error(
      `Missing or invalid server environment variable ${key}: ${parsed.error.issues
        .map((i) => i.message)
        .join(", ")}`,
    );
  }
  cache.set(key, parsed.data);
  return parsed.data as z.infer<FieldSchemas[K]>;
}

export const env = {
  get GEMINI_API_KEY() {
    return readField("GEMINI_API_KEY");
  },
  get GEMINI_MODEL() {
    return readField("GEMINI_MODEL");
  },
  get SUPABASE_URL() {
    return readField("SUPABASE_URL");
  },
  get SUPABASE_ANON_KEY() {
    return readField("SUPABASE_ANON_KEY");
  },
  get RESEND_API_KEY() {
    return readField("RESEND_API_KEY");
  },
  get REVIEWER_EMAILS(): string[] {
    return (readField("REVIEWER_EMAILS") ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
  },
  get REVIEW_BYPASS_AUTH() {
    return readField("REVIEW_BYPASS_AUTH");
  },
  get REVIEW_USER_EMAIL() {
    return readField("REVIEW_USER_EMAIL");
  },
  get REVIEW_USER_PASSWORD() {
    return readField("REVIEW_USER_PASSWORD");
  },
};
