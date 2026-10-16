/** Deep links for founder notifications. Every notification opens the exact
 * screen its event happened on — never a generic homepage or bare dashboard. */
export const notificationLinks = {
  /** Pinned to THIS consultation, so a later consultation can't change what
   * the founder lands on. */
  ideasReady: (consultationId: string) => `/dashboard?consultation=${consultationId}`,
  /** Straight to a specific roadmap week. */
  roadmapWeek: (weekNumber: number) => `/dashboard/roadmap?week=${weekNumber}`,
  roadmapBuilding: (opportunityId: string) =>
    `/dashboard/roadmap/building?opportunityId=${opportunityId}`,
};

/** Old notifications stored a bare "/dashboard/roadmap". Upgrade those at read
 * time so they land on the right tab instead of whichever week is current by
 * accident. Anything else passes through untouched. */
export function resolveNotificationHref(
  link: string | null,
  type: "ideas_ready" | "roadmap_ready" | "week_unlocked" | "roadmap_build_failed",
): string {
  if (link && link.startsWith("/")) {
    if (link === "/dashboard/roadmap") return "/dashboard/roadmap";
    return link;
  }
  if (type === "ideas_ready") return "/dashboard";
  return "/dashboard/roadmap";
}
