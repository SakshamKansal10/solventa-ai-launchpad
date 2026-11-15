import { describe, expect, it } from "vitest";

import { indiaDay, isReminderDue, nextOpenMission } from "./schedule";

// Monday 17 November 2025, 03:30 UTC = 09:00 in India.
const MONDAY_MORNING = new Date("2025-11-17T03:30:00Z");

describe("one weekly reminder", () => {
  it("counts days in India time", () => {
    expect(indiaDay(MONDAY_MORNING)).toEqual({ date: "2025-11-17", weekday: 1 });
    // 20:00 UTC Sunday is already Monday 01:30 in India.
    expect(indiaDay(new Date("2025-11-16T20:00:00Z")).weekday).toBe(1);
  });

  it("is due only when on, on the chosen day, and not already sent that day", () => {
    const on = { enabled: true, weekday: 1, lastSentAt: null };
    expect(isReminderDue(on, MONDAY_MORNING)).toBe(true);
    expect(isReminderDue({ ...on, enabled: false }, MONDAY_MORNING)).toBe(false);
    expect(isReminderDue({ ...on, weekday: 2 }, MONDAY_MORNING)).toBe(false);
    expect(isReminderDue({ ...on, weekday: null }, MONDAY_MORNING)).toBe(false);
    expect(isReminderDue({ ...on, lastSentAt: "2025-11-17T03:00:00Z" }, MONDAY_MORNING)).toBe(
      false,
    );
    expect(isReminderDue({ ...on, lastSentAt: "2025-11-10T03:30:00Z" }, MONDAY_MORNING)).toBe(true);
  });

  it("points to the first open mission, in order", () => {
    const tasks = [
      { id: "b", status: "pending", order_index: 1 },
      { id: "a", status: "done", order_index: 0 },
      { id: "c", status: "in_progress", order_index: 2 },
    ];
    expect(nextOpenMission(tasks)?.id).toBe("b");
    expect(nextOpenMission([{ id: "a", status: "done", order_index: 0 }])).toBeNull();
  });
});
