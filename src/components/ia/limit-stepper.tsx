import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

const STEP_BUTTON =
  "grid h-9 w-10 place-items-center rounded-button-sm bg-action-secondary-bg text-action-secondary-fg hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-selected disabled:bg-background-disabled disabled:text-text-disabled";

/** A count between two arrow buttons (Figma 6.8 and 7.7 "Üst sınır"). */
export function LimitStepper({
  value,
  decreaseLabel,
  increaseLabel,
  canDecrease,
  canIncrease,
  onDecrease,
  onIncrease,
}: {
  value: ReactNode;
  decreaseLabel: string;
  increaseLabel: string;
  canDecrease: boolean;
  canIncrease: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  return (
    <span className="flex items-center gap-3">
      <button
        type="button"
        aria-label={decreaseLabel}
        disabled={!canDecrease}
        onClick={onDecrease}
        className={STEP_BUTTON}
      >
        <ChevronLeft aria-hidden className="size-4" />
      </button>
      <span aria-live="polite" className="type-metric-sm text-text-primary">
        {value}
      </span>
      <button
        type="button"
        aria-label={increaseLabel}
        disabled={!canIncrease}
        onClick={onIncrease}
        className={STEP_BUTTON}
      >
        <ChevronRight aria-hidden className="size-4" />
      </button>
    </span>
  );
}
