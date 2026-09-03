import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { runNativeConnectivityProbe } from "@/lib/auth-connectivity-diagnostic.server";

const REAL_PROJECT_URL = "https://dcnurhuxgdzxruqsgjgx.supabase.co";
const WRONG_PROJECT_URL = "https://someotherproject.supabase.co";

/** A minimal valid-looking anon key: header.payload.signature, where the
 * payload base64url-decodes to a real JSON object containing `ref`. Real
 * Supabase anon keys are shaped exactly like this. */
function fakeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.fakesignature`;
}

const VALID_ANON_KEY = fakeJwt({ role: "anon", ref: "dcnurhuxgdzxruqsgjgx", iat: 0, exp: 0 });
const WRONG_PROJECT_ANON_KEY = fakeJwt({ role: "anon", ref: "someotherproject", iat: 0, exp: 0 });

describe("runNativeConnectivityProbe", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let infoSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    errorSpy.mockRestore();
    infoSpy.mockRestore();
  });

  it("reports the URL as invalid and short-circuits (no fetch calls) when the hostname doesn't match the expected project", async () => {
    const result = await runNativeConnectivityProbe(
      WRONG_PROJECT_URL,
      VALID_ANON_KEY,
      "founder@example.com",
    );

    expect(result.urlValid).toBe(false);
    expect(result.urlHost).toBe("someotherproject.supabase.co");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports the anon key as not looking like a JWT when malformed, and flags a project-ref mismatch when it doesn't match", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 200, statusText: "OK" }));

    const malformed = await runNativeConnectivityProbe(
      REAL_PROJECT_URL,
      "not-a-jwt-at-all",
      "founder@example.com",
    );
    expect(malformed.anonKeyLooksLikeJwt).toBe(false);
    expect(malformed.anonKeyProjectRefMatches).toBeNull();

    const wrongProject = await runNativeConnectivityProbe(
      REAL_PROJECT_URL,
      WRONG_PROJECT_ANON_KEY,
      "founder@example.com",
    );
    expect(wrongProject.anonKeyLooksLikeJwt).toBe(true);
    expect(wrongProject.anonKeyProjectRefMatches).toBe(false);
  });

  it("records a successful GET /auth/v1/settings and successful POST /auth/v1/otp", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response("{}", { status: 200, statusText: "OK" }))
      .mockResolvedValueOnce(new Response("{}", { status: 200, statusText: "OK" }));

    const result = await runNativeConnectivityProbe(
      REAL_PROJECT_URL,
      VALID_ANON_KEY,
      "founder@example.com",
    );

    expect(result.nativeSettingsStatus).toBe(200);
    expect(result.nativeSettingsError).toBeNull();
    expect(result.nativeOtpStatus).toBe(200);
    expect(result.nativeOtpError).toBeNull();

    // GET first, then POST — and the POST hit the exact documented OTP
    // endpoint with the exact headers/body shape requested.
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      `${REAL_PROJECT_URL}/auth/v1/settings`,
      expect.objectContaining({
        headers: { apikey: VALID_ANON_KEY, Authorization: `Bearer ${VALID_ANON_KEY}` },
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `${REAL_PROJECT_URL}/auth/v1/otp`,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          apikey: VALID_ANON_KEY,
          Authorization: `Bearer ${VALID_ANON_KEY}`,
          "Content-Type": "application/json",
          "x-client-info": "solventia-auth-diagnostic",
        }),
        body: JSON.stringify({ email: "founder@example.com", create_user: true }),
      }),
    );
  });

  it("captures a 401 from the OTP endpoint as evidence of a bad/mismatched anon key", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response("{}", { status: 200, statusText: "OK" }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ msg: "Invalid API key" }), {
          status: 401,
          statusText: "Unauthorized",
        }),
      );

    const result = await runNativeConnectivityProbe(
      REAL_PROJECT_URL,
      VALID_ANON_KEY,
      "founder@example.com",
    );

    expect(result.nativeOtpStatus).toBe(401);
    expect(result.nativeOtpError).toBe("Invalid API key");
  });

  it("captures a raw fetch() throw (the real production symptom) as a settings-probe error without crashing", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 200, statusText: "OK" }));

    const result = await runNativeConnectivityProbe(
      REAL_PROJECT_URL,
      VALID_ANON_KEY,
      "founder@example.com",
    );

    expect(result.nativeSettingsStatus).toBeNull();
    expect(result.nativeSettingsError).toContain("fetch failed");
  });

  it("never logs the anon key or the full email anywhere", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response("{}", { status: 200, statusText: "OK" }))
      .mockResolvedValueOnce(new Response("{}", { status: 200, statusText: "OK" }));

    await runNativeConnectivityProbe(REAL_PROJECT_URL, VALID_ANON_KEY, "founder@example.com");

    const allLoggedText = [...infoSpy.mock.calls, ...errorSpy.mock.calls]
      .flat()
      .map((v) => (typeof v === "string" ? v : JSON.stringify(v)))
      .join("\n");
    expect(allLoggedText).not.toContain(VALID_ANON_KEY);
    expect(allLoggedText).not.toContain("founder@example.com");
  });
});
