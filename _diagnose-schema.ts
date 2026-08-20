import { generateStructured } from "@/lib/ai/gemini.server";
import {
  FounderDNASchema,
  OpportunityPackageSchema,
  SolventiaIntelligencePackageSchema,
  RoadmapPlanSchema,
  FitFactorsSchema,
} from "@/lib/ai/schemas";
import { z } from "zod";

async function tryIt(label: string, schema: z.ZodTypeAny, prompt: string) {
  try {
    const t0 = Date.now();
    await generateStructured(schema, {
      systemInstruction: "You are a helpful assistant producing structured test output.",
      prompt,
    });
    console.log(`OK   ${label} (${Date.now() - t0}ms)`);
  } catch (err) {
    console.log(`FAIL ${label}:`, err instanceof Error ? err.message.slice(0, 300) : err);
  }
}

async function main() {
  await tryIt(
    "0a. FitFactors alone",
    FitFactorsSchema,
    "Produce sample fit factors for a simple tutoring business.",
  );

  await tryIt(
    "0b. RoadmapPlan alone (with required/dependsOn fields)",
    RoadmapPlanSchema,
    "Produce a sample roadmap for a simple tutoring business.",
  );

  await tryIt(
    "0c. OpportunityPackage WITHOUT roadmap field",
    OpportunityPackageSchema.omit({ roadmap: true }),
    "Produce one sample business opportunity package (no roadmap) for a 25-year-old aspiring entrepreneur with basic coding skills and ₹20,000 capital.",
  );

  await tryIt(
    "1. FounderDNA alone",
    FounderDNASchema,
    "Produce a sample founder DNA synthesis for a 25-year-old aspiring entrepreneur with basic coding skills and ₹20,000 capital.",
  );

  await tryIt(
    "2. ONE OpportunityPackage alone",
    OpportunityPackageSchema,
    "Produce one sample business opportunity package (with a full roadmap) for a 25-year-old aspiring entrepreneur with basic coding skills and ₹20,000 capital.",
  );
}

main();
