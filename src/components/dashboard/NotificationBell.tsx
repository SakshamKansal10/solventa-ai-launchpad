import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getNotifications, markAllNotificationsRead } from "@/lib/actions/notifications";

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.round(ms / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

/** The Founder Inbox — real product events only (ideas ready, roadmap
 * ready, a week unlocked), never a marketing nudge. Opening the dropdown
 * marks everything as read; every row is a real, traceable event
 * written by the server action that caused it (see notifications.ts). */
export function NotificationBell() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["founder-notifications"],
    queryFn: () => getNotifications(),
    refetchInterval: 60_000,
  });
  const unreadCount = query.data?.unreadCount ?? 0;
  const notifications = query.data?.notifications ?? [];

  async function handleOpenChange(open: boolean) {
    if (open && unreadCount > 0) {
      await markAllNotificationsRead();
      await queryClient.invalidateQueries({ queryKey: ["founder-notifications"] });
    }
  }

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex size-9 items-center justify-center rounded-full text-sol-ink transition-colors hover:bg-sol-violet-mist/60"
        >
          <Bell className="size-[18px]" aria-hidden="true" strokeWidth={1.75} />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex size-2 rounded-full bg-sol-champagne" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="border-b border-sol-border px-4 py-3">
          <p className="text-[0.85rem] font-semibold text-sol-ink">Notifications</p>
        </div>
        <div className="max-h-[360px] overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="px-4 py-6 text-center text-[0.85rem] text-sol-muted">
              Nothing yet — real updates about your ideas and roadmap will show up here.
            </p>
          ) : (
            notifications.map((n) => {
              const row = (
                <div
                  key={n.id}
                  className="border-b border-sol-border/60 px-4 py-3 last:border-b-0 hover:bg-sol-ivory"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[0.85rem] font-semibold text-sol-ink">{n.title}</p>
                    {!n.read_at && (
                      <span className="mt-1 size-1.5 shrink-0 rounded-full bg-sol-champagne" />
                    )}
                  </div>
                  <p className="mt-0.5 text-[0.8rem] leading-relaxed text-sol-secondary">
                    {n.body}
                  </p>
                  <p className="mt-1 text-[0.7rem] text-sol-muted">{timeAgo(n.created_at)}</p>
                </div>
              );
              return n.link ? (
                <Link key={n.id} to={n.link} className="block">
                  {row}
                </Link>
              ) : (
                row
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
