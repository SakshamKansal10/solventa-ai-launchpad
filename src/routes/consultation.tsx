import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { ConsultationShell } from "@/components/consultation/ConsultationShell";
import { SolventiaLoadingState } from "@/components/dashboard/SolventiaLoadingState";
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
        <SolventiaLoadingState message={t("common.loading")} />
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
