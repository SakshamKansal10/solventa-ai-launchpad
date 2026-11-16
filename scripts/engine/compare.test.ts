/**
 * The idea engine comparison (part 5, step 6): the old pipeline (one call) and the new one
 * (idea engine v2) on the ten test profiles, against the REAL model, scored by the same five
 * checks. Run with:  npm run engine:compare        (all ten)
 *                    ENGINE_COMPARE_ONLY=P07,P08 npm run engine:compare
 * Needs GEMINI_API_KEY (read from .env.local if not in the environment). Writes
 * docs/redesign/engine-compare.{md,json}. Costs real model calls: ~4 per profile.
 */
import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { TEST_PROFILES } from "./profiles";
import { scoreDirection, type DirectionScore } from "./score";

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
      if (!m || process.env[m[1]] !== undefined) continue;
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

interface Usage {
  calls: number;
  prompt: number;
  output: number;
  thoughts: number;
  total: number;
}

const usage: Usage = { calls: 0, prompt: 0, output: 0, thoughts: 0, total: 0 };
const info = console.info.bind(console);
console.info = (...args: unknown[]) => {
  if (args[0] === "GEMINI_CALL" && typeof args[1] === "string") {
    try {
      const c = JSON.parse(args[1]) as Record<string, number | boolean | null>;
      usage.calls += 1;
      usage.prompt += Number(c.promptTokenCount ?? 0);
      usage.output += Number(c.candidatesTokenCount ?? 0);
      usage.thoughts += Number(c.thoughtsTokenCount ?? 0);
      usage.total += Number(c.totalTokenCount ?? 0);
    } catch {
      /* not a usage line */
    }
    return;
  }
  info(...args);
};
const snapshot = (): Usage => ({ ...usage });
const diff = (a: Usage, b: Usage): Usage => ({
  calls: b.calls - a.calls,
  prompt: b.prompt - a.prompt,
  output: b.output - a.output,
  thoughts: b.thoughts - a.thoughts,
  total: b.total - a.total,
});

interface RunResult {
  ok: boolean;
  error?: string;
  ms: number;
  usage: Usage;
  directions: { title: string; score: DirectionScore; engine?: unknown }[];
  trace?: unknown;
}

describe("idea engine: old vs new on ten profiles (real model)", () => {
  it("runs, scores and writes the table", { timeout: 4 * 60 * 60 * 1000 }, async () => {
    loadEnv();
    expect(process.env.GEMINI_API_KEY, "GEMINI_API_KEY is needed").toBeTruthy();
    // Imported after the environment is loaded (env.server reads process.env lazily).
    const { normalizeProfile } = await import("@/lib/profile/normalize");
    const { computeFounderGenome } = await import("@/lib/profile/founder-genome");
    const { computeAmbitionCalibration } = await import("@/lib/profile/ambition");
    const { generateIntelligencePackage } = await import("@/lib/ai/prompts/intelligence-package");
    const { runEngineV2 } = await import("@/lib/engine/pipeline.server");

    const only = process.env.ENGINE_COMPARE_ONLY?.split(",").map((s) => s.trim());
    const profiles = TEST_PROFILES.filter((p) => !only || only.includes(p.id));
    const results: Record<string, { label: string; old: RunResult; next: RunResult }> = {};

    for (const p of profiles) {
      const profile = normalizeProfile(p.answers as Parameters<typeof normalizeProfile>[0]);
      const ambition = computeAmbitionCalibration(profile, computeFounderGenome(profile));

      let u0 = snapshot();
      let t0 = Date.now();
      let old: RunResult;
      try {
        const pkg = await generateIntelligencePackage(profile, ambition, "en");
        old = {
          ok: true,
          ms: Date.now() - t0,
          usage: diff(u0, snapshot()),
          directions: pkg.opportunities.map((o) => ({
            title: o.title,
            score: scoreDirection(profile, o, null),
            detail: o,
          })) as RunResult["directions"],
        };
      } catch (err) {
        old = {
          ok: false,
          error: String(err),
          ms: Date.now() - t0,
          usage: diff(u0, snapshot()),
          directions: [],
        };
      }

      u0 = snapshot();
      t0 = Date.now();
      let next: RunResult;
      try {
        const run = await runEngineV2(profile, "en");
        next = {
          ok: true,
          ms: Date.now() - t0,
          usage: diff(u0, snapshot()),
          directions: run.pkg.opportunities.map((o, i) => ({
            title: o.title,
            score: scoreDirection(profile, o, run.notes[i] ?? null),
            engine: run.notes[i],
            detail: o,
          })) as RunResult["directions"],
          trace: run.trace,
        };
      } catch (err) {
        next = {
          ok: false,
          error: String(err),
          ms: Date.now() - t0,
          usage: diff(u0, snapshot()),
          directions: [],
        };
      }
      results[p.id] = { label: p.label, old, next };
      info(
        `[engine-compare] ${p.id} old ${old.ok ? sum(old) : "FAILED"} in ${old.ms} ms · new ${next.ok ? sum(next) : "FAILED"} in ${next.ms} ms`,
      );
    }

    fs.mkdirSync("docs/redesign", { recursive: true });
    fs.writeFileSync(
      path.join("docs/redesign", "engine-compare.json"),
      JSON.stringify(
        { at: new Date().toISOString(), model: process.env.GEMINI_MODEL ?? "default", results },
        null,
        2,
      ),
    );
    fs.writeFileSync(path.join("docs/redesign", "engine-compare.md"), table(results));
  });
});

