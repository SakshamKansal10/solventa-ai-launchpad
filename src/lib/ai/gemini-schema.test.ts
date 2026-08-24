import { describe, expect, it } from "vitest";
import { toGeminiSchema } from "@/lib/ai/gemini.server";
import { FlatIntelligencePackageSchema } from "@/lib/ai/prompts/intelligence-package";
import {
  MentorResponseSchema,
  RoadmapPlanSchema,
  OpportunityDetailSchema,
  MarketEvidenceResultSchema,
} from "@/lib/ai/schemas";

/**
 * Asserts the exact request shape generateStructured sends to Gemini is
 * well-formed, WITHOUT spending a live API call. This is the test that
 * would have caught the empty-{}-responseSchema bug (a zod/zod-to-json-
 * schema version mismatch silently degenerated every schema to `{}`,
 * which Gemini's API then rejected with a live 400 INVALID_ARGUMENT) —
 * that bug produced no type error and no thrown exception, only a
 * semantically empty schema, so only inspecting the actual output catches it.
 */

// Constructs Gemini's documented OpenAPI-3-subset responseSchema does not
// support. A schema containing any of these is not a hypothesis — it's a
// guaranteed 400 INVALID_ARGUMENT.
const UNSUPPORTED_KEYS = [
  "$ref",
  "definitions",
  "oneOf",
  "anyOf",
  "allOf",
  "not",
  "const",
  "patternProperties",
  "if",
  "then",
  "else",
  "additionalProperties",
];

function collectKeys(node: unknown, found: Set<string>): void {
  if (Array.isArray(node)) {
    for (const item of node) collectKeys(item, found);
    return;
  }
  if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      found.add(key);
      collectKeys(value, found);
    }
  }
}

function assertGeminiCompatible(schema: Parameters<typeof toGeminiSchema>[0]) {
  const result = toGeminiSchema(schema) as Record<string, unknown>;

  // The exact failure mode this test exists to catch: a schema that
  // "succeeds" but carries no actual constraints.
  expect(Object.keys(result).length).toBeGreaterThan(0);
  expect(result.type).toBe("object");
  expect(result.properties).toBeDefined();
  expect(Object.keys(result.properties as object).length).toBeGreaterThan(0);

  const allKeys = new Set<string>();
  collectKeys(result, allKeys);
  const present = UNSUPPORTED_KEYS.filter((k) => allKeys.has(k));
  expect(present, `schema contains Gemini-unsupported construct(s): ${present.join(", ")}`).toEqual(
    [],
  );
}

describe("toGeminiSchema", () => {
  it("produces a non-empty, provider-compatible schema for the one-call initial consultation package", () => {
    assertGeminiCompatible(FlatIntelligencePackageSchema);
  });

  it("produces a non-empty, provider-compatible schema for the mentor response", () => {
    assertGeminiCompatible(MentorResponseSchema);
  });

  it("produces a non-empty, provider-compatible schema for a roadmap plan", () => {
    assertGeminiCompatible(RoadmapPlanSchema);
  });

  it("produces a non-empty, provider-compatible schema for an opportunity detail", () => {
    assertGeminiCompatible(OpportunityDetailSchema);
  });

  it("produces a non-empty, provider-compatible schema for market evidence extraction", () => {
    assertGeminiCompatible(MarketEvidenceResultSchema);
  });

  it("represents nullable fields as OpenAPI-3 `nullable: true`, not a draft-2020-12 anyOf/null union", () => {
    const result = toGeminiSchema(RoadmapPlanSchema) as {
      properties: { phases: { items: { properties: Record<string, Record<string, unknown>> } } };
    };
    const taskProps = result.properties.phases.items.properties.tasks as unknown as {
      items: { properties: Record<string, Record<string, unknown>> };
    };
    const resourceField = taskProps.items.properties.resource;
    expect(resourceField.nullable).toBe(true);
    expect(resourceField.anyOf).toBeUndefined();
  });
});
