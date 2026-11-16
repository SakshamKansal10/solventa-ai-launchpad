import { describe, expect, it } from "vitest";

import { keepWeekOneFree, needsMoneyRegistrationOrWebsite } from "./week-one";

describe("week 1 never needs money, registration or a website", () => {
  it("recognises each of the three, in English and Hindi", () => {
    for (const t of [
      "Buy a domain and set up a landing page",
      "Register for GST",
      "Run ads on Instagram",
      "Order stock from a wholesaler",
      "वेबसाइट बनाएं",
      "उद्यम रजिस्ट्रेशन करें",
    ])
      expect(needsMoneyRegistrationOrWebsite(t)).toBe(true);
    for (const t of [
      "List ten clinics that miss follow-ups",
      "Talk to five shop owners about how they order today",
      "Write the three questions you will ask",
    ])
      expect(needsMoneyRegistrationOrWebsite(t)).toBe(false);
  });

  it("drops such missions from week 1, but never leaves the week with fewer than two", () => {
    const tasks = [
      { what: "List ten clinics" },
      { what: "Talk to five owners" },
      { what: "Build a website for the service" },
    ];
    const out = keepWeekOneFree(tasks);
    expect(out.tasks.map((t) => t.what)).toEqual(["List ten clinics", "Talk to five owners"]);
    expect(out.removed).toHaveLength(1);
    const thin = keepWeekOneFree([{ what: "Register the company" }, { what: "Talk to owners" }]);
    expect(thin.tasks).toHaveLength(2);
    expect(thin.removed).toHaveLength(0);
  });
});
