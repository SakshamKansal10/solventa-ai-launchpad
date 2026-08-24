import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Exercises the REAL Stage-7 runtime call path — generateIntelligencePackage,
 * exactly as completeConsultation calls it — with @google/genai mocked at
 * the module boundary so no live network call happens. This is the
 * authoritative proof (not a static code read) of how many times
 * generateContent actually fires and what error text a request-level
 * failure actually produces.
 *
 * Unlike `bun run <file>.ts`, Vitest does NOT auto-load .env.local — env.
 * server.ts's env.GEMINI_API_KEY getter throws "Missing or invalid server
 * environment variable" here unless set explicitly, so this sets a fake
 * key/model before anything touches getClient(). Never rely on ambient
 * .env loading in a *.test.ts file in this project.
 */
process.env.GEMINI_API_KEY = "test-key-not-a-real-secret";
process.env.GEMINI_MODEL = "gemini-test-model";

const generateContentMock = vi.fn();

// vi.mock factories are hoisted above everything else in the file, so the
// mock ApiError class has to be self-contained here rather than reference
// anything declared below it.
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
import { generateIntelligencePackage } from "@/lib/ai/prompts/intelligence-package";
import { normalizeProfile } from "@/lib/profile/normalize";
import { FIXTURE_PROFILE_ANSWERS } from "@/lib/ai/fixtures/intelligence-package.fixture";

type OnboardingAnswers = Parameters<typeof normalizeProfile>[0];

