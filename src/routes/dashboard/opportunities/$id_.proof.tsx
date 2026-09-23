import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { PageEyebrow } from "@/components/dashboard/PageEyebrow";
import { SolventiaLoadingState } from "@/components/dashboard/SolventiaLoadingState";
import { EvidenceVault } from "@/components/dashboard/EvidenceVault";
import { requireAuthLoader } from "@/lib/route-guards";
import { getOpportunity } from "@/lib/actions/opportunities";
import { toDisplayDetail } from "@/lib/opportunity-display";
import type { OpportunityPackage, OpportunityDetail } from "@/lib/ai/schemas";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { translateDashboardText } from "@/lib/i18n/dashboard-dictionary";

export const Route = createFileRoute("/dashboard/opportunities/$id_/proof")({
  beforeLoad: requireAuthLoader,
  component: OpportunityProofPage,
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
});

function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((item) => (
        <li key={item} className="flex gap-2 text-[0.98rem] leading-relaxed text-sol-ink">
          <span className="mt-1.5 size-1 shrink-0 rounded-full bg-sol-champagne" />
          {item}
        </li>
      ))}
    </ul>
  );
}

function OpportunityProofPage() {
  const { id } = Route.useParams();
  const { locale } = useLocale();
  const tr = (s: string) => translateDashboardText(s, locale) ?? s;

  const query = useQuery({
    queryKey: ["opportunity", id, locale],
    queryFn: () => getOpportunity({ data: { id, locale } }),
  });

  if (query.isLoading) {
    return (
      <DashboardShell opportunityId={id}>
        <div className="flex min-h-[50vh] items-center justify-center">
          <SolventiaLoadingState message="Opening Proof…" />
        </div>
      </DashboardShell>
    );
  }

  if (!query.data) {
    return (
      <DashboardShell opportunityId={id}>
        <p className="text-muted-foreground">Couldn&rsquo;t load this opportunity.</p>
      </DashboardShell>
    );
  }

  const { opportunity, detail: detailJson, hasRoadmap } = query.data;
  const detail = toDisplayDetail(detailJson as unknown as OpportunityPackage | OpportunityDetail);
  const candidate = opportunity.candidate as unknown as OpportunityPackage;

  return (
    <DashboardShell opportunityId={id} opportunityTitle={candidate.title} hasRoadmap={hasRoadmap}>
      <PageEyebrow>
        {tr("Opportunity")} · {tr("Proof")}
      </PageEyebrow>
      <h1 className="font-display text-[clamp(1.9rem,3.4vw,2.5rem)] font-semibold leading-tight text-sol-ink">
        {tr("Proof & What Still Needs Validation")}
      </h1>
      <p className="mt-2.5 max-w-2xl text-[1.02rem] leading-relaxed text-sol-secondary">
        {opportunity.title}
      </p>

      <section className="mt-8">
        <div className="grid gap-5 sm:grid-cols-2">
          {detail.risks.length > 0 && (
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-sol-muted">
                {tr("Risks")}
              </p>
              <div className="mt-2">
                <BulletList items={detail.risks} />
              </div>
            </div>
          )}
          {detail.validationNeeded.length > 0 && (
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-sol-muted">
                {tr("Needs Validation")}
              </p>
              <div className="mt-2">
                <BulletList items={detail.validationNeeded} />
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 rounded-[18px] border border-sol-champagne/25 bg-sol-champagne-soft/40 p-6 sm:p-7">
          <p className="text-[0.78rem] font-semibold uppercase tracking-wide text-sol-champagne-deep">
            {tr("Your First Experiment")}
          </p>
          <p className="mt-2 text-[1rem] leading-relaxed text-sol-ink">{detail.firstExperiment}</p>
        </div>
      </section>

      <section className="mt-8 border-t border-sol-border pt-8">
        <EvidenceVault opportunityId={id} />
      </section>
    </DashboardShell>
  );
}