const CHECKS = ["place", "week", "money", "quoted", "labelled"] as const;

function sum(r: RunResult) {
  const got = r.directions.reduce((n, d) => n + d.score.total, 0);
  return `${got}/${r.directions.length * 5}`;
}

function pct(r: RunResult) {
  return r.directions.length
    ? Math.round(
        (r.directions.reduce((n, d) => n + d.score.total, 0) / (r.directions.length * 5)) * 100,
      )
    : 0;
}

function table(
  results: Record<string, { label: string; old: RunResult; next: RunResult }>,
): string {
  const rows = Object.entries(results);
  const lines = [
    "# Idea engine: old vs new (generated by `npm run engine:compare`)",
    "",
    `Run ${new Date().toISOString()} against the real model (${process.env.GEMINI_MODEL ?? "GEMINI_MODEL default"}). Five yes/no checks per direction (scripts/engine/score.ts): place, startable within a week, numbers add up, every fit reason quotes the profile, no unlabelled market facts.`,
    "",
    "| Profile | Old: score | Old: s | Old: tokens | New: score | New: s | New: tokens | New: directions | Dropped / fatal |",
    "|---|---|---|---|---|---|---|---|---|",
  ];
  for (const [id, { label, old, next }] of rows) {
    lines.push(
      `| ${id} ${label} | ${old.ok ? `${sum(old)} (${pct(old)}%)` : "failed"} | ${(old.ms / 1000).toFixed(0)} | ${old.usage.total} | ${next.ok ? `${sum(next)} (${pct(next)}%)` : "failed"} | ${(next.ms / 1000).toFixed(0)} | ${next.usage.total} | ${next.directions.length} | ${next.trace ? `${(next.trace as { dropped: unknown[] }).dropped.length} / ${(next.trace as { fatal: unknown[] }).fatal.length}` : "—"} |`,
    );
  }
  const all = (k: "old" | "next") => rows.flatMap(([, r]) => r[k].directions);
  const rate = (k: "old" | "next", c: (typeof CHECKS)[number]) => {
    const ds = all(k);
    return ds.length
      ? `${Math.round((ds.filter((d) => d.score[c]).length / ds.length) * 100)}%`
      : "—";
  };
  const avg = (k: "old" | "next", f: (r: RunResult) => number) => {
    const ok = rows.map(([, r]) => r[k]).filter((r) => r.ok);
    return ok.length ? Math.round(ok.reduce((n, r) => n + f(r), 0) / ok.length) : 0;
  };
  lines.push(
    "",
    "| Check (share of directions passing) | Old | New |",
    "|---|---|---|",
    ...CHECKS.map((c) => `| ${c} | ${rate("old", c)} | ${rate("next", c)} |`),
    `| **all five** | ${rate("old", "place") === "—" ? "—" : `${Math.round((all("old").filter((d) => d.score.total === 5).length / Math.max(1, all("old").length)) * 100)}%`} | ${Math.round((all("next").filter((d) => d.score.total === 5).length / Math.max(1, all("next").length)) * 100)}% |`,
    "",
    "| Per consultation (average) | Old | New |",
    "|---|---|---|",
    `| time (s) | ${(avg("old", (r) => r.ms) / 1000).toFixed(0)} | ${(avg("next", (r) => r.ms) / 1000).toFixed(0)} |`,
    `| model calls | ${avg("old", (r) => r.usage.calls)} | ${avg("next", (r) => r.usage.calls)} |`,
    `| tokens (prompt + output + thinking) | ${avg("old", (r) => r.usage.total)} | ${avg("next", (r) => r.usage.total)} |`,
    "",
    "Cost = tokens × the model's price on the owner's Google account (not stated here: the price list for this model is not in the project). Failed runs are counted in the table, not hidden.",
    "",
  );
  return lines.join("\n");
}
