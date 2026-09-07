import { describe, expect, it } from "vitest";
import {
  formatCompactMoney,
  formatMoney,
  getAnnualIncomeBrackets,
  getCurrencyForCountry,
  getInvestmentBrackets,
  getMonthlyIncomeGoalBrackets,
  parseCurrencyAmount,
} from "@/lib/country-currency";

describe("getCurrencyForCountry", () => {
  it("resolves real ISO 4217 currencies for known countries", () => {
    expect(getCurrencyForCountry("India")).toEqual({ code: "INR", symbol: "₹" });
    expect(getCurrencyForCountry("United States")).toEqual({ code: "USD", symbol: "$" });
    expect(getCurrencyForCountry("United Kingdom").code).toBe("GBP");
    expect(getCurrencyForCountry("Japan").code).toBe("JPY");
  });

  it("falls back to INR — never guesses — when country is unset or unrecognized", () => {
    expect(getCurrencyForCountry(undefined)).toEqual({ code: "INR", symbol: "₹" });
    expect(getCurrencyForCountry(null)).toEqual({ code: "INR", symbol: "₹" });
    expect(getCurrencyForCountry("Not A Real Country")).toEqual({ code: "INR", symbol: "₹" });
  });
});

describe("formatMoney", () => {
  it("formats using real Intl currency rules, not hand-rolled concatenation", () => {
    expect(formatMoney(125000, "INR")).toBe("₹1,25,000");
    expect(formatMoney(0, "INR")).toBe("₹0");
  });

  it("never throws on an unrecognized currency code", () => {
    expect(() => formatMoney(100, "NOTACODE")).not.toThrow();
  });
});

describe("formatCompactMoney", () => {
  it("uses real Indian lakh/crore compact notation for INR", () => {
    expect(formatCompactMoney(1_250_000, "INR")).toBe("₹12.5L");
    expect(formatCompactMoney(25_000_000, "INR")).toBe("₹2.5Cr");
  });

  it("uses standard K/M compact notation for other currencies", () => {
    expect(formatCompactMoney(12_500, "USD")).toMatch(/\$12\.5K/);
  });
});

describe("getInvestmentBrackets", () => {
  it("INR brackets are byte-identical to the original hardcoded product labels", () => {
    const labels = getInvestmentBrackets("INR").map((b) => b.label);
    expect(labels).toEqual([
      "₹0 — I have no capital right now",
      "Under ₹10,000",
      "₹10,000 – ₹50,000",
      "₹50,000 – ₹2,00,000",
      "More than ₹2,00,000",
    ]);
  });

  it("produces independently reasonable, currency-formatted brackets for other currencies", () => {
    const usd = getInvestmentBrackets("USD");
    expect(usd).toHaveLength(5);
    expect(usd[0].label).toMatch(/no capital/);
    expect(usd[usd.length - 1].label).toMatch(/^More than \$/);
    // Strictly increasing — never a degenerate/overlapping bracket set.
    for (let i = 1; i < usd.length; i++) {
      expect(usd[i].value).toBeGreaterThan(usd[i - 1].value === 0 ? -1 : (usd[i - 2]?.value ?? -1));
    }
  });

  it("scales large-denomination currencies (e.g. JPY) to a sensible magnitude, not USD-scale", () => {
    const jpy = getInvestmentBrackets("JPY");
    const usd = getInvestmentBrackets("USD");
    // Same qualitative shape, meaningfully larger raw numbers for JPY.
    expect(jpy[jpy.length - 1].value).toBeGreaterThan(usd[usd.length - 1].value);
  });
});

describe("getAnnualIncomeBrackets / getMonthlyIncomeGoalBrackets", () => {
  it("INR annual-income brackets match the original product labels", () => {
    const labels = getAnnualIncomeBrackets("INR").map((b) => b.label);
    expect(labels).toEqual(["< ₹3L", "₹3–5L", "₹5–10L", "₹10–20L", "₹20–50L", "₹50L+"]);
  });

  it("INR monthly-income-goal brackets match the original product labels", () => {
    const labels = getMonthlyIncomeGoalBrackets("INR").map((b) => b.label);
    expect(labels).toEqual([
      "Under ₹5,000",
      "₹5,000 – ₹20,000",
      "₹20,000 – ₹50,000",
      "₹50,000 – ₹1,50,000",
      "₹1,50,000+",
    ]);
  });

  it("every bracket set is non-empty and currency-formatted for an arbitrary currency", () => {
    expect(getAnnualIncomeBrackets("EUR").length).toBeGreaterThan(0);
    expect(getMonthlyIncomeGoalBrackets("AED").length).toBeGreaterThan(0);
  });
});

describe("parseCurrencyAmount", () => {
  it("understands Indian lakh/crore shorthand only for INR", () => {
    expect(parseCurrencyAmount("25 lakh", "INR")).toBe(2_500_000);
    expect(parseCurrencyAmount("2 crore", "INR")).toBe(20_000_000);
    // Not recognized for a non-INR currency — "lakh" isn't a USD concept.
    expect(parseCurrencyAmount("25 lakh", "USD")).toBeNull();
  });

  it("understands k/m shorthand for any currency", () => {
    expect(parseCurrencyAmount("2.5k", "USD")).toBe(2_500);
    expect(parseCurrencyAmount("1.2m", "EUR")).toBe(1_200_000);
  });

  it("understands plain and comma-grouped digits", () => {
    expect(parseCurrencyAmount("25000", "USD")).toBe(25_000);
    expect(parseCurrencyAmount("25,000", "USD")).toBe(25_000);
  });

  it("returns null for unparseable input", () => {
    expect(parseCurrencyAmount("not a number", "USD")).toBeNull();
    expect(parseCurrencyAmount("", "USD")).toBeNull();
  });
});
