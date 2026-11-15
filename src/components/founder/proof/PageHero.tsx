import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** A page's headline area in the v2 scale: the headline carries the hierarchy through size,
 * not a coloured box (History, Settings). */
export function PageHero({
  title,
  subtitle,
  action,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-wrap items-end justify-between gap-6 pb-2", className)}>
      <div className="flex min-w-0 flex-[1_1_28rem] flex-col gap-[18px]">
        <h1 className="dash-headline">{title}</h1>
        {subtitle && <p className="dash-lead max-w-[34em]">{subtitle}</p>}
        {action && <div className="pt-2">{action}</div>}
      </div>
      {children && <div className="flex items-center gap-5">{children}</div>}
    </header>
  );
}
