import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

/**
 * The control is a 44×44 px tap target (go-live step 6: every tap target ≥ 44 px on phones);
 * the visible track inside it keeps its 36×20 size.
 */
const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "group peer inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
    ref={ref}
  >
    <span
      aria-hidden="true"
      className="inline-flex h-5 w-9 items-center rounded-full border-2 border-transparent shadow-sm transition-colors group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-background group-data-[state=checked]:bg-primary group-data-[state=unchecked]:bg-input"
    >
      <SwitchPrimitives.Thumb className="pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0" />
    </span>
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
