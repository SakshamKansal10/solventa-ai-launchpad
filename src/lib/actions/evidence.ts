import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireUser } from "@/lib/supabase/server";

export const EVIDENCE_CATEGORIES = [
  "problem",
  "customer",
  "demand",
  "price",
  "competition",
  "product",
  "channel",
  "economics",
] as const;

export const EVIDENCE_CATEGORY_LABELS: Record<(typeof EVIDENCE_CATEGORIES)[number], string> = {
  problem: "Problem",
  customer: "Customer",
  demand: "Demand",
  price: "Price",
  competition: "Competition",
  product: "Product",
  channel: "Channel",
  economics: "Economics",
};

const evidenceInputSchema = z.object({
  opportunityId: z.string().uuid(),
  category: z.enum(EVIDENCE_CATEGORIES),
  entryType: z.enum(["interview", "note", "observation"]).default("note"),
  content: z.string().min(1).max(2000),
  customerType: z.string().max(200).optional(),
  interviewDate: z.string().optional(),
  keyQuote: z.string().max(500).optional(),
  painSeverity: z.enum(["low", "medium", "high"]).optional(),
  existingWorkaround: z.string().max(500).optional(),
  willingnessToPay: z.enum(["no", "maybe", "yes"]).optional(),
});

/** Founder-submitted, never AI-generated — the Evidence Vault only ever
 * holds what a founder actually typed, organized by the real-world
 * question it speaks to (problem/customer/demand/price/etc.), tied to
 * one opportunity. */
export const addEvidence = createServerFn({ method: "POST" })
  .validator(evidenceInputSchema)
  .handler(async ({ data }) => {
    const { supabase, user } = await requireUser();

    // Ownership check — never trust a client-supplied opportunityId
    // without confirming it's actually this founder's.
    const opp = await supabase
      .from("opportunities")
      .select("id")
      .eq("id", data.opportunityId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!opp.data) throw new Error("Opportunity not found");

    const { error } = await supabase.from("founder_evidence").insert({
      user_id: user.id,
      opportunity_id: data.opportunityId,
      category: data.category,
      entry_type: data.entryType,
      content: data.content,
      customer_type: data.customerType ?? null,
      interview_date: data.interviewDate ?? null,
      key_quote: data.keyQuote ?? null,
      pain_severity: data.painSeverity ?? null,
      existing_workaround: data.existingWorkaround ?? null,
      willingness_to_pay: data.willingnessToPay ?? null,
    });
    if (error) throw new Error(error.message);

    return { ok: true };
  });

export interface EvidenceEntry {
  id: string;
  category: (typeof EVIDENCE_CATEGORIES)[number];
  entryType: "interview" | "note" | "observation";
  content: string;
  customerType: string | null;
  interviewDate: string | null;
  keyQuote: string | null;
  painSeverity: "low" | "medium" | "high" | null;
  existingWorkaround: string | null;
  willingnessToPay: "no" | "maybe" | "yes" | null;
  createdAt: string;
}

export const getEvidence = createServerFn({ method: "GET" })
  .validator(z.object({ opportunityId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { supabase, user } = await requireUser();

    const { data: rows, error } = await supabase
      .from("founder_evidence")
      .select("*")
      .eq("opportunity_id", data.opportunityId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const entries: EvidenceEntry[] = (rows ?? []).map((r) => ({
      id: r.id,
      category: r.category,
      entryType: r.entry_type,
      content: r.content,
      customerType: r.customer_type,
      interviewDate: r.interview_date,
      keyQuote: r.key_quote,
      painSeverity: r.pain_severity,
      existingWorkaround: r.existing_workaround,
      willingnessToPay: r.willingness_to_pay,
      createdAt: r.created_at,
    }));

    // A simple, deterministic (never AI-invented) summary — real counts
    // only. Interpreting these into a "confidence" claim needs more
    // evidence volume than most founders will have on day one; showing
    // honest counts now is better than a confidence score with nothing
    // behind it yet.
    const summary = {
      total: entries.length,
      interviews: entries.filter((e) => e.entryType === "interview").length,
      byCategory: Object.fromEntries(
        EVIDENCE_CATEGORIES.map((c) => [c, entries.filter((e) => e.category === c).length]),
      ) as Record<(typeof EVIDENCE_CATEGORIES)[number], number>,
      payingSignals: entries.filter((e) => e.willingnessToPay === "yes").length,
    };

    return { entries, summary };
  });

export const deleteEvidence = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { supabase, user } = await requireUser();
    const { error } = await supabase
      .from("founder_evidence")
      .delete()
      .eq("id", data.id)
      .eq("user_id", user.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
