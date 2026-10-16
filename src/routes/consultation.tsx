import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { z } from "zod";

import { ConsultationShell } from "@/components/consultation/ConsultationShell";
import { getLatestBusinessDna } from "@/lib/actions/profile";
import { ConsultationProvider } from "@/lib/consultation/store";
import { isLegacyAnswers, legacyToV2 } from "@/lib/consultation/migrate";
import type { ConsultationAnswers } from "@/lib/consultation/model";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export const Route = createFileRoute("/consultation")({
  validateSearch: z.object({
    // Set by Settings → Edit Founder Profile: pre-fills every question from
    // the founder's last completed consultation instead of starting blank.
    edit: z.boolean().optional(),
    // Set by the Google OAuth round trip: the founder finished every
    // question signed-out, so once the session exists we submit straight away.
    submit: z.number().optional(),
  }),
  component: ConsultationPage,
  head: () => ({
    meta: [{ title: "Your Consultation — Solventia" }, { name: "robots", content: "noindex" }],
  }),
});

function ConsultationPage() {
  const { edit, submit } = Route.useSearch();
  const { t } = useLocale();

  // Only fetched when editing — a fresh consultation never makes this request.
  const prior = useQuery({
    queryKey: ["latest-business-dna-for-edit"],
    queryFn: () => getLatestBusinessDna(),
    enabled: edit === true,
  });

  if (edit === true && prior.isLoading) {
    return (
      <div className="flex min-h-dvh w-full items-center justify-center bg-sol-pearl">
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col items-center gap-4 text-sol-secondary"
        >
          <Loader2 className="size-8 animate-spin text-sol-violet" aria-hidden="true" />
          <p className="text-[1.0625rem]">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  let initialAnswers: ConsultationAnswers | undefined;
  if (edit === true && prior.data?.onboarding_answers) {
    const raw = prior.data.onboarding_answers as unknown;
    initialAnswers = isLegacyAnswers(raw) ? legacyToV2(raw) : (raw as ConsultationAnswers);
  }

  return (
    <ConsultationProvider initialAnswers={initialAnswers}>
      <ConsultationShell editMode={edit === true} autoSubmit={submit === 1 && edit !== true} />
    </ConsultationProvider>
  );
}
