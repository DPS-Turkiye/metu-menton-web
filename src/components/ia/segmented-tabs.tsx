import Link from "next/link";

export type SegmentedTab = {
  id: string;
  label: string;
  href: string | null;
  active: boolean;
};

const TRACK = "flex w-fit gap-0.5 rounded-[14px] bg-background-subtle p-1";

function segmentClasses(active: boolean) {
  return `flex h-9 items-center justify-center rounded-full px-4 type-label whitespace-nowrap ${
    active
      ? "bg-background-surface text-text-accent shadow-raised"
      : "text-text-secondary"
  }`;
}

/** The Figma "Segmented Control" as page links ("Öğrenciler · 312 | Akran Mentorları · 38"). */
export function SegmentedTabs({
  label,
  tabs,
  disabledTitle,
}: {
  label: string;
  tabs: readonly SegmentedTab[];
  disabledTitle: string;
}) {
  return (
    <nav aria-label={label} className={TRACK}>
      {tabs.map((tab) => {
        const className = segmentClasses(tab.active);
        return tab.href ? (
          <Link
            key={tab.id}
            href={tab.href}
            aria-current={tab.active ? "page" : undefined}
            className={className}
          >
            {tab.label}
          </Link>
        ) : (
          <span
            key={tab.id}
            aria-disabled="true"
            title={disabledTitle}
            className={`${className} cursor-not-allowed opacity-60`}
          >
            {tab.label}
            <span className="sr-only">{disabledTitle}</span>
          </span>
        );
      })}
    </nav>
  );
}

export type Segment<T extends string> = {
  id: T;
  label: string;
  active: boolean;
};

/** The same "Segmented Control" as a filter on the page itself ("Tümü 6 | Aktif 3 | Taslak 2"). */
export function SegmentedControl<T extends string>({
  label,
  segments,
  onSelect,
}: {
  label: string;
  segments: readonly Segment<T>[];
  onSelect: (id: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className={TRACK}>
      {segments.map((segment) => (
        <button
          key={segment.id}
          type="button"
          aria-pressed={segment.active}
          onClick={() => onSelect(segment.id)}
          className={segmentClasses(segment.active)}
        >
          {segment.label}
        </button>
      ))}
    </div>
  );
}
