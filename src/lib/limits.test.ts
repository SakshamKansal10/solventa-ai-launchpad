import { describe, expect, it } from "vitest";

import { dailyLimitError, parseDailyLimit, startOfIndianDay } from "./limits";

describe("daily limits", () => {
  it("a limit error survives the trip to the browser as its message", () => {
    const err = dailyLimitError("askSol", 30);
    expect(parseDailyLimit(err)).toEqual({ kind: "askSol", limit: 30 });
    // Server-function errors can arrive wrapped; the marker is still found.
    expect(parseDailyLimit(new Error(`Server error: ${err.message}`))).toEqual({
      kind: "askSol",
      limit: 30,
    });
    expect(parseDailyLimit(new Error("network down"))).toBeNull();
    expect(parseDailyLimit(undefined)).toBeNull();
  });

  it("the day resets at midnight India time", () => {
    // 2026-11-16 02:00 UTC = 07:30 IST → that IST day started 2026-11-15 18:30 UTC.
    expect(startOfIndianDay(new Date("2026-11-16T02:00:00Z"))).toBe("2026-11-15T18:30:00.000Z");
    // 2026-11-16 19:00 UTC = 00:30 IST on the 17th → a new day.
    expect(startOfIndianDay(new Date("2026-11-16T19:00:00Z"))).toBe("2026-11-16T18:30:00.000Z");
  });
});
