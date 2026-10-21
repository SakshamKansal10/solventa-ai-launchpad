import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** The shared premium page header: a white-to-pearl atmosphere panel with
 * the title, a short line, an optional action and optional facts underneath. No
 * decorative 3D object: the page's content is the visual. */
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
    <header className={cn("sol-atmosphere px-6 py-6 sm:px-9 sm:py-8", className)}>
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
        <div className="min-w-0 flex-1 basis-[18rem]">
          <h1 className="sol-page-title">{title}</h1>
          {subtitle && <p className="sol-body sol-prose mt-2 text-sol-secondary">{subtitle}</p>}
          {action && <div className="mt-5">{action}</div>}
        </div>
        {children && <div className="flex items-center gap-5">{children}</div>}
      </div>
    </header>
  );
}
