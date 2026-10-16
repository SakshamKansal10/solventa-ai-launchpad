import { FIXTURE_INTELLIGENCE_PACKAGE } from "./intelligence-package.fixture";

/**
 * Deterministic stand-ins for every Gemini response the app parses. They are
 * TEST DATA served by the E2E fake Gemini (e2e/harness/fake-gemini.ts) — never
 * production content and never imported by application code. Each one is
 * validated against the real schema in e2e-gemini.test.ts, so a schema change
 * that would break the harness fails a unit test first.
 */

export function flatIntelligencePackage() {
  return {
    founderDNA: FIXTURE_INTELLIGENCE_PACKAGE.founderDNA,
    opportunities: FIXTURE_INTELLIGENCE_PACKAGE.opportunities.map((o, i) => ({
      opportunityIndex: i,
      ...o,
    })),
  };
}

/** `count` additional, distinct directions (Explore More). */
export function flatExplore(count: number, batch: number) {
  return {
    opportunities: Array.from({ length: count }, (_, i) => {
      const base =
        FIXTURE_INTELLIGENCE_PACKAGE.opportunities[
          i % FIXTURE_INTELLIGENCE_PACKAGE.opportunities.length
        ];
      return {
        opportunityIndex: i,
        ...base,
        title: `${base.title} — variation ${batch}.${i + 1}`,
        plainEnglishSummary: `${base.plainEnglishSummary} (explored direction ${batch}.${i + 1})`,
      };
    }),
  };
}

const PHASES = [
  { key: "understand", title: "Understand the problem", weeks: 2 },
  { key: "validate", title: "Validate demand", weeks: 3 },
  { key: "build", title: "Build the first version", weeks: 3 },
  { key: "launch", title: "Launch to first customers", weeks: 2 },
  { key: "improve", title: "Improve and repeat", weeks: 2 },
] as const;

export const SKELETON_WEEK_COUNT = PHASES.reduce((n, p) => n + p.weeks, 0);

export function roadmapSkeleton() {
  return {
    northStar: "Reach ten paying customers who would be upset if the service disappeared.",
    phases: PHASES.map((p) => ({
      key: p.key,
      title: p.title,
      description: `Get to the point where the ${p.key} work is finished and its evidence is recorded.`,
      weeks: Array.from({ length: p.weeks }, (_, i) => ({
        weekNumber: i + 1,
        title: `${p.title}: week ${i + 1}`,
        objective: `Finish the key ${p.key} work for week ${i + 1} and record what you learn.`,
      })),
    })),
  };
}

export function weekDetail(opts: {
  title: string;
  first: boolean;
  priorTitle?: string | null;
  outcome?: string | null;
}) {
  const adaptation = opts.first
    ? null
    : `Because "${opts.priorTitle ?? "last week"}" went ${opts.outcome ?? "differently than planned"}, this week leans on what you recorded.`;
  return {
    mission: `Complete the work for ${opts.title}`,
    tasks: [
      {
        what: "Write your interview script",
        why: "A fixed script keeps every conversation comparable.",
        how: "Write eight open questions about how the customer handles this problem today.",
        steps: ["List eight questions", "Remove any leading question", "Do not pitch yet"],
        resource: null,
        timeEstimate: "~2 hrs",
        deadlineDaysFromStart: 1,
        doneWhen: "You have a script of eight neutral questions.",
        required: true,
        evidenceRequired: false,
        assumptionCategory: "problem",
        dependsOn: null,
      },
      {
        what: "Talk to eight target customers",
        why: "Real conversations are the only evidence that counts.",
        how: "Message people who fit the customer description and book short calls.",
        steps: [
          "Find eight matching people",
          "Ask the same core questions",
          "Take notes on their exact words",
        ],
        resource: "A phone or video call",
        timeEstimate: "~5 hrs",
        deadlineDaysFromStart: 4,
        doneWhen: "Eight conversations are done and noted.",
        required: true,
        evidenceRequired: true,
        assumptionCategory: "problem",
        dependsOn: "Write your interview script",
      },
      {
        what: "Summarise what repeated",
        why: "Patterns across people matter more than any one answer.",
        how: "Group the answers and count how many people said the same thing.",
        steps: ["Group the notes", "Count repeats"],
        resource: null,
        timeEstimate: "~1 hr",
        deadlineDaysFromStart: 6,
        doneWhen: "You can state the most repeated pain and how many people named it.",
        required: false,
        evidenceRequired: false,
        assumptionCategory: null,
        dependsOn: "Talk to eight target customers",
      },
    ],
    mistakesToAvoid: [
      "Pitching your idea instead of listening to how they cope today",
      "Only talking to friends who want to be kind",
    ],
    evidenceRequired: "Notes from eight real customer conversations",
    successThreshold: "5 of 8 people independently describe the same pain",
    evidenceTarget: 8,
    adaptationNote: adaptation,
  };
}

