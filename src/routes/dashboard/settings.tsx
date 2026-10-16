import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { FounderProfileSection } from "@/components/founder/settings/FounderProfileSection";
import { PhotoSection } from "@/components/founder/settings/PhotoSection";
import {
  Button,
  Card,
  ErrorPanel,
  LinkButton,
  PageHeader,
  PageSkeleton,
} from "@/components/founder/ui";
import { Switch } from "@/components/ui/switch";
import { signOut } from "@/lib/actions/auth";
import {
  getSettingsData,
  updateNotificationPrefs,
  updateProfileName,
  type SettingsData,
} from "@/lib/actions/settings";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { Locale } from "@/lib/i18n";
import { qk } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/settings")({
  component: SettingsPage,
  head: () => ({
    meta: [{ title: "Settings — Solventia" }, { name: "robots", content: "noindex" }],
  }),
});

function SettingsPage() {
  const { t } = useLocale();
  const query = useQuery({
    queryKey: qk.settings,
    queryFn: () => getSettingsData(),
    staleTime: 15_000,
  });

  if (query.isPending) return <PageSkeleton label={t("shell.skeleton.loading")} />;
  if (query.isError || !query.data) {
    return (
      <ErrorPanel
        title={t("set.loadError")}
        onRetry={() => void query.refetch()}
        retrying={query.isFetching}
      />
    );
  }
  const data = query.data;

  return (
    <div className="flex max-w-[52rem] flex-col gap-8" data-testid="settings-page">
      <PageHeader title={t("set.title")} subtitle={t("set.subtitle")} />
      <ProfileSection data={data} />
      <PhotoSection available={data.extrasAvailable} />
      <FounderProfileSection data={data} />
      <LanguageSection />
      <NotificationSection data={data} />
      <AccountSection />
    </div>
  );
}

function ProfileSection({ data }: { data: SettingsData }) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [name, setName] = useState(data.fullName ?? "");
  useEffect(() => setName(data.fullName ?? ""), [data.fullName]);

  const save = useMutation({
    mutationFn: () => updateProfileName({ data: { fullName: name.trim() } }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: qk.settings }),
        queryClient.invalidateQueries({ queryKey: qk.currentUser }),
      ]);
      toast.success(t("set.profile.saved"));
    },
    onError: (err) => {
      console.error("[settings] name save failed:", err);
      toast.error(t("set.profile.error"));
    },
  });
  const dirty = name.trim() !== (data.fullName ?? "").trim();
  const valid = name.trim().length > 0 && name.trim().length <= 80;

  return (
    <Card
      className="flex flex-col gap-5 p-6 sm:p-7"
      aria-labelledby="profile-h"
      data-testid="profile-section"
    >
      <h2 id="profile-h" className="sol-h3">
        {t("set.profile.title")}
      </h2>
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (dirty && valid && !save.isPending) save.mutate();
        }}
      >
        <label className="flex max-w-md flex-col gap-1.5">
          <span className="text-[1rem] font-semibold text-sol-ink">{t("set.profile.name")}</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            autoComplete="name"
            data-testid="name-input"
            className="min-h-12 rounded-xl border border-sol-border-strong bg-sol-surface px-4 text-[1.0625rem] text-sol-ink"
          />
        </label>
        <div className="flex max-w-md flex-col gap-1.5">
          <span className="text-[1rem] font-semibold text-sol-ink">{t("set.profile.email")}</span>
          <p
            className="min-h-12 rounded-xl border border-sol-border bg-sol-ivory px-4 py-3 text-[1.0625rem] text-sol-secondary"
            data-testid="email-value"
          >
            {data.email ?? "—"}
          </p>
          <span className="sol-support">{t("set.profile.emailNote")}</span>
        </div>
        <Button
          type="submit"
          className="self-start"
          disabled={!dirty || !valid}
          loading={save.isPending}
          data-testid="save-name"
        >
          {save.isPending ? t("common.saving") : t("set.profile.save")}
        </Button>
      </form>
    </Card>
  );
}

