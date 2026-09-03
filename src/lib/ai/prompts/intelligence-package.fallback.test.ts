import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";

/**
 * Proves the model-fallback tier added to runGenerationLoop (gemini.
 * server.ts) — a SEPARATE module instance from intelligence-package.
 * pipeline.test.ts, because FALLBACK_MODEL is read once at module import
 * time and can't be toggled per-test within one file. This file always has
 * GEMINI_FALLBACK_MODEL set; the sibling pipeline test file always has it
 * unset — between the two, both "fallback configured" and "fallback absent"
 * are covered.
 *
 * IMPORTANT: gemini.server.ts's `export const MODEL = env.GEMINI_MODEL`
 * (and FALLBACK_MODEL) are read at that module's OWN top-level, once, on
 * first import. A static `import ... from "@/lib/ai/gemini.server"` at
 * this file's top is hoisted by JS module semantics ABOVE the
 * `process.env.X = ...` lines below, even though those lines appear first
 * in the source — so a static import would silently read the real
 * unset/default env values, not these overrides. A dynamic `import()`
 * inside beforeAll is NOT hoisted and genuinely runs after the env lines,
 * which is why it's used here instead.
 */
process.env.GEMINI_API_KEY = "test-key-not-a-real-secret";
process.env.GEMINI_MODEL = "gemini-test-primary";
process.env.GEMINI_FALLBACK_MODEL = "gemini-test-fallback";

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

import { ApiError } from "@google/genai";
import { z } from "zod";

const schema = z.object({ x: z.string() });
const baseParams = {
  systemInstruction: "test",
  prompt: "test",
  purpose: "REANALYZE" as const,
};

let generateStructured: (typeof import("@/lib/ai/gemini.server"))["generateStructured"];

describe("Gemini model fallback (mocked, no live network call)", () => {
  beforeAll(async () => {
    ({ generateStructured } = await import("@/lib/ai/gemini.server"));
  });

  beforeEach(() => {
    generateContentMock.mockReset();
  });

  it("503 on the primary model -> falls back to the secondary model once and succeeds", async () => {
    generateContentMock
      .mockImplementationOnce(() => {
        throw new ApiError({ message: "high demand", status: 503 });
      })
      .mockImplementationOnce(() => ({ text: JSON.stringify({ x: "ok" }) }));

    const result = await generateStructured(schema, { ...baseParams, allowRetry: false });

    expect(generateContentMock).toHaveBeenCalledTimes(2);
    expect(generateContentMock.mock.calls[0][0].model).toBe("gemini-test-primary");
    expect(generateContentMock.mock.calls[1][0].model).toBe("gemini-test-fallback");
    expect(result).toEqual({ x: "ok" });
  });

  it("503 on both primary and fallback -> throws with 'after fallback', category GEMINI_UNAVAILABLE", async () => {
    generateContentMock.mockImplementation(() => {
      throw new ApiError({ message: "high demand", status: 503 });
    });

    let caught: unknown;
    try {
      await generateStructured(schema, { ...baseParams, allowRetry: false });
    } catch (err) {
      caught = err;
    }

    expect(generateContentMock).toHaveBeenCalledTimes(2);
    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).toContain("after fallback");
    expect((caught as { category?: string }).category).toBe("GEMINI_UNAVAILABLE");
  });

  it("429 quota on the primary model -> also falls back (fallback isn't 503-only)", async () => {
    generateContentMock
      .mockImplementationOnce(() => {
        throw new ApiError({ message: "quota exceeded", status: 429 });
      })
      .mockImplementationOnce(() => ({ text: JSON.stringify({ x: "ok" }) }));

    const result = await generateStructured(schema, { ...baseParams, allowRetry: false });

    expect(generateContentMock).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ x: "ok" });
  });

  it("400 on the primary model -> does NOT fall back (same bad request would fail identically elsewhere)", async () => {
    generateContentMock.mockImplementation(() => {
      throw new ApiError({ message: "invalid argument", status: 400 });
    });

    let caught: unknown;
    try {
      await generateStructured(schema, { ...baseParams, allowRetry: false });
    } catch (err) {
      caught = err;
    }

    expect(generateContentMock).toHaveBeenCalledTimes(1);
    expect(generateContentMock.mock.calls[0][0].model).toBe("gemini-test-primary");
    expect((caught as Error).message).not.toContain("after fallback");
    expect((caught as { category?: string }).category).toBe("GEMINI_INVALID_REQUEST");
  });

  it("401/403 on the primary model -> classified as GEMINI_PERMISSION_DENIED, does NOT fall back", async () => {
    generateContentMock.mockImplementation(() => {
      throw new ApiError({ message: "permission denied", status: 403 });
    });

    let caught: unknown;
    try {
      await generateStructured(schema, { ...baseParams, allowRetry: false });
    } catch (err) {
      caught = err;
    }

    expect(generateContentMock).toHaveBeenCalledTimes(1);
    expect((caught as { category?: string }).category).toBe("GEMINI_PERMISSION_DENIED");
  });

  it("schema-mismatch output on the primary model -> does NOT fall back (output-quality issue, not provider availability)", async () => {
    generateContentMock.mockImplementation(() => ({
      text: JSON.stringify({ x: 12345 }), // wrong type — fails schema.safeParse
    }));

    let caught: unknown;
    try {
      await generateStructured(schema, { ...baseParams, allowRetry: false });
    } catch (err) {
      caught = err;
    }

    expect(generateContentMock).toHaveBeenCalledTimes(1);
    expect((caught as { category?: string }).category).toBe("GEMINI_SCHEMA_MISMATCH");
    expect((caught as Error).message).not.toContain("after fallback");
  });
});
