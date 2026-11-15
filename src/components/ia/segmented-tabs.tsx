import Link from "next/link";

export type SegmentedTab = {
  id: string;
  label: string;
  href: string | null;
  active: boolean;
};

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
    <nav
      aria-label={label}
      className="flex w-fit gap-0.5 rounded-[14px] bg-background-subtle p-1"
    >
      {tabs.map((tab) => {
        const className = `flex h-9 items-center justify-center rounded-full px-4 type-label whitespace-nowrap ${
          tab.active
            ? "bg-background-surface text-text-accent shadow-raised"
            : "text-text-secondary"
        }`;
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
          </span>
        );
      })}
    </nav>
  );
}
