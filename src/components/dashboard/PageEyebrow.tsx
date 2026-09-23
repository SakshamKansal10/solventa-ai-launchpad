import { cn } from "@/lib/utils";

/** The small "SECTION · CONTEXT" label shown above a page's h1 (see the
 * roadmap page's "ROADMAP · WEEK 1 OF 4") — kept as one shared component
 * so every dashboard page's heading gets the same treatment instead of
 * each page hand-rolling its own uppercase-label markup. */
export function PageEyebrow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("text-[0.7rem] font-bold uppercase tracking-wide text-sol-muted", className)}>
      {children}
    </p>
  );
}
