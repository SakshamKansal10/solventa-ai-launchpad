/**
 * One real roadmap build, measured: skeleton → Week 1 detail, exactly as "Build My Roadmap" runs
 * them, for a stored real opportunity (docs/redesign/engine-compare.json, P01's first direction).
 * Costs real money: runs only with ROADMAP_PROBE=1.
 *
 *   ROADMAP_PROBE=1 npx vitest run -c vitest.engine.config.ts scripts/engine/roadmap-probe.test.ts
 *
 * Every GEMINI_CALL line is printed in full (time, tokens, outcome) and written with the timings
 * to docs/redesign/perf/roadmap-probe-<label>.json.
 */
import fs from "node:fs";

import { describe, expect, it } from "vitest";

import { TEST_PROFILES } from "./profiles";

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

const calls: Record<string, unknown>[] = [];
const info = console.info.bind(console);
console.info = (...args: unknown[]) => {
  if (args[0] === "GEMINI_CALL" && typeof args[1] === "string") {
    try {
      calls.push(JSON.parse(args[1]) as Record<string, unknown>);
    } catch {
      /* not a usage line */
    }
  }
  info(...args);
};

describe.skipIf(process.env.ROADMAP_PROBE !== "1")("roadmap build on the real model", () => {
  it("skeleton, then week 1", async () => {
    loadEnv();
    expect(process.env.GEMINI_API_KEY, "GEMINI_API_KEY is needed").toBeTruthy();
    const { normalizeProfile } = await import("@/lib/profile/normalize");
    const { generateRoadmapSkeleton, generateWeekDetail } =
      await import("@/lib/ai/prompts/roadmap-generation");
    const stored = JSON.parse(fs.readFileSync("docs/redesign/engine-compare.json", "utf8")) as {
      results: Record<string, { old: { directions: { detail: unknown }[] } }>;
    };
    const p = TEST_PROFILES.find((x) => x.id === "P01")!;
    const profile = normalizeProfile(p.answers as Parameters<typeof normalizeProfile>[0]);
    const opportunity = stored.results.P01.old.directions[0].detail as Parameters<
      typeof generateRoadmapSkeleton
    >[1];

    const out: Record<string, unknown> = { at: new Date().toISOString() };
    let t = Date.now();
    const skeleton = await generateRoadmapSkeleton(profile, opportunity, "en");
    out.skeletonMs = Date.now() - t;
    out.skeletonWeeks = skeleton.phases.reduce((n, ph) => n + ph.weeks.length, 0);
    const ph = skeleton.phases[0];
    const wk = ph.weeks[0];
    t = Date.now();
    try {
      const detail = await generateWeekDetail(profile, opportunity, {
        phaseTitle: ph.title,
        phaseDescription: ph.description,
        weekTitle: wk.title,
        weekObjective: wk.objective,
        weekNumber: 1,
        founderFirstName: "Asha",
        priorWeek: null,
      });
      out.week1 = { ok: true, ms: Date.now() - t, missions: detail.tasks.length };
    } catch (err) {
      out.week1 = { ok: false, ms: Date.now() - t, error: String(err).slice(0, 2000) };
    }
    out.calls = calls;
    fs.writeFileSync(
      `docs/redesign/perf/roadmap-probe-${process.env.ROADMAP_PROBE_LABEL ?? "before"}.json`,
      JSON.stringify(out, null, 2),
    );
    console.log("ROADMAP_PROBE", JSON.stringify({ ...out, calls: undefined }));
  });
});
