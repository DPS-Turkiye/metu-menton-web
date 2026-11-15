import { StatusTone } from "@/components/ia/status-badge";

const DOT_CLASSES: Record<StatusTone, string> = {
  [StatusTone.Success]: "bg-status-success-icon",
  [StatusTone.Warning]: "bg-status-warning-icon",
  [StatusTone.Error]: "bg-status-error-icon",
  [StatusTone.Info]: "bg-status-info-icon",
  [StatusTone.Neutral]: "bg-status-neutral-icon",
};

/** A count on a tinted card with a status dot ("● Onay Bekliyor 86"). */
export function StatCard({
  tone,
  label,
  value,
}: {
  tone: StatusTone;
  label: string;
  value: number | string;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5 rounded-2xl bg-background-subtle p-[18px]">
      <p className="flex items-center gap-1.5 type-caption text-text-secondary">
        <span
          aria-hidden
          className={`size-1.5 rounded-full ${DOT_CLASSES[tone]}`}
        />
        {label}
      </p>
      <p className="type-metric text-text-primary">{value}</p>
    </div>
  );
}