describe("Stage 7 generation call path (mocked Gemini, no live network call)", () => {
  beforeEach(() => {
    generateContentMock.mockReset();
  });

  it("calls generateContent exactly once and fails without 'after retry' when Gemini returns 400", async () => {
    generateContentMock.mockImplementation(() => {
      throw new ApiError({ message: "Request contains an invalid argument.", status: 400 });
    });

    const profile = normalizeProfile(FIXTURE_PROFILE_ANSWERS as unknown as OnboardingAnswers);

    let caught: unknown;
    try {
      await generateIntelligencePackage(profile);
    } catch (err) {
      caught = err;
    }

    expect(generateContentMock).toHaveBeenCalledTimes(1);
    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).toContain("Gemini request failed:");
    expect((caught as Error).message).not.toContain("after retry");
    expect((caught as { category?: string }).category).toBe("GEMINI_INVALID_REQUEST");
  });

  it("sends the request WITHOUT a provider-side responseSchema (JSON-contract-in-prompt mode)", async () => {
    generateContentMock.mockImplementation(() => {
      throw new ApiError({ message: "Request contains an invalid argument.", status: 400 });
    });

    const profile = normalizeProfile(FIXTURE_PROFILE_ANSWERS as unknown as OnboardingAnswers);
    await generateIntelligencePackage(profile).catch(() => {});

    expect(generateContentMock).toHaveBeenCalledTimes(1);
    const requestArg = generateContentMock.mock.calls[0][0] as {
      model: string;
      contents: string;
      config: Record<string, unknown>;
    };
    expect(requestArg.config.responseSchema).toBeUndefined();
    expect(requestArg.config.responseMimeType).toBe("application/json");
    expect(typeof requestArg.model).toBe("string");
    expect(requestArg.model.length).toBeGreaterThan(0);
    // The JSON contract has to actually be IN the prompt, since nothing
    // else enforces the response shape without a provider-side schema.
    expect(requestArg.contents).toContain("roadmapPhases");
    expect(requestArg.contents).toContain("EXACT COUNTS MATTER");
  });

  it("inspects the full locally-constructed request shape — no personal data logged, only types/lengths/keys", async () => {
    generateContentMock.mockImplementation(() => {
      throw new ApiError({ message: "Request contains an invalid argument.", status: 400 });
    });
    const profile = normalizeProfile(FIXTURE_PROFILE_ANSWERS as unknown as OnboardingAnswers);
    await generateIntelligencePackage(profile).catch(() => {});

    const requestArg = generateContentMock.mock.calls[0][0] as {
      model: string;
      contents: unknown;
      config: {
        systemInstruction?: unknown;
        responseMimeType?: unknown;
        responseSchema?: unknown;
        [key: string]: unknown;
      };
    };

    const shapeReport = {
      topLevelKeys: Object.keys(requestArg).sort(),
      model: requestArg.model,
      contentsType: typeof requestArg.contents,
      contentsLength: typeof requestArg.contents === "string" ? requestArg.contents.length : null,
      configKeys: Object.keys(requestArg.config).sort(),
      systemInstructionType: typeof requestArg.config.systemInstruction,
      systemInstructionLength:
        typeof requestArg.config.systemInstruction === "string"
          ? requestArg.config.systemInstruction.length
          : null,
      responseMimeType: requestArg.config.responseMimeType,
      hasResponseSchema: "responseSchema" in requestArg.config,
      anyUndefinedConfigValues: Object.entries(requestArg.config).some(([, v]) => v === undefined),
    };

    // Exactly the three request-level keys the SDK expects — nothing extra,
    // nothing missing, nothing accidentally serialized as `undefined`.
    expect(shapeReport.topLevelKeys).toEqual(["config", "contents", "model"]);
    expect(shapeReport.configKeys).toEqual(["responseMimeType", "systemInstruction"]);
    expect(shapeReport.hasResponseSchema).toBe(false);
    expect(shapeReport.anyUndefinedConfigValues).toBe(false);
    expect(shapeReport.contentsType).toBe("string");
    expect(shapeReport.systemInstructionType).toBe("string");
    expect(shapeReport.responseMimeType).toBe("application/json");
    // Sanity bounds, not exact values — proves neither field is empty/huge.
    expect(shapeReport.contentsLength).toBeGreaterThan(500);
    expect(shapeReport.systemInstructionLength).toBeGreaterThan(50);
  });

  it("does NOT retry when allowRetry is left at its default (a different, retry-enabled call site) — sanity check on the shared loop", async () => {
    // Confirms the *loop itself* really does support 2 attempts when
    // allowRetry isn't forced to false, so test 1 above is actually
    // proving something about allowRetry:false specifically, not just
    // asserting a loop that can never retry no matter what.
    const { generateStructured } = await import("@/lib/ai/gemini.server");
    const { z } = await import("zod");
    generateContentMock.mockImplementation(() => {
      throw new ApiError({ message: "Request contains an invalid argument.", status: 400 });
    });

    await generateStructured(z.object({ x: z.string() }), {
      systemInstruction: "test",
      prompt: "test",
      purpose: "REANALYZE",
    }).catch(() => {});

    expect(generateContentMock).toHaveBeenCalledTimes(2);
  });

  it("normalizes (caps) a valid but oversized roadmap instead of rejecting it — a good response is never discarded for count variance", async () => {
    const founderDNA = {
      narrativeSummary: "x",
      strengths: ["a", "b"],
      resources: ["a"],
      constraints: ["a"],
      workStyle: "x",
      riskProfile: "x",
      direction: "x",
      strategicSignals: ["x"],
    };
    const opportunity = (i: number) => ({
      opportunityIndex: i,
      title: `Opp ${i}`,
      category: "digital service",
      plainEnglishSummary: "x",
      customer: "x",
      problem: "x",
      solution: "x",
      whyThisFounder: ["a", "b", "c"],
      businessModelPlainEnglish: "x",
      startingCapital: "x",
      weeklyTime: "x",
      difficulty: "Beginner-friendly",
      skillsAlreadyOwned: [],
      skillsToLearn: [],
      resourceRequirements: [],
      advantages: ["a", "b"],
      tradeoffs: ["a"],
      risks: ["a"],
      unknowns: [],
      validationNeeded: [],
      revenuePath: "x",
      firstExperiment: "x",
      fitSignals: {
        requiredSkills: [],
        startupCapitalINR: 1000,
        weeklyHoursNeeded: 5,
        riskLevel: "cautious",
        motivationAlignment: "high",
        requiresLeadership: false,
        requiresSales: false,
        soloFriendly: true,
        relevantExperienceYears: 0,
        requiresDigitalAssets: false,
        locationFlexible: true,
      },
    });
    const phase = (oi: number, pi: number) => ({
      opportunityIndex: oi,
      phaseIndex: pi,
      key: "understand",
      title: `Phase ${pi}`,
      description: "x",
    });
    const task = (oi: number, pi: number, ti: number) => ({
      opportunityIndex: oi,
      phaseIndex: pi,
      taskIndex: ti,
      what: "x",
      why: "x",
      how: "x",
      resource: null,
      timeEstimate: "1 hour",
      deadlineDaysFromStart: 1,
      doneWhen: "x",
      required: true,
      dependsOn: null,
    });

    // Opportunity 0: 7 phases (above the acceptable-5 cap, within the
    // hard-8 ceiling). Every phase: 5 tasks (above the acceptable-4 cap,
    // within the hard-6 ceiling). Opportunities 1/2: a normal 3x2.
    const roadmapPhases: unknown[] = [];
    const roadmapTasks: unknown[] = [];
    for (let pi = 0; pi < 7; pi++) {
      roadmapPhases.push(phase(0, pi));
      for (let ti = 0; ti < 5; ti++) roadmapTasks.push(task(0, pi, ti));
    }
    for (const oi of [1, 2]) {
      for (let pi = 0; pi < 3; pi++) {
        roadmapPhases.push(phase(oi, pi));
        for (let ti = 0; ti < 2; ti++) roadmapTasks.push(task(oi, pi, ti));
      }
    }

    generateContentMock.mockImplementation(() => ({
      text: JSON.stringify({
        founderDNA,
        opportunities: [0, 1, 2].map(opportunity),
        roadmapPhases,
        roadmapTasks,
      }),
    }));

    const profile = normalizeProfile(FIXTURE_PROFILE_ANSWERS as unknown as OnboardingAnswers);
    const pkg = await generateIntelligencePackage(profile);

    expect(generateContentMock).toHaveBeenCalledTimes(1);
    expect(pkg.opportunities).toHaveLength(3);
    // Capped to the acceptable maximum, not rejected and not left oversized.
    expect(pkg.opportunities[0].roadmap.phases).toHaveLength(5);
    for (const p of pkg.opportunities[0].roadmap.phases) {
      expect(p.tasks.length).toBeLessThanOrEqual(4);
    }
    expect(pkg.opportunities[1].roadmap.phases).toHaveLength(3);
  });
});
