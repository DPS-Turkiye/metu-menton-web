import Link from "next/link";

export type UnderlineTab = {
  id: string;
  label: string;
  href: string | null;
  count: number | null;
  active: boolean;
};

/**
 * The Figma "Tab" row: 44 px underline tabs with an optional count. A tab without a page yet stays visible but
 * disabled, with `disabledTitle` as its hint.
 */
export function UnderlineTabs({
  label,
  tabs,
  disabledTitle,
}: {
  label: string;
  tabs: readonly UnderlineTab[];
  disabledTitle: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="flex gap-1 overflow-x-auto border-b border-border-subtle"
    >
      {tabs.map((tab) => {
        const content = (
          <>
            <span className="flex h-11 items-center gap-2 px-2">
              {tab.label}
              {tab.count != null ? (
                <span className="rounded-full bg-background-selected px-2 py-0.5 type-label-sm text-text-accent">
                  {tab.count}
                </span>
              ) : null}
            </span>
            <span
              aria-hidden
              className={`h-0.5 w-full rounded-[1px] ${tab.active ? "bg-action-accent" : ""}`}
            />
          </>
        );
        const className = `flex shrink-0 flex-col items-center type-label ${
          tab.active ? "text-text-accent" : "text-text-secondary"
        }`;
        return tab.href ? (
          <Link
            key={tab.id}
            href={tab.href}
            role="tab"
            aria-selected={tab.active}
            className={className}
          >
            {content}
          </Link>
        ) : (
          <span
            key={tab.id}
            role="tab"
            aria-selected={false}
            aria-disabled="true"
            title={disabledTitle}
            className={`${className} cursor-not-allowed opacity-60`}
          >
            {content}
          </span>
        );
      })}
    </div>
  );
}