export function proofAssumptions() {
  return {
    assumptions: [
      {
        title: "Independent clinics feel lost follow-up revenue strongly enough to want it fixed.",
        category: "problem",
        whyItMatters: "If nobody feels the pain, nothing else about the business matters.",
        nextTest: "Ask eight clinic owners how they handle follow-ups today.",
        successThreshold: 3,
      },
      {
        title: "Clinic owners already pay, or would pay, for a fix to follow-ups.",
        category: "willingness_to_pay",
        whyItMatters: "A real problem people will not pay to solve is not a business.",
        nextTest: "Ask five owners what they spend on follow-ups and what they would pay.",
        successThreshold: 3,
      },
      {
        title: "You can reach the first ten clinics without paid advertising.",
        category: "distribution",
        whyItMatters: "Without a cheap way to reach customers you cannot grow.",
        nextTest: "Send twenty direct messages and count the replies.",
        successThreshold: 3,
      },
    ],
  };
}

/** Deterministic stand-in for the evidence interpreter: reads the words the
 * founder typed and answers the way a cautious reader would. */
export function evidenceInterpretation(prompt: string) {
  const said = /What happened: ([\s\S]*?)\n\nWhich way/.exec(prompt)?.[1] ?? "";
  if (
    /(wouldn'?t pay|would not pay|not interested|no one|nobody (cares|wants)|never|too expensive|waste)/i.test(
      said,
    )
  ) {
    return {
      signal: "contradicts",
      reason: "They said they would not pay for this, which points against the assumption.",
    };
  }
  if (/(would pay|already pay|every week|struggle|lose|dropped|costs? (us|me)|paid)/i.test(said)) {
    return {
      signal: "supports",
      reason: "They describe the problem happening to them in their own words.",
    };
  }
  return {
    signal: "neutral",
    reason: "This is interest without a clear commitment either way, so it stays inconclusive.",
  };
}

export function mentorReply(question: string) {
  return {
    message: `Here is a direct answer to "${question.slice(0, 80)}": focus on the current mission first, and record what you learn as evidence.`,
    nextActions: ["Finish the current mission", "Record what you learned as evidence"],
    isRecommendation: true,
  };
}

export function marketClaims() {
  return {
    claims: [
      {
        claim: "Several small clinics discuss missed follow-ups in public forums.",
        label: "early_signal",
        sourceIndex: 0,
      },
      {
        claim: "Similar software exists, so expect competition.",
        label: "competitive",
        sourceIndex: 1,
      },
    ],
  };
}

export const GROUNDED_SOURCES = [
  { title: "Clinic owners discuss follow-ups", uri: "https://example.com/forum/follow-ups" },
  { title: "Practice software comparison", uri: "https://example.com/blog/software" },
];

/** A plainly fake "translation": readable proof the text went through the
 * translator, with every digit and Latin token of the original preserved. The
 * Devanagari filler scales with the text so the result still reads as Hindi to
 * the app's own language detector (which weighs Devanagari against Latin
 * letters), exactly as a real Hindi translation would. */
export function fakeHindi(text: string): string {
  const filler = "हिंदी ".repeat(Math.max(2, Math.ceil(text.length / 9)));
  return `${filler}❯ ${text}`;
}

/** Undoes fakeHindi — what the fake translator returns when asked for English. */
export function fakeEnglish(text: string): string {
  return text.replace(/^[^❯]*❯ /, "");
}