function LanguageSection() {
  const { t, locale, setLocale } = useLocale();
  const options: { id: Locale; label: string }[] = [
    { id: "en", label: t("set.lang.en") },
    { id: "hi", label: t("set.lang.hi") },
  ];
  return (
    <Card
      className="flex flex-col gap-4 p-6 sm:p-7"
      aria-labelledby="lang-h"
      data-testid="language-section"
    >
      <div>
        <h2 id="lang-h" className="sol-h3">
          {t("set.lang.title")}
        </h2>
        <p className="sol-support mt-1 max-w-[60ch]">{t("set.lang.body")}</p>
      </div>
      <div role="radiogroup" aria-labelledby="lang-h" className="flex flex-wrap gap-3">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={locale === o.id}
            lang={o.id}
            data-testid={`lang-${o.id}`}
            onClick={() => locale !== o.id && setLocale(o.id)}
            className={cn(
              "min-h-12 min-w-32 rounded-2xl border px-6 text-[1.0625rem] font-semibold transition-colors duration-[180ms]",
              locale === o.id
                ? "border-sol-violet bg-sol-violet-soft text-sol-violet-deep"
                : "border-sol-border-strong bg-sol-surface text-sol-ink hover:border-sol-violet/50",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </Card>
  );
}

const PREF_KEYS = ["ideas_ready", "roadmap_ready", "week_unlocked"] as const;

function NotificationSection({ data }: { data: SettingsData }) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const save = useMutation({
    mutationFn: (prefs: SettingsData["notificationPrefs"]) =>
      updateNotificationPrefs({ data: prefs }),
    // Optimistic: the switch moves at once and rolls back if saving fails.
    onMutate: async (prefs) => {
      await queryClient.cancelQueries({ queryKey: qk.settings });
      const previous = queryClient.getQueryData<SettingsData>(qk.settings);
      queryClient.setQueryData<SettingsData>(qk.settings, (old) =>
        old ? { ...old, notificationPrefs: prefs } : old,
      );
      return { previous };
    },
    onSuccess: () => toast.success(t("set.notif.saved")),
    onError: (err, _prefs, ctx) => {
      console.error("[settings] notification prefs failed:", err);
      if (ctx?.previous) queryClient.setQueryData(qk.settings, ctx.previous);
      toast.error(t("set.notif.error"));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: qk.settings }),
  });

  return (
    <Card
      className="flex flex-col gap-4 p-6 sm:p-7"
      aria-labelledby="notif-h"
      data-testid="notification-section"
    >
      <div>
        <h2 id="notif-h" className="sol-h3">
          {t("set.notif.title")}
        </h2>
        <p className="sol-support mt-1">
          {data.extrasAvailable ? t("set.notif.body") : t("set.notif.unavailable")}
        </p>
      </div>
      <ul className="flex flex-col divide-y divide-sol-border">
        {PREF_KEYS.map((key) => (
          <li key={key} className="flex items-center justify-between gap-4 py-3.5">
            <label htmlFor={`pref-${key}`} className="text-[1.0625rem] text-sol-ink">
              {t(`set.notif.${key}` as const)}
            </label>
            <Switch
              id={`pref-${key}`}
              checked={data.notificationPrefs[key]}
              disabled={!data.extrasAvailable}
              data-testid={`pref-${key}`}
              onCheckedChange={(checked) =>
                save.mutate({ ...data.notificationPrefs, [key]: checked })
              }
            />
          </li>
        ))}
      </ul>
    </Card>
  );
}

function AccountSection() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const out = useMutation({
    mutationFn: () => signOut(),
    onSettled: () => {
      // Clearing the cache stops the next account on this tab from seeing the
      // previous one's data.
      queryClient.clear();
      void navigate({ to: "/" });
    },
  });
  return (
    <Card
      className="flex flex-col gap-5 p-6 sm:p-7"
      aria-labelledby="account-h"
      data-testid="account-section"
    >
      <h2 id="account-h" className="sol-h3">
        {t("set.account.title")}
      </h2>
      <div className="flex flex-wrap gap-3">
        <LinkButton to="/privacy" variant="secondary" size="sm">
          {t("set.account.privacy")}
        </LinkButton>
        <LinkButton to="/terms" variant="secondary" size="sm">
          {t("set.account.terms")}
        </LinkButton>
        <LinkButton to="/data-deletion" variant="secondary" size="sm">
          {t("set.account.deletion")}
        </LinkButton>
      </div>
      <Button
        variant="danger"
        className="self-start"
        onClick={() => out.mutate()}
        loading={out.isPending}
        data-testid="sign-out"
      >
        {out.isPending ? t("set.account.signingOut") : t("set.account.signOut")}
      </Button>
    </Card>
  );
}
