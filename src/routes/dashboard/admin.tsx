import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { DashError, DashPage, DashSkeleton, Label, MistCard } from "@/components/founder/dash/ui";
import { DROP_OFF_STEPS, getDropOff } from "@/lib/actions/admin";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export const Route = createFileRoute("/dashboard/admin")({
  component: AdminPage,
  head: () => ({
    meta: [{ title: "Drop-off | Solventia" }, { name: "robots", content: "noindex, nofollow" }],
  }),
});

/**
 * Drop-off numbers (part 4, feature 10) — private: only a profile marked admin by hand sees any
 * number; everyone else sees that the page is private. Not linked from the navigation.
 */
function AdminPage() {
  const { t, locale } = useLocale();
  const query = useQuery({ queryKey: ["admin-dropoff"], queryFn: () => getDropOff() });
  const fmt = (n: number) => n.toLocaleString(locale === "hi" ? "hi-IN" : "en-IN");

  if (query.isPending) return <DashSkeleton label={t("shell.skeleton.loading")} />;
  if (query.isError) return <DashError onRetry={() => void query.refetch()} />;
  const data = query.data;
  if (!data.allowed) {
    return (
      <DashPage data-testid="admin-private">
        <h1 className="dash-headline">{t("v2.admin.private")}</h1>
        <p className="dash-lead max-w-[32em]">{t("v2.admin.privateLead")}</p>
      </DashPage>
    );
  }

  const first = data.steps.consultation_finished || 1;
  return (
    <DashPage data-testid="admin-page">
      <h1 className="dash-headline">{t("v2.admin.title")}</h1>
      <p className="dash-lead max-w-[36em]">{t("v2.admin.lead")}</p>
      <ol className="flex flex-col gap-3">
        {DROP_OFF_STEPS.map((step, i) => {
          const n = data.steps[step];
          const prev = i === 0 ? n : data.steps[DROP_OFF_STEPS[i - 1]];
          const kept = prev > 0 ? Math.round((n / prev) * 100) : 0;
          return (
            <MistCard
              as="li"
              key={step}
              className="flex-row flex-wrap items-center justify-between gap-4"
              data-testid={`dropoff-${step}`}
            >
              <span className="flex min-w-0 flex-col gap-1">
                <span className="dash-statement !text-[clamp(20px,1.8vw,26px)]">
                  {t(`v2.admin.step.${step}` as const)}
                </span>
                {i > 0 && <span className="dash-meta">{t("v2.admin.kept", { p: kept })}</span>}
              </span>
              <span className="flex items-center gap-4">
                <span
                  className="h-3 w-[clamp(80px,16vw,220px)] overflow-hidden rounded-full bg-white"
                  aria-hidden="true"
                >
                  <span
                    className="block h-full rounded-full bg-sol-cobalt"
                    style={{ width: `${Math.round((n / first) * 100)}%` }}
                  />
                </span>
                <span
                  className="min-w-[3ch] text-right text-[28px] font-medium tabular-nums"
                  data-testid={`dropoff-${step}-n`}
                >
                  {fmt(n)}
                </span>
              </span>
            </MistCard>
          );
        })}
      </ol>
      <section className="flex flex-col gap-3">
        <Label>{t("v2.admin.stuck")}</Label>
        <ul className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr))]">
          {(["cant", "time", "wrong"] as const).map((r) => (
            <MistCard as="li" key={r} className="gap-2" data-testid={`stuck-${r}`}>
              <span className="dash-body text-sol-ink">{t(`v2.admin.reason.${r}` as const)}</span>
              <span className="text-[28px] font-medium tabular-nums">{fmt(data.stuck[r])}</span>
            </MistCard>
          ))}
        </ul>
      </section>
    </DashPage>
  );
}
