import { z } from "zod";

const envSchema = z.object({
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
});

type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

function readEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `Missing or invalid server environment variables: ${parsed.error.issues
        .map((i) => i.path.join("."))
        .join(", ")}`,
    );
  }
  cached = parsed.data;
  return cached;
}

export const env = {
  get GEMINI_API_KEY() {
    return readEnv().GEMINI_API_KEY;
  },
  get GEMINI_MODEL() {
    return readEnv().GEMINI_MODEL;
  },
  get SUPABASE_URL() {
    return readEnv().SUPABASE_URL;
  },
  get SUPABASE_ANON_KEY() {
    return readEnv().SUPABASE_ANON_KEY;
  },
  get RESEND_API_KEY() {
    return readEnv().RESEND_API_KEY;
  },
  get REVIEWER_EMAILS(): string[] {
    return (readEnv().REVIEWER_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
  },
  get REVIEW_BYPASS_AUTH() {
    return readEnv().REVIEW_BYPASS_AUTH;
  },
  get REVIEW_USER_EMAIL() {
    return readEnv().REVIEW_USER_EMAIL;
  },
  get REVIEW_USER_PASSWORD() {
    return readEnv().REVIEW_USER_PASSWORD;
  },
};
