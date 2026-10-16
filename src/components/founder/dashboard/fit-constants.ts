import { Lightbulb, Rocket, Users, Wallet, type LucideIcon } from "lucide-react";

import type { FitRowKey, FitStatus } from "@/lib/fit/matrix";

/** The four rows of Founder Fit, in the order every screen shows them. */
export const FIT_ORDER: FitRowKey[] = ["capability", "resources", "access", "ambition"];

export const FIT_ICONS: Record<FitRowKey, LucideIcon> = {
  capability: Lightbulb,
  resources: Wallet,
  access: Users,
  ambition: Rocket,
};

/** How many of the three pips are filled — fit is a level, never a number. */
export const FIT_PIPS: Record<FitStatus, number> = { strong: 3, moderate: 2, conditional: 1 };
