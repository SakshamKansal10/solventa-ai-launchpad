import { Clock, Target, Users, Wallet, Wrench, type LucideIcon } from "lucide-react";

import { FIT_FACTORS, type FitFactorKey } from "@/lib/fit/model";

/** The five founder-fit factors, in the order every screen shows them. */
export const FIT_ORDER: FitFactorKey[] = FIT_FACTORS.map((f) => f.key);

/** One meaning per icon: people to sell to, money and tools, know-how, hours, the goal. */
export const FIT_ICONS: Record<FitFactorKey, LucideIcon> = {
  access: Users,
  resources: Wallet,
  capability: Wrench,
  time: Clock,
  goals: Target,
};
