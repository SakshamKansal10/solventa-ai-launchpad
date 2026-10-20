import type { ReactNode } from "react";

import { Gem3D } from "@/components/founder/three/Gem3D";
import type { GemVariant } from "@/components/founder/three/GemCanvas";
import { cn } from "@/lib/utils";

/** The shared premium page header: a white-to-pearl atmosphere panel with
 * the title, a short line, an optional action, optional facts underneath and
 * (optionally) one small decorative 3D object. */
export function PageHero({
  title,
  subtitle,
  action,
  gem,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  gem?: GemVariant;
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
        {gem && <Gem3D variant={gem} className="hidden size-32 shrink-0 sm:block" />}
      </div>
    </header>
  );
}
