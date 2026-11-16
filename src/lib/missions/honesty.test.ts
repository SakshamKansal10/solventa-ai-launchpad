import { describe, expect, it } from "vitest";

import { looksTooNeat } from "./honesty";
import type { MissionEntry } from "./workspace";

const log = (answer: string, words: string, at: string): MissionEntry => ({
  id: at,
  kind: "interview",
  data: { answer, words },
  createdAt: at,
});

describe("logs that look too neat", () => {
  it("is quiet for fewer than three logs, or real, spread-out conversations", () => {
    expect(looksTooNeat([log("yes", "", "2026-11-10T10:00:00Z")])).toBe(false);
    expect(
      looksTooNeat([
        log("yes", "We lose two patients a week to missed calls", "2026-11-10T10:00:00Z"),
        log("no", "Our front desk calls everyone the day before", "2026-11-11T10:00:00Z"),
        log("yes", "Reminders are on paper and get lost", "2026-11-12T10:00:00Z"),
      ]),
    ).toBe(false);
  });

  it("notices identical answers with no detail, or four logs saved within minutes", () => {
    expect(
      looksTooNeat([
        log("yes", "", "2026-11-10T10:00:00Z"),
        log("yes", "ok", "2026-11-11T10:00:00Z"),
        log("yes", "", "2026-11-12T10:00:00Z"),
      ]),
    ).toBe(true);
    expect(
      looksTooNeat([
        log("yes", "Lost two patients last week", "2026-11-10T10:00:00Z"),
        log("no", "We call everyone the day before", "2026-11-10T10:02:00Z"),
        log("yes", "Paper reminders get lost", "2026-11-10T10:04:00Z"),
        log("yes", "Our receptionist forgets", "2026-11-10T10:05:00Z"),
      ]),
    ).toBe(true);
  });
});
