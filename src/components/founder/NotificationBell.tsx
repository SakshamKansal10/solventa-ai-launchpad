import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { Bell, Check } from "lucide-react";

import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/actions/notifications";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { resolveNotificationHref } from "@/lib/notification-links";
import { qk } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type Notification = Awaited<ReturnType<typeof getNotifications>>["notifications"][number];

function timeAgo(iso: string, locale: "en" | "hi"): string {
  const mins = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60_000));
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (mins < 60) return rtf.format(-mins, "minute");
  const hours = Math.round(mins / 60);
  if (hours < 24) return rtf.format(-hours, "hour");
  return rtf.format(-Math.round(hours / 24), "day");
}

/** Localised text from the stored params; falls back to the English text that
 * was stored with the row (older notifications, or a database without the
 * params column) so a notification is never blank. */
function useNotificationText() {
  const { td } = useLocale();
  return (n: Notification): { title: string; body: string } => {
    const p = (n.params ?? null) as Record<string, string | number> | null;
    if (!p) return { title: n.title, body: n.body };
    const key =
      n.type === "roadmap_ready" && p.reactivated ? "roadmap_reactivated" : (n.type as string);
    return {
      title: td(`notif.${key}.title`, p, n.title),
      body: td(`notif.${key}.body`, p, n.body),
    };
  };
}

/** The Founder Inbox: real product events only, each deep-linking to the exact
 * screen it is about. Panel width is capped at 360px so it never covers the
 * page's central controls. */
export function NotificationBell() {
  const { t, tp, locale } = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
  const text = useNotificationText();
  const [open, setOpen] = useState(false);

  const query = useQuery({
    queryKey: qk.notifications,
    queryFn: () => getNotifications(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: qk.notifications });
  const markOne = useMutation({
    mutationFn: (id: string) => markNotificationRead({ data: { id } }),
    onSuccess: invalidate,
  });
  const markAll = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: invalidate,
  });

  const unread = query.data?.unreadCount ?? 0;
  const items = query.data?.notifications ?? [];

  function openNotification(n: Notification) {
    if (!n.read_at) markOne.mutate(n.id);
    setOpen(false);
    router.history.push(resolveNotificationHref(n.link, n.type));
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={unread > 0 ? tp("notif.unread", unread) : t("notif.open")}
          data-testid="notification-bell"
          className="relative flex size-11 items-center justify-center rounded-full border border-sol-border bg-sol-surface text-sol-ink transition-colors hover:border-sol-violet/50"
        >
          <Bell className="size-5" aria-hidden="true" />
          {unread > 0 && (
            <span
              data-testid="notification-count"
              className="absolute -right-0.5 -top-0.5 flex min-w-5 items-center justify-center rounded-full bg-sol-violet px-1 text-[0.75rem] font-bold leading-5 text-white"
            >
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        data-testid="notification-panel"
        className="w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border-sol-border bg-sol-surface p-0"
      >
        <div className="flex items-center justify-between gap-2 border-b border-sol-border px-4 py-3">
          <h2 className="text-[1.0625rem] font-semibold text-sol-ink">{t("notif.title")}</h2>
          {unread > 0 && (
            <button
              type="button"
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending}
              data-testid="notification-mark-all"
              className="text-[0.9375rem] font-semibold text-sol-violet-deep underline-offset-4 hover:underline disabled:opacity-50"
            >
              {t("notif.markAllRead")}
            </button>
          )}
        </div>
        <div className="max-h-[min(420px,60vh)] overflow-y-auto">
          {query.isError ? (
            <p className="px-4 py-6 text-[1rem] text-sol-warning">{t("notif.loadError")}</p>
          ) : items.length === 0 ? (
            <p className="px-4 py-6 text-[1rem] leading-relaxed text-sol-secondary">
              {t("notif.empty")}
            </p>
          ) : (
            <ul>
              {items.map((n) => {
                const copy = text(n);
                return (
                  <li
                    key={n.id}
                    className={cn(
                      "flex items-stretch border-b border-sol-border last:border-0",
                      !n.read_at && "bg-sol-violet-soft/40",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => openNotification(n)}
                      data-testid="notification-item"
                      data-href={resolveNotificationHref(n.link, n.type)}
                      className="flex min-w-0 flex-1 gap-3 px-4 py-3.5 text-left transition-colors hover:bg-sol-ivory-light"
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "mt-2 size-2 shrink-0 rounded-full",
                          n.read_at ? "bg-transparent" : "bg-sol-violet",
                        )}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[1rem] font-semibold leading-snug text-sol-ink">
                          {copy.title}
                        </span>
                        <span className="mt-0.5 block text-[0.9375rem] leading-snug text-sol-secondary">
                          {copy.body}
                        </span>
                        <span className="mt-1 block text-[0.875rem] text-sol-secondary">
                          {timeAgo(n.created_at, locale)}
                        </span>
                      </span>
                    </button>
                    {!n.read_at && (
                      <button
                        type="button"
                        onClick={() => markOne.mutate(n.id)}
                        aria-label={t("notif.markRead")}
                        title={t("notif.markRead")}
                        data-testid="notification-mark-read"
                        className="flex w-11 shrink-0 items-center justify-center text-sol-secondary hover:bg-sol-ivory-light hover:text-sol-violet-deep"
                      >
                        <Check className="size-4" aria-hidden="true" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
