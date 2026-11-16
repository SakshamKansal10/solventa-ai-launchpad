import { createServerFn } from "@tanstack/react-start";

import { getOptionalUser } from "@/lib/supabase/server";

/** The signed-in opening's two facts: the first name, and whether a roadmap exists (only then
 * "Your plan is waiting."). Null when nobody is signed in. */
export const getWelcomeInfo = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ firstName: string | null; hasRoadmap: boolean } | null> => {
    const { supabase, user } = await getOptionalUser();
    if (!user) return null;
    const [{ data: profile }, { count }] = await Promise.all([
      supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
      supabase
        .from("roadmaps")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .in("status", ["building", "active", "completed"]),
    ]);
    const firstName = profile?.full_name?.trim().split(/\s+/)[0] || null;
    return { firstName, hasRoadmap: (count ?? 0) > 0 };
  },
);
