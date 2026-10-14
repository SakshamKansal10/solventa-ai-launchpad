import { local } from "../../timeline/timeline";

/**
 * ILLUSTRATIVE founder profile — a fixed demonstration, never live analysis.
 * The same six signals enter the core (Context) and later re-propagate through
 * the opportunity universe (Computation), where they drive the scoring model.
 */
export const FOUNDER = {
  capitalInr: 50_000,
  skills: "Digital development",
  location: "India",
  hoursPerWeek: 12,
  experience: "Beginner",
  customerAccess: "Limited",
} as const;

export type SignalId = "capital" | "skills" | "location" | "time" | "experience" | "access";

export const SIGNALS: { id: SignalId; label: string; value: string }[] = [
  { id: "capital", label: "Capital", value: "₹50,000" },
  { id: "skills", label: "Skills", value: "Digital development" },
  { id: "location", label: "Location", value: "India" },
  { id: "time", label: "Time", value: "12 hours / week" },
  { id: "experience", label: "Experience", value: "Beginner" },
  { id: "access", label: "Customer access", value: "Limited" },
];

/**
 * Each signal's window inside the Context scene (local 0 → 1). Windows overlap a little: the next
 * instrument is already arriving as the previous one docks, but only one is ever being read.
 */
export function signalWindow(index: number): [number, number] {
  const start = 0.03 + index * 0.142;
  return [start, start + 0.25];
}

/** 0 → 1 travel of signal `index` toward the core (1 = docked). */
export function signalTravel(p: number, index: number): number {
  const [a, b] = signalWindow(index);
  const u = (local(p, "context") - a) / (b - a);
  return u < 0 ? 0 : u > 1 ? 1 : u;
}

export interface ContextResponse {
  capital: number;
  skills: number;
  location: number;
  time: number;
  experience: number;
  access: number;
  /** Transient flash as each signal docks (sum of short bells). */
  pulse: number;
}

/** How much of each signal the core has absorbed — persistent once docked. */
export function contextResponse(p: number): ContextResponse {
  const out: ContextResponse = {
    capital: 0,
    skills: 0,
    location: 0,
    time: 0,
    experience: 0,
    access: 0,
    pulse: 0,
  };
  SIGNALS.forEach((s, i) => {
    const t = signalTravel(p, i);
    const docked = t <= 0.8 ? 0 : (t - 0.8) / 0.2;
    out[s.id] = docked * docked * (3 - 2 * docked);
    const d = (t - 0.88) / 0.1;
    out.pulse += t > 0 && t < 1 ? Math.exp(-d * d) : 0;
  });
  return out;
}
