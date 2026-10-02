import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";

/**
 * Generic, call-site-agnostic coverage of runGenerationLoop's retry/parse/
 * validation behavior (gemini.server.ts) — mocked @google/genai, no live
 * network call. Complements:
 *  - intelligence-package.pipeline.test.ts (the real INITIAL_INTELLIGENCE
 *    call path specifically, including that it now sends a responseSchema)
 *  - intelligence-package.fallback.test.ts (cross-model fallback tiering)
 *  - intelligence-package.validation.test.ts (FlatIntelligencePackageSchema
 *    shape rules in isolation)
 *
 * See gemini.server.ts's module-load-order comment on why the dynamic
 * import inside beforeAll (not a static top-level import) is required here.
 */
process.env.GEMINI_API_KEY = "test-key-not-a-real-secret";
process.env.GEMINI_MODEL = "gemini-test-primary";

const generateContentMock = vi.fn();

vi.mock("@google/genai", () => {
  class ApiError extends Error {
    status: number;
    constructor(options: { message: string; status: number }) {
      super(options.message);
      this.status = options.status;
    }
  }
  class GoogleGenAI {
    models = { generateContent: generateContentMock };
    constructor(_opts: unknown) {}
  }
  const ThinkingLevel = { MINIMAL: "MINIMAL", LOW: "LOW", MEDIUM: "MEDIUM", HIGH: "HIGH" };
  return { GoogleGenAI, ApiError, ThinkingLevel };
});

import { z } from "zod";

const schema = z.object({ x: z.string(), opportunities: z.array(z.string()).length(3) });
const baseParams = {
  systemInstruction: "test",
  prompt: "test",
  purpose: "REANALYZE" as const,
};
const valid = { x: "ok", opportunities: ["a", "b", "c"] };

// A realistic shape for the bug actually reported: a response that reads as
// JSON up to a point, then breaks mid-array — exactly
// "Expected ',' or ']' after array element in JSON" from V8.
const TRUNCATED = `{"x":"ok","opportunities":["a","b","c"`;
const MALFORMED_TRAILING_COMMA = `{"x":"ok","opportunities":["a","b","c",]}`;

let generateStructured: (typeof import("@/lib/ai/gemini.server"))["generateStructured"];

describe("runGenerationLoop — parse and validation retry behavior (mocked, no live network call)", () => {
  beforeAll(async () => {
    ({ generateStructured } = await import("@/lib/ai/gemini.server"));
  });

  beforeEach(() => {
    generateContentMock.mockReset();
  });

  it("malformed JSON on attempt 1, valid on attempt 2 -> succeeds, retry prompt names the parse failure", async () => {
    generateContentMock
      .mockImplementationOnce(() => ({ text: TRUNCATED }))
      .mockImplementationOnce(() => ({ text: JSON.stringify(valid) }));

    const result = await generateStructured(schema, baseParams);

    expect(result).toEqual(valid);
    expect(generateContentMock).toHaveBeenCalledTimes(2);
    const secondCallPrompt = generateContentMock.mock.calls[1][0].contents as string;
    expect(secondCallPrompt).toContain("was not valid JSON");
    expect(secondCallPrompt).toContain("could not be parsed");
  });

  it("truncated JSON on both attempts -> throws after retry, category GEMINI_MALFORMED_JSON", async () => {
    generateContentMock.mockImplementation(() => ({ text: TRUNCATED }));

    let caught: unknown;
    try {
      await generateStructured(schema, baseParams);
    } catch (err) {
      caught = err;
    }

    expect(generateContentMock).toHaveBeenCalledTimes(2);
    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).toContain("after retry");
    expect((caught as { category?: string }).category).toBe("GEMINI_MALFORMED_JSON");
  });

  it("syntactically valid JSON with a trailing comma on attempt 1, valid on attempt 2 -> succeeds", async () => {
    generateContentMock
      .mockImplementationOnce(() => ({ text: MALFORMED_TRAILING_COMMA }))
      .mockImplementationOnce(() => ({ text: JSON.stringify(valid) }));

    const result = await generateStructured(schema, baseParams);
    expect(result).toEqual(valid);
    expect(generateContentMock).toHaveBeenCalledTimes(2);
  });

  it("valid JSON that fails schema validation on attempt 1, valid on attempt 2 -> succeeds, retry prompt names the schema failure", async () => {
    generateContentMock
      .mockImplementationOnce(() => ({
        text: JSON.stringify({ x: "ok", opportunities: ["only-one"] }),
      }))
      .mockImplementationOnce(() => ({ text: JSON.stringify(valid) }));

    const result = await generateStructured(schema, baseParams);

    expect(result).toEqual(valid);
    expect(generateContentMock).toHaveBeenCalledTimes(2);
    const secondCallPrompt = generateContentMock.mock.calls[1][0].contents as string;
    expect(secondCallPrompt).toContain("did not satisfy the required JSON schema");
  });

  it("valid JSON but invalid schema on both attempts -> throws after retry, category GEMINI_SCHEMA_MISMATCH", async () => {
    generateContentMock.mockImplementation(() => ({
      text: JSON.stringify({ x: 12345, opportunities: [] }),
    }));

    let caught: unknown;
    try {
      await generateStructured(schema, baseParams);
    } catch (err) {
      caught = err;
    }

    expect(generateContentMock).toHaveBeenCalledTimes(2);
    expect((caught as { category?: string }).category).toBe("GEMINI_SCHEMA_MISMATCH");
    expect((caught as Error).message).toContain("after retry");
  });

  it("allowRetry: false -> a malformed response fails immediately, exactly one call", async () => {
    generateContentMock.mockImplementation(() => ({ text: TRUNCATED }));

    let caught: unknown;
    try {
      await generateStructured(schema, { ...baseParams, allowRetry: false });
    } catch (err) {
      caught = err;
    }

    expect(generateContentMock).toHaveBeenCalledTimes(1);
    expect((caught as Error).message).not.toContain("after retry");
    expect((caught as { category?: string }).category).toBe("GEMINI_MALFORMED_JSON");
  });
});
