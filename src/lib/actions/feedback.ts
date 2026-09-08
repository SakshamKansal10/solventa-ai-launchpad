import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireUser } from "@/lib/supabase/server";

export const submitFeedback = createServerFn({ method: "POST" })
  .validator(z.object({ message: z.string().trim().min(1).max(4000) }))
  .handler(async ({ data }) => {
    const { supabase, user } = await requireUser();
    const { error } = await supabase
      .from("feedback_submissions")
      .insert({ user_id: user.id, message: data.message });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
