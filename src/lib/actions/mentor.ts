import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireUser } from "@/lib/supabase/server";
import type { NormalizedProfile } from "@/lib/profile/normalize";
import { generateMentorReply } from "@/lib/ai/prompts/mentor";

async function getOrCreateConversation(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  userId: string,
  opportunityId: string | null,
) {
  // SQL's `= NULL` never matches (not even NULL rows) — `.eq()` is only
  // correct for a real id; the unscoped mentor chat needs `.is()`.
  const baseQuery = supabase.from("mentor_conversations").select("id").eq("user_id", userId);
  const existing = await (
    opportunityId
      ? baseQuery.eq("opportunity_id", opportunityId)
      : baseQuery.is("opportunity_id", null)
  ).maybeSingle();
  if (existing.data) return existing.data.id as string;

  const created = await supabase
    .from("mentor_conversations")
    .insert({ user_id: userId, opportunity_id: opportunityId })
    .select("id")
    .single();
  if (created.error || !created.data)
    throw new Error(created.error?.message ?? "Failed to start conversation");
  return created.data.id as string;
}

export const sendMentorMessage = createServerFn({ method: "POST" })
  .validator(
    z.object({ opportunityId: z.string().uuid().nullable(), message: z.string().min(1).max(4000) }),
  )
  .handler(async ({ data }) => {
    const { supabase, user } = await requireUser();

    const conversationId = await getOrCreateConversation(supabase, user.id, data.opportunityId);

    const { data: history, error: historyError } = await supabase
      .from("mentor_messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(20);
    if (historyError) throw new Error(historyError.message);

    const dnaRow = await supabase
      .from("business_dna")
      .select("normalized_signals")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (dnaRow.error || !dnaRow.data)
      throw new Error("Complete the consultation before talking to Sol.");
    const profile = dnaRow.data.normalized_signals as unknown as NormalizedProfile;

    let opportunityTitle: string | null = null;
    let currentPhase: string | null = null;
    if (data.opportunityId) {
      const opp = await supabase
        .from("opportunities")
        .select("title")
        .eq("id", data.opportunityId)
        .single();
      opportunityTitle = opp.data?.title ?? null;

      const roadmap = await supabase
        .from("roadmaps")
        .select("id, roadmap_phases(title, order_index, roadmap_tasks(status))")
        .eq("opportunity_id", data.opportunityId)
        .eq("status", "active")
        .maybeSingle();
      const phases = (
        roadmap.data as unknown as {
          roadmap_phases: {
            title: string;
            order_index: number;
            roadmap_tasks: { status: string }[];
          }[];
        } | null
      )?.roadmap_phases;
      if (phases) {
        const active = [...phases]
          .sort((a, b) => a.order_index - b.order_index)
          .find((p) => p.roadmap_tasks.some((t) => t.status !== "done"));
        currentPhase = active?.title ?? null;
      }
    }

    const reply = await generateMentorReply(
      {
        profile,
        opportunityTitle,
        currentPhase,
        recentHistory: (history ?? []).map((m) => ({ role: m.role, content: m.content })),
      },
      data.message,
    );

    const { error: insertError } = await supabase.from("mentor_messages").insert([
      { conversation_id: conversationId, user_id: user.id, role: "user", content: data.message },
      {
        conversation_id: conversationId,
        user_id: user.id,
        role: "assistant",
        content: reply.message,
      },
    ]);
    if (insertError) throw new Error(insertError.message);

    return { conversationId, reply };
  });

export const getMentorConversation = createServerFn({ method: "GET" })
  .validator(z.object({ opportunityId: z.string().uuid().nullable() }))
  .handler(async ({ data }) => {
    const { supabase, user } = await requireUser();

    const baseQuery = supabase.from("mentor_conversations").select("id").eq("user_id", user.id);
    const conversation = await (
      data.opportunityId
        ? baseQuery.eq("opportunity_id", data.opportunityId)
        : baseQuery.is("opportunity_id", null)
    ).maybeSingle();
    if (!conversation.data) return { conversationId: null, messages: [] };

    const { data: messages, error } = await supabase
      .from("mentor_messages")
      .select("*")
      .eq("conversation_id", conversation.data.id)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    return { conversationId: conversation.data.id as string, messages: messages ?? [] };
  });
