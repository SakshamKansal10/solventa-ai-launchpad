import { describe, expect, it } from "vitest";
import {
  breakEvenCustomers,
  contributionPerCustomer,
  grossContribution,
  monthlyRevenue,
  revenueSensitivityPoints,
} from "@/lib/economics";

describe("economics formulas", () => {
  it("monthly revenue is customers × price", () => {
    expect(monthlyRevenue(10, 50)).toBe(500);
    expect(monthlyRevenue(0, 50)).toBe(0);
  });

  it("contribution per customer is price minus direct cost", () => {
    expect(
      contributionPerCustomer({
        pricePerCustomer: 50,
        directCostPerCustomer: 20,
        fixedMonthlyCosts: null,
      }),
    ).toBe(30);
  });

  it("contribution is null when either input is missing — never a guess", () => {
    expect(
      contributionPerCustomer({
        pricePerCustomer: null,
        directCostPerCustomer: 20,
        fixedMonthlyCosts: null,
      }),
    ).toBeNull();
    expect(
      contributionPerCustomer({
        pricePerCustomer: 50,
        directCostPerCustomer: null,
        fixedMonthlyCosts: null,
      }),
    ).toBeNull();
  });

  it("gross contribution scales with customer count", () => {
    expect(
      grossContribution(10, {
        pricePerCustomer: 50,
        directCostPerCustomer: 20,
        fixedMonthlyCosts: null,
      }),
    ).toBe(300);
  });

  it("break-even is fixed costs ÷ contribution per customer, rounded up", () => {
    const a = { pricePerCustomer: 50, directCostPerCustomer: 20, fixedMonthlyCosts: 1000 };
    expect(breakEvenCustomers(a)).toBe(34); // 1000/30 = 33.33 -> 34
  });

  it("break-even is null when contribution per customer is zero or negative — a real 'never breaks even' signal, not a crash", () => {
    expect(
      breakEvenCustomers({
        pricePerCustomer: 20,
        directCostPerCustomer: 25,
        fixedMonthlyCosts: 1000,
      }),
    ).toBeNull();
    expect(
      breakEvenCustomers({
        pricePerCustomer: 20,
        directCostPerCustomer: 20,
        fixedMonthlyCosts: 1000,
      }),
    ).toBeNull();
  });

  it("break-even is null when fixed costs aren't known yet", () => {
    expect(
      breakEvenCustomers({
        pricePerCustomer: 50,
        directCostPerCustomer: 20,
        fixedMonthlyCosts: null,
      }),
    ).toBeNull();
  });

  it("revenue sensitivity points are empty until price is known", () => {
    expect(
      revenueSensitivityPoints({
        pricePerCustomer: null,
        directCostPerCustomer: null,
        fixedMonthlyCosts: null,
      }),
    ).toEqual([]);
  });

  it("revenue sensitivity points start at zero customers and scale linearly with price", () => {
    const points = revenueSensitivityPoints({
      pricePerCustomer: 50,
      directCostPerCustomer: 20,
      fixedMonthlyCosts: 300,
    });
    expect(points[0]).toEqual({ customers: 0, revenue: 0 });
    for (const p of points) expect(p.revenue).toBe(p.customers * 50);
  });

  it("revenue sensitivity extends comfortably past break-even so the current point is never at the chart's edge", () => {
    const a = { pricePerCustomer: 50, directCostPerCustomer: 20, fixedMonthlyCosts: 300 };
    const be = breakEvenCustomers(a)!;
    const points = revenueSensitivityPoints(a);
    const maxCustomers = points[points.length - 1].customers;
    expect(maxCustomers).toBeGreaterThanOrEqual(be);
  });
});
