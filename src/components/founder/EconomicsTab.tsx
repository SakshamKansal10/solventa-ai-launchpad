import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button, Card, Pill, Skeleton } from "@/components/founder/ui";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import {
  getOpportunityEconomics,
  saveOpportunityEconomics,
  type EconomicsDTO,
} from "@/lib/actions/economics";
import {
  breakEvenCustomers,
  contributionPerCustomer,
  monthlyRevenue,
  revenueSensitivityPoints,
} from "@/lib/economics";
import { qk } from "@/lib/queries";

/** Every numeric field here is what the founder typed — never AI-generated
 * (spec: "do not present model-generated numbers as fact"). Derived figures
 * (contribution, break-even, the chart) are computed live from these raw
 * inputs on every render and are never persisted, so they can never drift
 * from the assumptions that produced them. */

function fmt(n: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${currency} ${n.toLocaleString()}`;
  }
}

type FormState = {
  revenueModel: string;
  currency: string;
  pricePerCustomer: string;
  directCostPerCustomer: string;
  customerAcquisitionNote: string;
  fixedMonthlyCosts: string;
  startingBudget: string;
};

function toForm(dto: EconomicsDTO): FormState {
  return {
    revenueModel: dto.revenueModel ?? "",
    currency: dto.currency,
    pricePerCustomer: dto.pricePerCustomer?.toString() ?? "",
    directCostPerCustomer: dto.directCostPerCustomer?.toString() ?? "",
    customerAcquisitionNote: dto.customerAcquisitionNote ?? "",
    fixedMonthlyCosts: dto.fixedMonthlyCosts?.toString() ?? "",
    startingBudget: dto.startingBudget?.toString() ?? "",
  };
}

function parseNum(s: string): number | null {
  if (s.trim() === "") return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

const inputClass =
  "min-h-11 w-full rounded-xl border border-sol-border bg-sol-surface px-3.5 text-[1rem] text-sol-ink outline-none transition-colors focus:border-sol-violet";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[0.875rem] font-semibold text-sol-secondary">{label}</span>
      {children}
    </label>
  );
}

function EconomicsForm({
  opportunityId,
  dto,
  onDone,
}: {
  opportunityId: string;
  dto: EconomicsDTO;
  onDone: () => void;
}) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(() => toForm(dto));

  const save = useMutation({
    mutationFn: () =>
      saveOpportunityEconomics({
        data: {
          opportunityId,
          revenueModel: form.revenueModel.trim() || null,
          currency: form.currency.trim() || "USD",
          pricePerCustomer: parseNum(form.pricePerCustomer),
          directCostPerCustomer: parseNum(form.directCostPerCustomer),
          customerAcquisitionNote: form.customerAcquisitionNote.trim() || null,
          fixedMonthlyCosts: parseNum(form.fixedMonthlyCosts),
          startingBudget: parseNum(form.startingBudget),
        },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: qk.opportunityEconomics(opportunityId) });
      toast.success(t("opp.econ.savedToast"));
      onDone();
    },
    onError: (err) => {
      console.error("[economics] save failed:", err);
      toast.error(t("opp.econ.saveError"));
    },
  });

  return (
    <Card className="flex flex-col gap-5 p-6 sm:p-8" data-testid="economics-form">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("opp.econ.revenueModel")}>
          <input
            data-testid="econ-revenue-model"
            className={inputClass}
            placeholder={t("opp.econ.revenueModelPlaceholder")}
            value={form.revenueModel}
            onChange={(e) => setForm((f) => ({ ...f, revenueModel: e.target.value }))}
          />
        </Field>
        <Field label={t("opp.econ.currency")}>
          <input
            data-testid="econ-currency"
            className={inputClass}
            value={form.currency}
            maxLength={8}
            onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))}
          />
        </Field>
        <Field label={t("opp.econ.pricePerCustomer")}>
          <input
            data-testid="econ-price"
            type="number"
            min={0}
            step="any"
            inputMode="decimal"
            className={inputClass}
            value={form.pricePerCustomer}
            onChange={(e) => setForm((f) => ({ ...f, pricePerCustomer: e.target.value }))}
          />
        </Field>
        <Field label={t("opp.econ.directCost")}>
          <input
            data-testid="econ-direct-cost"
            type="number"
            min={0}
            step="any"
            inputMode="decimal"
            className={inputClass}
            value={form.directCostPerCustomer}
            onChange={(e) => setForm((f) => ({ ...f, directCostPerCustomer: e.target.value }))}
          />
        </Field>
        <Field label={t("opp.econ.fixedCosts")}>
          <input
            data-testid="econ-fixed-costs"
            type="number"
            min={0}
            step="any"
            inputMode="decimal"
            className={inputClass}
            value={form.fixedMonthlyCosts}
            onChange={(e) => setForm((f) => ({ ...f, fixedMonthlyCosts: e.target.value }))}
          />
        </Field>
        <Field label={t("opp.econ.startingBudget")}>
          <input
            data-testid="econ-starting-budget"
            type="number"
            min={0}
            step="any"
            inputMode="decimal"
            className={inputClass}
            value={form.startingBudget}
            onChange={(e) => setForm((f) => ({ ...f, startingBudget: e.target.value }))}
          />
        </Field>
      </div>
      <Field label={t("opp.econ.acquisition")}>
        <textarea
          data-testid="econ-acquisition"
          className={`${inputClass} min-h-24 resize-y py-2.5`}
          placeholder={t("opp.econ.acquisitionPlaceholder")}
          value={form.customerAcquisitionNote}
          onChange={(e) => setForm((f) => ({ ...f, customerAcquisitionNote: e.target.value }))}
        />
      </Field>
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => save.mutate()} loading={save.isPending} data-testid="econ-save">
          {t("opp.econ.save")}
        </Button>
        <Button variant="secondary" onClick={onDone} disabled={save.isPending}>
          {t("opp.econ.cancel")}
        </Button>
      </div>
    </Card>
  );
}

function StatBlock({
  label,
  value,
  isAssumption,
}: {
  label: string;
  value: React.ReactNode;
  isAssumption?: boolean;
}) {
  const { t } = useLocale();
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <p className="text-[0.875rem] font-semibold text-sol-secondary">{label}</p>
        {isAssumption && <Pill tone="neutral">{t("opp.econ.assumptionBadge")}</Pill>}
      </div>
      <p className="text-[1.25rem] font-semibold leading-snug text-sol-ink">{value}</p>
    </div>
  );
}

function EconomicsDisplay({ dto, onEdit }: { dto: EconomicsDTO; onEdit: () => void }) {
  const { t } = useLocale();
  const assumptions = {
    pricePerCustomer: dto.pricePerCustomer,
    directCostPerCustomer: dto.directCostPerCustomer,
    fixedMonthlyCosts: dto.fixedMonthlyCosts,
  };
  const contribution = contributionPerCustomer(assumptions);
  const breakEven = breakEvenCustomers(assumptions);
  const points = revenueSensitivityPoints(assumptions);
  const currentCustomers =
    breakEven ?? (points.length > 0 ? points[points.length - 1].customers / 2 : 0);

  return (
    <div className="flex flex-col gap-6" data-testid="economics-display">
      <Card className="flex flex-col gap-6 p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="sol-h3">{dto.revenueModel || t("opp.econ.revenueModel")}</p>
          <Button variant="secondary" size="sm" onClick={onEdit} data-testid="econ-edit">
            {t("opp.econ.edit")}
          </Button>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {dto.pricePerCustomer != null && (
            <StatBlock
              label={t("opp.econ.pricePerCustomer")}
              value={fmt(dto.pricePerCustomer, dto.currency)}
              isAssumption
            />
          )}
          {dto.directCostPerCustomer != null && (
            <StatBlock
              label={t("opp.econ.directCost")}
              value={fmt(dto.directCostPerCustomer, dto.currency)}
              isAssumption
            />
          )}
          {dto.startingBudget != null && (
            <StatBlock
              label={t("opp.econ.startingBudget")}
              value={fmt(dto.startingBudget, dto.currency)}
              isAssumption
            />
          )}
          <StatBlock
            label={t("opp.econ.contribution")}
            value={
              contribution != null
                ? fmt(contribution, dto.currency)
                : t("opp.econ.contributionUnknown")
            }
            isAssumption={contribution != null}
          />
          <StatBlock
            label={t("opp.econ.breakEven")}
            value={
              dto.fixedMonthlyCosts == null
                ? t("opp.econ.breakEvenUnknown")
                : breakEven != null
                  ? t("opp.econ.breakEvenCustomers", { n: breakEven })
                  : t("opp.econ.breakEvenNever")
            }
            isAssumption={breakEven != null}
          />
        </div>
        {dto.customerAcquisitionNote && (
          <div>
            <p className="text-[0.875rem] font-semibold text-sol-secondary">
              {t("opp.econ.acquisition")}
            </p>
            <p className="mt-1 text-[1.0625rem] leading-relaxed text-sol-ink">
              {dto.customerAcquisitionNote}
            </p>
          </div>
        )}
      </Card>

      {/* Revenue sensitivity chart — only when there's a real price to plot
          (spec AT: never a decorative chart with nothing behind it). */}
      {points.length > 0 && (
        <Card className="flex flex-col gap-4 p-6 sm:p-8" data-testid="economics-chart">
          <p className="sol-h3">{t("opp.econ.chartTitle")}</p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                <CartesianGrid stroke="var(--sol-border)" vertical={false} />
                <XAxis
                  dataKey="customers"
                  tick={{ fontSize: 12, fill: "var(--sol-secondary)" }}
                  label={{
                    value: t("opp.econ.chartXAxis"),
                    position: "insideBottom",
                    offset: -4,
                    fontSize: 12,
                    fill: "var(--sol-secondary)",
                  }}
                  stroke="var(--sol-border-strong)"
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "var(--sol-secondary)" }}
                  width={70}
                  tickFormatter={(v: number) => fmt(v, dto.currency)}
                  stroke="var(--sol-border-strong)"
                />
                <Tooltip
                  formatter={(value: number) => fmt(value, dto.currency)}
                  labelFormatter={(customers: number) =>
                    `${customers} ${t("opp.econ.chartXAxis").toLowerCase()}`
                  }
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--sol-border)",
                    fontSize: 13,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--sol-violet)"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                {breakEven != null && dto.pricePerCustomer != null && (
                  <ReferenceDot
                    x={breakEven}
                    y={monthlyRevenue(breakEven, dto.pricePerCustomer)}
                    r={5}
                    fill="var(--sol-champagne)"
                    stroke="var(--sol-surface)"
                    strokeWidth={2}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
          {breakEven != null && (
            <p className="text-[0.875rem] text-sol-secondary">
              {t("opp.econ.chartCurrentPoint")}:{" "}
              {t("opp.econ.breakEvenCustomers", { n: breakEven })}
            </p>
          )}
        </Card>
      )}
      {/* currentCustomers is derived purely to keep the reference point honest
          if no break-even exists yet; not otherwise rendered. */}
      <span className="hidden" data-testid="econ-current-customers">
        {currentCustomers}
      </span>
    </div>
  );
}

export function EconomicsTab({ opportunityId }: { opportunityId: string }) {
  const { t } = useLocale();
  const [editing, setEditing] = useState(false);
  const query = useQuery({
    queryKey: qk.opportunityEconomics(opportunityId),
    queryFn: () => getOpportunityEconomics({ data: { opportunityId } }),
  });

  useEffect(() => {
    if (query.data && !query.data.exists) setEditing(false);
  }, [query.data]);

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-4" data-testid="economics-tab">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (query.isError || !query.data) {
    return (
      <Card className="p-6 text-sol-secondary" data-testid="economics-tab">
        {t("opp.econ.unavailable")}
      </Card>
    );
  }

  const dto = query.data;

  if (!dto.exists && !editing) {
    return (
      <Card className="flex flex-col items-start gap-3 p-8" data-testid="economics-tab">
        <p className="sol-h3">{t("opp.econ.empty.title")}</p>
        <p className="sol-body sol-prose text-sol-secondary">{t("opp.econ.empty.body")}</p>
        <Button className="mt-2" onClick={() => setEditing(true)} data-testid="econ-add">
          {t("opp.econ.add")}
        </Button>
      </Card>
    );
  }

  return (
    <div data-testid="economics-tab">
      {editing ? (
        <EconomicsForm opportunityId={opportunityId} dto={dto} onDone={() => setEditing(false)} />
      ) : (
        <EconomicsDisplay dto={dto} onEdit={() => setEditing(true)} />
      )}
    </div>
  );
}
