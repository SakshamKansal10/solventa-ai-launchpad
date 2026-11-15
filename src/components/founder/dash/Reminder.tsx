import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { ActionButton, QuietRow } from "@/components/founder/dash/ui";
import { Card } from "@/components/founder/ui";
import { Switch } from "@/components/ui/switch";
import {
  getReminderSettings,
  saveReminderSettings,
  type ReminderSettings,
} from "@/lib/actions/reminders";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { WEEKDAYS } from "@/lib/reminders/schedule";
import { cn } from "@/lib/utils";

const KEY = ["reminder-settings"] as const;
/** Monday, the default day offered. */
const DEFAULT_DAY = 1;

export function useReminderSettings() {
  return useQuery({ queryKey: KEY, queryFn: () => getReminderSettings(), staleTime: 30_000 });
}

function useSaveReminder(onSaved?: (s: { enabled: boolean }) => void) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (s: { enabled: boolean; weekday: number | null }) =>
      saveReminderSettings({ data: s }),
    onMutate: async (s) => {
      await queryClient.cancelQueries({ queryKey: KEY });
      const previous = queryClient.getQueryData<ReminderSettings>(KEY);
      queryClient.setQueryData<ReminderSettings>(KEY, (old) =>
        old
          ? {
              ...old,
              enabled: s.enabled,
              weekday: s.weekday,
              askedAt: old.askedAt ?? new Date().toISOString(),
            }
          : old,
      );
      return { previous };
    },
    onSuccess: (_r, s) => onSaved?.(s),
    onError: (err, _s, ctx) => {
      console.error("[reminder] save failed:", err);
      if (ctx?.previous) queryClient.setQueryData(KEY, ctx.previous);
      toast.error(t("v2.rem.error"));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

/** Weekday names in the reader's language, from the platform (no hand-typed list). */
function useWeekdayName() {
  const { locale } = useLocale();
  return (d: number) =>
    // 7 January 2024 was a Sunday.
    new Date(2024, 0, 7 + d).toLocaleDateString(locale === "hi" ? "hi-IN" : "en-IN", {
      weekday: "long",
    });
}

const selectCls =
  "min-h-12 rounded-2xl border border-sol-ink/20 bg-white px-4 text-[17px] text-sol-ink focus-visible:border-sol-cobalt focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sol-cobalt disabled:opacity-50";

function DaySelect({
  value,
  onChange,
  disabled,
  testId,
}: {
  value: number;
  onChange: (d: number) => void;
  disabled?: boolean;
  testId: string;
}) {
  const { t } = useLocale();
  const name = useWeekdayName();
  return (
    <select
      className={selectCls}
      value={value}
      disabled={disabled}
      aria-label={t("v2.rem.day")}
      onChange={(e) => onChange(Number(e.target.value))}
      data-testid={testId}
    >
      {WEEKDAYS.map((d) => (
        <option key={d} value={d}>
          {name(d)}
        </option>
      ))}
    </select>
  );
}

/** Settings → Weekly reminder: a switch and the day. Off by default. */
export function ReminderSettingsSection({ className }: { className?: string }) {
  const { t } = useLocale();
  const settings = useReminderSettings();
  const save = useSaveReminder((s) =>
    toast.success(s.enabled ? t("v2.rem.saved") : t("v2.rem.off")),
  );
  const data = settings.data;
  if (!data?.available) return null;
  const day = data.weekday ?? DEFAULT_DAY;
  return (
    <Card
      className={cn("flex flex-col gap-4 p-[clamp(24px,2.8vw,40px)]", className)}
      aria-labelledby="reminder-h"
      data-testid="reminder-section"
    >
      <div>
        <h2 id="reminder-h" className="dash-statement">
          {t("v2.rem.title")}
        </h2>
        <p className="sol-support mt-1">{t("v2.rem.body")}</p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <label htmlFor="reminder-switch" className="text-[1.0625rem] text-sol-ink">
          {t("v2.rem.toggle")}
        </label>
        <Switch
          id="reminder-switch"
          checked={data.enabled}
          data-testid="reminder-switch"
          onCheckedChange={(enabled) => save.mutate({ enabled, weekday: day })}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[1.0625rem] text-sol-ink">{t("v2.rem.day")}</span>
        <DaySelect
          value={day}
          disabled={!data.enabled}
          onChange={(d) => save.mutate({ enabled: data.enabled, weekday: d })}
          testId="reminder-day"
        />
      </div>
    </Card>
  );
}

/** Asked once, after the roadmap is built: yes (with a day) or no. Either answer is final here;
 * Settings can change it later. */
export function ReminderAsk() {
  const { t } = useLocale();
  const settings = useReminderSettings();
  const [day, setDay] = useState(DEFAULT_DAY);
  const save = useSaveReminder((s) => {
    if (s.enabled) toast.success(t("v2.rem.saved"));
  });
  const data = settings.data;
  if (!data?.available || data.askedAt) return null;
  return (
    <QuietRow className="border-0 bg-sol-ivory" data-testid="reminder-ask">
      <span className="flex min-w-0 flex-[1_1_360px] flex-col gap-1">
        <span className="text-[20px] font-semibold leading-[1.4] text-sol-ink">
          {t("v2.rem.ask")}
        </span>
        <span className="text-[17px] text-sol-secondary">{t("v2.rem.askNote")}</span>
      </span>
      <span className="flex flex-wrap items-center gap-3">
        <DaySelect value={day} onChange={setDay} testId="reminder-ask-day" />
        <ActionButton
          tone="secondary"
          size="md"
          arrow={false}
          loading={save.isPending}
          onClick={() => save.mutate({ enabled: true, weekday: day })}
          data-testid="reminder-ask-yes"
        >
          {t("v2.rem.askYes")}
        </ActionButton>
        <button
          type="button"
          className="min-h-12 px-2 text-[17px] text-sol-secondary underline underline-offset-4 hover:text-sol-ink"
          onClick={() => save.mutate({ enabled: false, weekday: null })}
          data-testid="reminder-ask-no"
        >
          {t("v2.rem.askNo")}
        </button>
      </span>
    </QuietRow>
  );
}
