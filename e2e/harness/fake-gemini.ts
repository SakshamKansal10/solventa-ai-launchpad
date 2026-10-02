import {
  GROUNDED_SOURCES,
  fakeEnglish,
  fakeHindi,
  flatExplore,
  flatIntelligencePackage,
  evidenceInterpretation,
  marketClaims,
  mentorReply,
  proofAssumptions,
  roadmapSkeleton,
  weekDetail,
} from "../../src/lib/ai/fixtures/e2e-gemini";

/**
 * A stand-in for the Gemini `generateContent` endpoint. It recognises which
 * call the app is making from the system instruction (every prompt module has
 * a distinctive one) and answers with schema-valid fixtures, so E2E tests
 * exercise the real prompt → parse → persist path without spending quota.
 *
 * Tests can also make it fail or stall (`configure`) to cover the honest
 * failure states, and read back exactly which calls were made (`calls`).
 */

export type Purpose =
  | "INITIAL_INTELLIGENCE"
  | "EXPLORE_MORE"
  | "SOL_MESSAGE"
  | "MARKET_EXTRACT"
  | "MARKET_GROUNDED"
  | "ROADMAP_SKELETON"
  | "WEEK_DETAIL"
  | "PROOF_ASSUMPTIONS"
  | "EVIDENCE_INTERPRETATION"
  | "CONTENT_TRANSLATION"
  | "UNKNOWN";

export interface GeminiCall {
  purpose: Purpose;
  at: number;
  hindi: boolean;
  weekTitle?: string;
}

export interface GeminiConfig {
  /** Make the next `count` calls of `purpose` (or every purpose with "*") fail. */
  failNext?: { purpose: Purpose | "*"; count: number; status?: number };
  /** Stall calls of `purpose` for `ms` before answering. */
  delayMs?: { purpose: Purpose | "*"; ms: number };
  clear?: boolean;
}

interface GenerateBody {
  systemInstruction?: { parts?: { text?: string }[] };
  contents?: unknown;
  tools?: unknown[];
  generationConfig?: { responseSchema?: unknown };
}

function textOf(contents: unknown): string {
  if (typeof contents === "string") return contents;
  const parts: string[] = [];
  const walk = (v: unknown) => {
    if (!v) return;
    if (Array.isArray(v)) v.forEach(walk);
    else if (typeof v === "object") {
      const o = v as Record<string, unknown>;
      if (typeof o.text === "string") parts.push(o.text);
      Object.values(o).forEach((x) => typeof x === "object" && walk(x));
    }
  };
  walk(contents);
  return parts.join("\n");
}

export function detectPurpose(system: string, prompt: string, grounded: boolean): Purpose {
  if (grounded) return "MARKET_GROUNDED";
  if (/professional business translator/i.test(system)) return "CONTENT_TRANSLATION";
  if (/validation planner/i.test(system)) return "PROOF_ASSUMPTIONS";
  if (/evidence interpreter/i.test(system)) return "EVIDENCE_INTERPRETATION";
  if (/design the long-term SHAPE/i.test(system)) return "ROADMAP_SKELETON";
  if (/REAL detail for exactly ONE week/i.test(system)) return "WEEK_DETAIL";
  if (/business mentor/i.test(system)) return "SOL_MESSAGE";
  if (/extract honest market-evidence claims/i.test(system)) return "MARKET_EXTRACT";
  if (/Generate \d+ new, distinct business opportunity candidates/i.test(prompt))
    return "EXPLORE_MORE";
  if (/Solventia Intelligence/i.test(system)) return "INITIAL_INTELLIGENCE";
  return "UNKNOWN";
}

/** Fields that are enumerations or structure, not prose: never translated. */
const KEEP = new Set([
  "key",
  "category",
  "label",
  "difficulty",
  "minLevel",
  "riskLevel",
  "motivationAlignment",
  "assumptionCategory",
]);

function hindify(value: unknown, key = ""): unknown {
  if (typeof value === "string")
    return KEEP.has(key) || value.trim() === "" ? value : fakeHindi(value);
  if (Array.isArray(value)) return value.map((v) => hindify(v, key));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, hindify(v, k)]));
  }
  return value;
}

export class FakeGemini {
  readonly calls: GeminiCall[] = [];
  private failures: { purpose: Purpose | "*"; remaining: number; status: number }[] = [];
  private delays: { purpose: Purpose | "*"; ms: number }[] = [];
  private exploreBatch = 0;

  configure(cfg: GeminiConfig) {
    if (cfg.clear) {
      this.failures = [];
      this.delays = [];
    }
    if (cfg.failNext) {
      this.failures.push({
        purpose: cfg.failNext.purpose,
        remaining: cfg.failNext.count,
        status: cfg.failNext.status ?? 503,
      });
    }
    if (cfg.delayMs) this.delays.push(cfg.delayMs);
  }

