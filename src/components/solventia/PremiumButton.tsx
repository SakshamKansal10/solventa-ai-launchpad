import type { ReactNode } from "react";
import { motion, type HTMLMotionProps } from "motion/react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const premiumButtonVariants = cva(
  "group relative inline-flex shrink-0 items-center justify-center gap-2.5 overflow-hidden font-semibold transition-[box-shadow,border-color,background-color] duration-[250ms] ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      tone: {
        solid:
          "bg-primary text-primary-foreground shadow-[0_10px_30px_-14px_oklch(0.245_0.055_268_/_0.65)] hover:shadow-[0_20px_42px_-12px_oklch(0.245_0.055_268_/_0.55)]",
        outline:
          "border border-border/70 bg-card/50 text-primary hover:border-primary/25 hover:bg-card",
        /** For use on dark navy (bg-primary) surfaces — e.g. the consultation
         * flow — where the "solid" tone's navy background would disappear
         * into the page. */
        gold: "bg-accent text-primary shadow-[0_10px_30px_-14px_oklch(0_0_0_/_0.5)] hover:shadow-[0_20px_42px_-12px_oklch(0_0_0_/_0.45)]",
      },
      shape: {
        pill: "rounded-full",
        rounded: "rounded-xl",
      },
      size: {
        sm: "px-6 py-3 text-[0.82rem]",
        lg: "px-8 py-5 text-[0.95rem]",
      },
    },
    defaultVariants: { tone: "solid", shape: "rounded", size: "lg" },
  },
);

type Variants = VariantProps<typeof premiumButtonVariants>;

type PremiumButtonProps = Variants & {
  className?: string;
  children: ReactNode;
} & (
    | ({ href: string } & Omit<HTMLMotionProps<"a">, "ref" | "href">)
    | ({ href?: undefined } & Omit<HTMLMotionProps<"button">, "ref">)
  );

/**
 * Shared premium CTA treatment used sitewide: 2px hover lift, growing soft
 * shadow, a faint warm gradient sheen, and a springy press compression.
 * Renders an <a> when `href` is given, otherwise a <button>.
 */
export function PremiumButton({
  className,
  tone,
  shape,
  size,
  href,
  children,
  ...props
}: PremiumButtonProps) {
  const sharedMotionProps = {
    whileHover: { y: -2 },
    whileTap: { scale: 0.97, y: 0 },
    transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const },
    className: cn(premiumButtonVariants({ tone, shape, size }), className),
  };

  const overlay = (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 rounded-[inherit] bg-gradient-to-b from-[oklch(0.97_0.03_95_/_0.35)] via-transparent to-transparent opacity-0 transition-opacity duration-[250ms] ease-out group-hover:opacity-100"
    />
  );

  if (href) {
    return (
      <motion.a href={href} {...sharedMotionProps} {...(props as HTMLMotionProps<"a">)}>
        {overlay}
        <span className="relative z-10 inline-flex items-center gap-2.5">{children}</span>
      </motion.a>
    );
  }

  return (
    <motion.button {...sharedMotionProps} {...(props as HTMLMotionProps<"button">)}>
      {overlay}
      <span className="relative z-10 inline-flex items-center gap-2.5">{children}</span>
    </motion.button>
  );
}
