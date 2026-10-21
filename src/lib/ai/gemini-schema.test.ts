import { describe, expect, it } from "vitest";
import { z } from "zod";
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

function countKey(node: unknown, key: string): number {
  if (Array.isArray(node)) return node.reduce((n, item) => n + countKey(item, key), 0);
  if (node && typeof node === "object") {
    return Object.entries(node).reduce(
      (n, [k, v]) => n + (k === key ? 1 : 0) + countKey(v, key),
      0,
    );
  }
  return 0;
}

describe("toGeminiSchema — the 2026-10-21 Stage 7 400 INVALID_ARGUMENT", () => {
  // Live: the consultation package with 17 maxItems was rejected before any
  // generation; the same schema without maxItems was accepted. Zod enforces
  // every upper bound locally, so none is sent to the provider.
  it.each([
    ["consultation package", FlatIntelligencePackageSchema],
    ["mentor response", MentorResponseSchema],
    ["opportunity detail", OpportunityDetailSchema],
    ["market evidence", MarketEvidenceResultSchema],
  ])("sends no maxItems in the %s provider schema", (_name, schema) => {
    expect(countKey(toGeminiSchema(schema), "maxItems")).toBe(0);
  });

  it("still requires every structured direction field, with the assumption categories as an enum", () => {
    const result = toGeminiSchema(FlatIntelligencePackageSchema) as {
      properties: {
        opportunities: {
          items: {
            required: string[];
            properties: {
              criticalAssumptions: {
                minItems?: number;
                items: { properties: { category: { enum: string[] } } };
              };
            };
          };
        };
      };
    };
    const opp = result.properties.opportunities.items;
    for (const field of [
      "deliveryModel",
      "criticalAssumptions",
      "successCriteria",
      "reconsiderIf",
    ]) {
      expect(opp.required).toContain(field);
    }
    expect(opp.properties.criticalAssumptions.minItems).toBe(2);
    expect(opp.properties.criticalAssumptions.items.properties.category.enum).toContain("problem");
  });

  it("strips keywords, never a property that happens to share a keyword's name", () => {
    const result = toGeminiSchema(z.object({ maxItems: z.array(z.string()).max(3) })) as {
      properties: Record<string, { maxItems?: number }>;
    };
    expect(Object.keys(result.properties)).toEqual(["maxItems"]);
    expect(result.properties.maxItems.maxItems).toBeUndefined();
  });
});

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
    const weekProps = result.properties.phases.items.properties.weeks as unknown as {
      items: { properties: Record<string, Record<string, unknown>> };
    };
    const taskProps = weekProps.items.properties.tasks as unknown as {
      items: { properties: Record<string, Record<string, unknown>> };
    };
    const resourceField = taskProps.items.properties.resource;
    expect(resourceField.nullable).toBe(true);
    expect(resourceField.anyOf).toBeUndefined();
  });
});
