import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireUser } from "@/lib/supabase/server";
import { getSchemaCapabilities } from "@/lib/schema-capabilities.server";
import type { NormalizedProfile } from "@/lib/profile/normalize";

/**
 * Economics is founder-entered, never AI-generated (spec: "do not present
 * model-generated numbers as fact") — these two server functions are a
 * plain read/write pair with no Gemini call anywhere in this file. Every
 * derived figure (revenue at N customers, contribution, break-even) is
 * computed client-side from whatever is saved here — see src/lib/economics.ts.
 */

export interface EconomicsDTO {
  exists: boolean;
  revenueModel: string | null;
  currency: string;
  pricePerCustomer: number | null;
  directCostPerCustomer: number | null;
  customerAcquisitionNote: string | null;
  fixedMonthlyCosts: number | null;
  startingBudget: number | null;
  updatedAt: string | null;
}

const EMPTY = (currency: string): EconomicsDTO => ({
  exists: false,
  revenueModel: null,
  currency,
  pricePerCustomer: null,
  directCostPerCustomer: null,
  customerAcquisitionNote: null,
  fixedMonthlyCosts: null,
  startingBudget: null,
  updatedAt: null,
});

export const getOpportunityEconomics = createServerFn({ method: "GET" })
  .validator(z.object({ opportunityId: z.string().uuid() }))
  .handler(async ({ data }): Promise<EconomicsDTO> => {
    const { supabase, user } = await requireUser();
    const caps = await getSchemaCapabilities(supabase);

    const { data: opp } = await supabase
      .from("opportunities")
      .select("business_dna_id")
      .eq("id", data.opportunityId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!opp) throw new Error("Opportunity not found");

    let fallbackCurrency = "USD";
    const { data: dna } = await supabase
      .from("business_dna")
      .select("normalized_signals")
      .eq("id", opp.business_dna_id)
      .maybeSingle();
    const profile = dna?.normalized_signals as unknown as NormalizedProfile | undefined;
    if (profile?.identity.currency) fallbackCurrency = profile.identity.currency;

    if (!caps.economics) return EMPTY(fallbackCurrency);

    const { data: row } = await supabase
      .from("opportunity_economics")
      .select("*")
      .eq("opportunity_id", data.opportunityId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!row) return EMPTY(fallbackCurrency);

    return {
      exists: true,
      revenueModel: row.revenue_model,
      currency: row.currency,
      pricePerCustomer: row.price_per_customer,
      directCostPerCustomer: row.direct_cost_per_customer,
      customerAcquisitionNote: row.customer_acquisition_note,
      fixedMonthlyCosts: row.fixed_monthly_costs,
      startingBudget: row.starting_budget,
      updatedAt: row.updated_at,
    };
  });

const saveSchema = z.object({
  opportunityId: z.string().uuid(),
  revenueModel: z.string().max(200).nullable(),
  currency: z.string().min(1).max(8),
  pricePerCustomer: z.number().min(0).nullable(),
  directCostPerCustomer: z.number().min(0).nullable(),
  customerAcquisitionNote: z.string().max(500).nullable(),
  fixedMonthlyCosts: z.number().min(0).nullable(),
  startingBudget: z.number().min(0).nullable(),
});

export const saveOpportunityEconomics = createServerFn({ method: "POST" })
  .validator(saveSchema)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { supabase, user } = await requireUser();
    const caps = await getSchemaCapabilities(supabase);
    if (!caps.economics) {
      throw new Error(
        "Economics isn't available on this database yet — migration 0011 hasn't been applied.",
      );
    }

    const { data: opp } = await supabase
      .from("opportunities")
      .select("id")
      .eq("id", data.opportunityId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!opp) throw new Error("Opportunity not found");

    const { error } = await supabase.from("opportunity_economics").upsert(
      {
        user_id: user.id,
        opportunity_id: data.opportunityId,
        revenue_model: data.revenueModel,
        currency: data.currency,
        price_per_customer: data.pricePerCustomer,
        direct_cost_per_customer: data.directCostPerCustomer,
        customer_acquisition_note: data.customerAcquisitionNote,
        fixed_monthly_costs: data.fixedMonthlyCosts,
        starting_budget: data.startingBudget,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "opportunity_id" },
    );
    if (error) throw new Error(error.message);

    return { ok: true };
  });
