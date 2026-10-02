/**
 * Pure economics math — no AI, no fabricated numbers. Every value here is
 * computed directly from the founder's own entered assumptions (see
 * src/lib/actions/economics.ts); there is deliberately no model-generated
 * starting point, so nothing here can ever be a guess presented as fact.
 */

export interface EconomicsAssumptions {
  pricePerCustomer: number | null;
  directCostPerCustomer: number | null;
  fixedMonthlyCosts: number | null;
}

/** Monthly revenue at a given customer count: customers × price/customer. */
export function monthlyRevenue(customers: number, pricePerCustomer: number): number {
  return customers * pricePerCustomer;
}

/** Contribution per customer: price − direct variable cost. Null when either
 * input is missing — there is nothing honest to compute yet. */
export function contributionPerCustomer(a: EconomicsAssumptions): number | null {
  if (a.pricePerCustomer == null || a.directCostPerCustomer == null) return null;
  return a.pricePerCustomer - a.directCostPerCustomer;
}

/** Gross contribution at a given customer count: revenue − total direct
 * variable costs for that many customers. */
export function grossContribution(customers: number, a: EconomicsAssumptions): number | null {
  const perCustomer = contributionPerCustomer(a);
  if (perCustomer == null) return null;
  return customers * perCustomer;
}

/** Break-even customer count: fixed monthly costs ÷ contribution per
 * customer. Null when the inputs needed don't exist yet, or when
 * contribution per customer isn't positive (fixed costs can never be
 * recovered at that price/cost combination — not a divide-by-zero, a real
 * "this doesn't break even" signal the UI should say plainly). */
export function breakEvenCustomers(a: EconomicsAssumptions): number | null {
  const perCustomer = contributionPerCustomer(a);
  if (perCustomer == null || perCustomer <= 0 || a.fixedMonthlyCosts == null) return null;
  return Math.ceil(a.fixedMonthlyCosts / perCustomer);
}

/** Points for the revenue-sensitivity line chart (Section AT): customers on
 * X, monthly revenue on Y. Spans from 0 to a reasonable ceiling above the
 * break-even point (or a fixed default range when break-even isn't known
 * yet), so the chart always has a sensible domain instead of a guessed one. */
export function revenueSensitivityPoints(
  a: EconomicsAssumptions,
  steps = 10,
): { customers: number; revenue: number }[] {
  if (a.pricePerCustomer == null) return [];
  const breakEven = breakEvenCustomers(a);
  const ceiling = breakEven ? Math.max(breakEven * 2, 10) : 20;
  const step = Math.max(1, Math.round(ceiling / steps));
  const points: { customers: number; revenue: number }[] = [];
  for (let c = 0; c <= ceiling; c += step) {
    points.push({ customers: c, revenue: monthlyRevenue(c, a.pricePerCustomer) });
  }
  return points;
}