  reset() {
    this.calls.length = 0;
    this.exploreBatch = 0;
    this.configure({ clear: true });
  }

  async handle(body: GenerateBody): Promise<{ status: number; json: unknown }> {
    const system = (body.systemInstruction?.parts ?? []).map((p) => p.text ?? "").join("\n");
    const prompt = textOf(body.contents);
    const grounded = Boolean(
      body.tools?.some((t) => t && typeof t === "object" && "googleSearch" in t),
    );
    const purpose = detectPurpose(system, prompt, grounded);
    const hindi = /LANGUAGE: Write/.test(prompt);
    const call: GeminiCall = { purpose, at: Date.now(), hindi };

    const weekTitle =
      /This week \(already shown to the founder before it unlocked\): "(.+?)" — /.exec(prompt)?.[1];
    if (weekTitle) call.weekTitle = weekTitle;
    this.calls.push(call);

    const delay = this.delays.find((d) => d.purpose === "*" || d.purpose === purpose);
    if (delay) await new Promise((r) => setTimeout(r, delay.ms));

    const failure = this.failures.find(
      (f) => f.remaining > 0 && (f.purpose === "*" || f.purpose === purpose),
    );
    if (failure) {
      failure.remaining -= 1;
      return {
        status: failure.status,
        json: {
          error: {
            code: failure.status,
            message: "The model is overloaded (test fake).",
            status: "UNAVAILABLE",
          },
        },
      };
    }

    const payload = this.payloadFor(purpose, prompt, hindi, system);
    if (payload === undefined) {
      return {
        status: 400,
        json: {
          error: {
            code: 400,
            message: "Fake Gemini does not recognise this call.",
            status: "INVALID_ARGUMENT",
          },
        },
      };
    }
    if (purpose === "MARKET_GROUNDED") {
      return {
        status: 200,
        json: {
          candidates: [
            {
              content: { role: "model", parts: [{ text: payload as string }] },
              finishReason: "STOP",
              groundingMetadata: { groundingChunks: GROUNDED_SOURCES.map((s) => ({ web: s })) },
            },
          ],
          usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 10, totalTokenCount: 20 },
        },
      };
    }
    return {
      status: 200,
      json: {
        candidates: [
          {
            content: { role: "model", parts: [{ text: JSON.stringify(payload) }] },
            finishReason: "STOP",
            index: 0,
          },
        ],
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 10, totalTokenCount: 20 },
      },
    };
  }

  private payloadFor(purpose: Purpose, prompt: string, hindi: boolean, system: string): unknown {
    const finish = (v: unknown) => (hindi ? hindify(v) : v);
    switch (purpose) {
      case "INITIAL_INTELLIGENCE":
        return finish(flatIntelligencePackage());
      case "EXPLORE_MORE": {
        const count = Number(/Generate (\d+) new/.exec(prompt)?.[1] ?? 1);
        this.exploreBatch += 1;
        return finish(flatExplore(count, this.exploreBatch));
      }
      case "ROADMAP_SKELETON":
        return finish(roadmapSkeleton());
      case "WEEK_DETAIL": {
        const title =
          /This week \(already shown to the founder before it unlocked\): "(.+?)" — /.exec(
            prompt,
          )?.[1] ?? "This week";
        const first = /This is Week 1/.test(prompt);
        const prior = /Previous week \("(.+?)"\)/.exec(prompt)?.[1] ?? null;
        const outcome = /Outcome the founder reported: (\w+)\./.exec(prompt)?.[1] ?? null;
        return finish(weekDetail({ title, first, priorTitle: prior, outcome }));
      }
      case "PROOF_ASSUMPTIONS":
        return finish(proofAssumptions());
      case "EVIDENCE_INTERPRETATION":
        return finish(evidenceInterpretation(prompt));
      case "SOL_MESSAGE": {
        const said = /Founder just said: "([\s\S]*?)"\n/.exec(prompt)?.[1] ?? "your question";
        return finish(mentorReply(said));
      }
      case "MARKET_GROUNDED":
        return "Several small clinics discuss missed follow-ups, and similar software already exists.";
      case "MARKET_EXTRACT":
        return marketClaims();
      case "CONTENT_TRANSLATION": {
        // The strings to translate are the JSON array after the last blank line.
        const start = prompt.lastIndexOf("\n\n[") + 2;
        const list = JSON.parse(prompt.slice(start)) as string[];
        const toEnglish = /into clear, natural English/i.test(system);
        return { translations: list.map((s) => (toEnglish ? fakeEnglish(s) : fakeHindi(s))) };
      }
      default:
        return undefined;
    }
  }
}
