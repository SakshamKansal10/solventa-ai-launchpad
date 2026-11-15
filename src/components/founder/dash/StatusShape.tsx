import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { AssumptionStatus } from "@/lib/proof/links";
import { cn } from "@/lib/utils";

/**
 * A proof status as a pill with a shape AND a word (never colour alone):
 *   Not checked yet  dashed ring
 *   Checking         half-filled circle
 *   Supported        check
 *   Not supported    cross
 *   Unclear          dash
 */
const TONE: Record<AssumptionStatus, string> = {
  not_tested: "border-sol-ink/25 text-sol-secondary",
  testing: "border-sol-cobalt/50 text-sol-cobalt-deep",
  supported: "border-sol-champagne bg-sol-champagne-soft text-sol-ink",
  contradicted: "dash-warn-text border-sol-warning/50 bg-sol-warning-soft",
  inconclusive: "border-sol-ink/25 text-sol-secondary",
};

function Shape({ status }: { status: AssumptionStatus }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 18 18",
    "aria-hidden": true,
    className: "shrink-0",
  } as const;
  switch (status) {
    case "not_tested":
      return (
        <svg {...common}>
          <circle
            cx="9"
            cy="9"
            r="7"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeDasharray="3 2.5"
          />
        </svg>
      );
    case "testing":
      return (
        <svg {...common}>
          <circle cx="9" cy="9" r="7" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M9 2a7 7 0 0 1 0 14z" fill="currentColor" />
        </svg>
      );
    case "supported":
      return (
        <svg {...common}>
          <path
            d="M3.5 9.5l3.5 3.5 7.5-8"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "contradicted":
      return (
        <svg {...common}>
          <path
            d="M4.5 4.5l9 9M13.5 4.5l-9 9"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path
            d="M4 9h10"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </svg>
      );
  }
}

export function StatusShape({
  status,
  className,
}: {
  status: AssumptionStatus;
  className?: string;
}) {
  const { t } = useLocale();
  return (
    <span
      data-testid={`status-${status}`}
      data-status={status}
      className={cn(
        "inline-flex min-h-[38px] items-center gap-2 rounded-full border px-4 text-[15px] font-semibold",
        TONE[status],
        className,
      )}
    >
      <Shape status={status} />
      {t(`v2.proof.status.${status}` as const)}
    </span>
  );
}
