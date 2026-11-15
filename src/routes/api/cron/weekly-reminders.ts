import { createFileRoute } from "@tanstack/react-router";

import { env } from "@/lib/env.server";
import { runWeeklyReminders } from "@/lib/reminders/send.server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin.server";

/**
 * Daily cron (vercel.json) for the one weekly reminder (redesign-v2 part 4, feature 8). Vercel
 * calls it with `Authorization: Bearer $CRON_SECRET`. Until the owner sets CRON_SECRET and
 * SUPABASE_SERVICE_ROLE_KEY it answers 503 and sends nothing.
 */
export const Route = createFileRoute("/api/cron/weekly-reminders")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const secret = env.CRON_SECRET;
        const admin = createSupabaseAdminClient();
        if (!secret || !admin) {
          return Response.json({ ok: false, reason: "not configured" }, { status: 503 });
        }
        if (request.headers.get("authorization") !== `Bearer ${secret}`) {
          return Response.json({ ok: false }, { status: 401 });
        }
        try {
          const result = await runWeeklyReminders(admin);
          return Response.json({ ok: true, ...result });
        } catch (err) {
          console.error("[cron] weekly reminders failed:", err);
          return Response.json({ ok: false }, { status: 500 });
        }
      },
    },
  },
});
