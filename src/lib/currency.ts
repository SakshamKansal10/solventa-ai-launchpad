/** Parses free-form Indian currency input into a raw rupee number.
 * Understands plain digits, comma-grouped digits, and lakh/crore
 * shorthand (case-insensitive, with or without a space). Returns null
 * for anything it can't confidently parse. */
export function parseIndianCurrency(raw: string): number | null {
  const input = raw.trim().toLowerCase();
  if (!input) return null;

  const cleaned = input.replace(/[₹,\s]/g, (m) => (m === " " ? " " : ""));

  const croreMatch = cleaned.match(/^([0-9]*\.?[0-9]+)\s*(cr|crore|crores)$/);
  if (croreMatch) return Math.round(parseFloat(croreMatch[1]) * 1_00_00_000);

  const lakhMatch = cleaned.match(/^([0-9]*\.?[0-9]+)\s*(l|lac|lacs|lakh|lakhs)$/);
  if (lakhMatch) return Math.round(parseFloat(lakhMatch[1]) * 1_00_000);

  const plainMatch = cleaned.replace(/,/g, "").match(/^[0-9]*\.?[0-9]+$/);
  if (plainMatch) return Math.round(parseFloat(plainMatch[0]));

  return null;
}

/** Formats a raw rupee number using Indian digit grouping, e.g.
 * 2500000 -> "₹25,00,000". */
export function formatIndianCurrency(value: number): string {
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

/** A short human label for large amounts, e.g. 2500000 -> "25 Lakh",
 * 150000000 -> "15 Crore". Returns null below one lakh (no shorthand
 * needed at that scale). */
export function toIndianShorthand(value: number): string | null {
  if (value >= 1_00_00_000) {
    const crore = value / 1_00_00_000;
    return `${trimTrailingZero(crore)} Crore`;
  }
  if (value >= 1_00_000) {
    const lakh = value / 1_00_000;
    return `${trimTrailingZero(lakh)} Lakh`;
  }
  return null;
}

function trimTrailingZero(n: number): string {
  return n % 1 === 0 ? n.toString() : n.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}
