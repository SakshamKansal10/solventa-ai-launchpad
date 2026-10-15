import { FOUNDER, type SignalId } from "../context/context-model";

/**
 * ILLUSTRATIVE, DETERMINISTIC scoring — a visual-logic demonstration for the
 * homepage, NOT Solventia's real analysis and not AI inference. Its only job
 * is to make the universe's reorganisation follow understandable rules.
 *
 * Each opportunity carries six attributes; each is turned into a 0 → 1 fit
 * against the fixed demonstration founder:
 *
 *   capital     ₹50,000 available          fit = min(1, 50k / required)^0.7
 *   skills      digital development        fit = share of the work that is digital
 *   location    India                      fit = relevance to the Indian market
 *   time        12 h / week                fit = min(1, 12 / hours needed)^0.8
 *   experience  beginner                   fit = 1 − 0.65 · difficulty
 *   access      limited customer access    fit = 1 − 0.75 · reliance on existing access
 *
 * The score is a WEIGHTED GEOMETRIC MEAN of the fits, so one severe conflict
 * (e.g. ₹8 lakh of capital against ₹50,000) drags the whole direction down —
 * which is how a founder would reason too. Weights sum to 1.
 */
export interface OpportunityAttributes {
  capitalInr: number;
  /** 0 → 1 share of the work that needs digital-development skills. */
  digital: number;
  /** 0 → 1 relevance to India. */
  india: number;
  hoursPerWeek: number;
  /** 0 → 1 reliance on existing customer access. */
  access: number;
  /** 0 → 1 execution difficulty. */
  difficulty: number;
}

export const WEIGHTS: Record<SignalId, number> = {
  capital: 0.22,
  skills: 0.22,
  location: 0.1,
  time: 0.16,
  experience: 0.14,
  access: 0.16,
};

/** Below this, a single fit counts as a CONFLICT (its connections retract). */
export const CONFLICT = 0.35;

export type Fits = Record<SignalId, number>;

export function fits(a: OpportunityAttributes): Fits {
  return {
    capital: Math.pow(Math.min(1, FOUNDER.capitalInr / a.capitalInr), 0.7),
    skills: a.digital,
    location: a.india,
    time: Math.pow(Math.min(1, FOUNDER.hoursPerWeek / a.hoursPerWeek), 0.8),
    experience: 1 - 0.65 * a.difficulty,
    access: 1 - 0.75 * a.access,
  };
}

/**
 * Score with only part of the context revealed: `revealed[k]` (0 → 1) says how
 * much of signal k the system knows. Unknown signals count as neutral (0.62),
 * so the visible change is always caused by a signal that has arrived.
 */
export function partialScore(f: Fits, revealed: Partial<Record<SignalId, number>>): number {
  let lnSum = 0;
  for (const key of Object.keys(WEIGHTS) as SignalId[]) {
    const r = revealed[key] ?? 1;
    const value = 0.62 + (Math.max(f[key], 0.04) - 0.62) * r;
    lnSum += WEIGHTS[key] * Math.log(value);
  }
  return Math.exp(lnSum);
}

export function score(f: Fits): number {
  return partialScore(f, {});
}

/** The weakest fit and whether it is a conflict. */
export function worstFit(f: Fits): { signal: SignalId; value: number; conflict: boolean } {
  let signal: SignalId = "capital";
  for (const key of Object.keys(f) as SignalId[]) if (f[key] < f[signal]) signal = key;
  return { signal, value: f[signal], conflict: f[signal] < CONFLICT };
}
