import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { FounderProfileSection } from "@/components/founder/settings/FounderProfileSection";
import { useDirection } from "@/components/os/direction";
import { FlashCard, OsDisplay, OsEyebrow, OsLead } from "@/components/os/os";
import { useFounderState } from "@/lib/queries";
import { PhotoSection } from "@/components/founder/settings/PhotoSection";
import { Button, Card, ErrorPanel, LinkButton, PageSkeleton } from "@/components/founder/ui";
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
    <div className="flex max-w-[60rem] flex-col gap-16" data-testid="settings-page">
      <div className="flex flex-col gap-6">
        <OsDisplay>
          {t("os.set.title.a")}
          <span className="block text-[#454B59]">{t("os.set.title.b")}</span>
        </OsDisplay>
        <OsLead>{t("os.set.lead")}</OsLead>
      </div>
      <FounderProfileSection data={data} />
      <GoalSection />
      <KnowsSection />
      <section className="flex flex-col gap-6" aria-labelledby="account-group-h">
        <h2
          id="account-group-h"
          className="font-os text-[clamp(1.5rem,1.15rem+1vw,2.1rem)] font-medium uppercase leading-[1.02] tracking-[-0.02em] text-[#171A27]"
        >
          {t("os.set.account")}
        </h2>
        {/* The account cards keep their forms; inside the OS they speak its typography. */}
        <div className="flex flex-col gap-6 [&_.sol-h3]:font-os [&_.sol-h3]:font-medium [&_.sol-h3]:uppercase [&_.sol-h3]:tracking-[-0.01em]">
          <ProfileSection data={data} />
          <PhotoSection available={data.extrasAvailable} />
          <LanguageSection />
          <NotificationSection data={data} />
          <AccountSection />
        </div>
      </section>
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

const GOALS = ["find", "validate", "launch", "first", "grow"] as const;
type Goal = (typeof GOALS)[number];
const GOAL_KEY = "solventia:current-goal";

/**
 * What the founder is trying to do right now. Kept on this device for now (no account field
 * exists for it yet); the Command Center reads it to order what it shows first.
 */
function GoalSection() {
  const { t } = useLocale();
  const [goal, setGoal] = useState<Goal | null>(null);
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(GOAL_KEY) as Goal | null;
      if (saved && GOALS.includes(saved)) setGoal(saved);
    } catch {
      /* storage unavailable */
    }
  }, []);
  const choose = (g: Goal) => {
    setGoal(g);
    try {
      window.localStorage.setItem(GOAL_KEY, g);
    } catch {
      /* the choice still applies for this visit */
    }
  };
  return (
    <section className="flex flex-col gap-5" aria-labelledby="goal-h" data-testid="goal-section">
      <h2
        id="goal-h"
        className="font-os text-[clamp(1.4rem,1.1rem+1vw,2rem)] font-medium uppercase tracking-[-0.02em] text-[#171A27]"
      >
        {t("os.set.goal")}
      </h2>
      <div role="radiogroup" aria-labelledby="goal-h" className="flex flex-wrap gap-2.5">
        {GOALS.map((g) => (
          <button
            key={g}
            type="button"
            role="radio"
            aria-checked={goal === g}
            onClick={() => choose(g)}
            data-testid={`goal-${g}`}
            className={cn(
              "min-h-12 rounded-full border px-5 text-[1rem] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2F62D9]",
              goal === g
                ? "border-[#171A27] bg-[#171A27] text-white"
                : "border-[#171A27]/15 text-[#171A27] hover:border-[#171A27]/40",
            )}
          >
            {t(`os.set.goal.${g}` as const)}
          </button>
        ))}
      </div>
      {goal && <p className="text-[0.9375rem] text-[#454B59]">{t("os.set.goal.saved")}</p>}
    </section>
  );
}

/** What Solventia has understood about the founder — its own reasons, in plain words. */
function KnowsSection() {
  const { t } = useLocale();
  const founder = useFounderState();
  const id = founder.data?.direction.selectedId ?? founder.data?.direction.flagshipId ?? null;
  const { direction } = useDirection(id ? founder.data?.briefs[id] : null);
  const facts = direction?.why ?? [];
  if (facts.length === 0) return null;
  return (
    <section className="flex flex-col gap-5" aria-labelledby="knows-h" data-testid="knows-section">
      <h2
        id="knows-h"
        className="font-os text-[clamp(1.4rem,1.1rem+1vw,2rem)] font-medium uppercase tracking-[-0.02em] text-[#171A27]"
      >
        {t("os.set.knows")}
      </h2>
      <div className="grid gap-3 @2xl:grid-cols-2">
        {facts.map((fact, i) => (
          <FlashCard
            key={fact}
            label={`${String(i + 1).padStart(2, "0")}`}
            headline={fact}
            points={[]}
            action={
              <a
                href="#founder-section"
                className="text-[1rem] font-semibold text-[#171A27] underline-offset-[6px] hover:underline"
              >
                {t("set.founder.edit")}
              </a>
            }
          />
        ))}
      </div>
    </section>
  );
}
